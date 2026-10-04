"""WISP local API (FastAPI): REST + WebSocket for the web app, and the tool
endpoints the MCP server forwards WorkBuddy's calls to.

Run:  uv run uvicorn wisp.api.main:app --port 8787
"""

from __future__ import annotations

import asyncio
import hmac
import statistics
import uuid
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import Body, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError

from .. import config
from ..baseline.compare import summarise_baseline
from ..demo import seed as demo_seed
from ..schemas import FunctionalAssessment, utcnow
from ..sensing.hub import HUB, list_ports
from ..sensing.providers import ESP32CSIProvider, ReplayCSIProvider, build_provider
from ..service import CaseFacts, EventBus, ToolError, WispService
from ..store import Store
from ..triage.agent import LocalAgent

state: dict[str, Any] = {}


def svc() -> WispService:
    return state["svc"]


def agent() -> LocalAgent:
    return state["agent"]


def init_state(store: Store | None = None, provider=None) -> None:
    store = store or Store()
    if not store.list_profiles():
        if not (config.DEMO_DIR / "recordings.json").exists():
            demo_seed.generate_recordings()
        for p in demo_seed.PERSONAS:
            store.put_profile(p)
    provider = provider or build_provider()
    state["replay"] = provider if isinstance(provider, ReplayCSIProvider) else ReplayCSIProvider()
    service = WispService(store, provider, EventBus())
    state["svc"] = service
    state["agent"] = LocalAgent(service)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if "svc" not in state:
        init_state()
    svc().bus.loop = asyncio.get_running_loop()
    yield


app = FastAPI(title="WISP local API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ToolError)
async def tool_error_handler(_, exc: ToolError):
    status = 404 if exc.code == "invalid_session" else 409 if exc.code in ("order_violation", "sensing_locked", "invalid_state") else 400
    return JSONResponse(status_code=status, content={"error": exc.code, "message": str(exc)})


@app.exception_handler(ValidationError)
async def validation_error_handler(_, exc: ValidationError):
    return JSONResponse(status_code=400, content={"error": "invalid_input", "message": exc.errors(include_url=False, include_input=False)})


# --------------------------------------------------------------------------- core
@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "sensor": svc().provider.describe(), "llm_extraction": bool(config.LLM_BASE_URL and config.LLM_API_KEY)}


@app.get("/api/personas")
def personas() -> list[dict]:
    s = svc()
    out = []
    for p in s.store.list_profiles():
        b = s.store.get_baseline(p.user_id)
        out.append(
            {
                "user_id": p.user_id,
                "display_name": p.display_name,
                "age": p.age,
                "lives_alone": p.lives_alone,
                "baseline_sessions": len(b.sessions) if b else 0,
                "latest_session_id": s.store.latest_finished_session(p.user_id),
                "rechecks": [r for r in s.store.rechecks(p.user_id) if r["status"] == "scheduled"],
            }
        )
    return out


class StartSession(BaseModel):
    user_id: str = Field(max_length=40)
    agent: Literal["local_agent", "workbuddy"] = "local_agent"
    previous_session_id: str | None = None
    language: Literal["en", "zh", "ms", "ta"] = "en"
    text: str | None = Field(default=None, max_length=1000)  # the patient's first words, typed on the home screen


@app.post("/api/sessions")
def start_session(body: StartSession) -> dict:
    s = svc()
    case = s.start_session(body.user_id, agent=body.agent, previous_session_id=body.previous_session_id)
    if body.agent == "local_agent":
        first = (body.text or "").strip()
        agent().open(case.session_id, lang=body.language, greet=not first)
        if first:
            agent().handle(case.session_id, first)
    else:
        s.say(case.session_id, "system", "Waiting for WorkBuddy to join this assessment…", kind="info")
    return s.snapshot(case.session_id)


@app.post("/api/sessions/{session_id}/followup")
def followup(session_id: str, body: dict = Body(default={})) -> dict:
    """Start the scheduled re-check for a previous session ("simulate next day" in the demo)."""
    s = svc()
    prev = s.case(session_id)
    agent_kind = body.get("agent", "local_agent")
    lang = body.get("language", "en") if body.get("language") in ("en", "zh", "ms", "ta") else "en"
    case = s.start_session(prev.user_id, agent=agent_kind, previous_session_id=session_id)
    if agent_kind == "local_agent":
        agent().open(case.session_id, lang=lang)
    return s.snapshot(case.session_id)


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    return svc().snapshot(session_id)


class Message(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    value: str | None = Field(default=None, max_length=40)  # language-independent answer from a quick-reply button


@app.post("/api/sessions/{session_id}/messages")
def post_message(session_id: str, body: Message) -> dict:
    s = svc()
    meta = s.store.session_meta(session_id)
    if not meta:
        raise HTTPException(404, "Unknown session")
    if meta["agent"] != "local_agent":
        raise HTTPException(409, "This assessment is being run by WorkBuddy")
    agent().handle(session_id, body.text, body.value)
    return s.snapshot(session_id)


@app.post("/api/sessions/{session_id}/check/ready")
def check_ready(session_id: str) -> dict:
    svc().patient_ready(session_id)
    return {"ok": True}


@app.post("/api/sessions/{session_id}/check/stop")
async def check_stop(session_id: str) -> dict:
    await svc().patient_stop(session_id)
    return {"ok": True}


@app.get("/api/sessions/{session_id}/caregiver-summary")
def caregiver_summary(session_id: str) -> dict:
    return svc().caregiver_summary(session_id)


@app.post("/api/sessions/{session_id}/share")
def share(session_id: str, body: dict = Body(...)) -> dict:
    return svc().share_summary(session_id, "patient", consent=body.get("consent") is True)


@app.get("/api/history")
def history(user_id: str | None = None) -> list[dict]:
    return svc().store.list_sessions(user_id)


@app.get("/api/rechecks")
def rechecks(user_id: str | None = None) -> list[dict]:
    return svc().store.rechecks(user_id)


@app.get("/api/audit")
def audit(session_id: str | None = None) -> list[dict]:
    return [e.model_dump(mode="json") for e in svc().store.audit(session_id)]


# --------------------------------------------------------------------------- baseline
@app.get("/api/baselines/{user_id}")
def get_baseline(user_id: str) -> dict:
    b = svc().store.get_baseline(user_id)
    manifest = svc().provider.manifest() if isinstance(svc().provider, ReplayCSIProvider) else {}
    return {
        "baseline": b.model_dump(mode="json") if b else None,
        "required_sessions": 3,
        "recordings_available": manifest.get(user_id, {}).get("baseline", []),
    }


@app.post("/api/baselines/{user_id}/sessions")
async def enrol_session(user_id: str, body: dict = Body(default={})) -> dict:
    """Record one well-day 5xSTS for the personal baseline."""
    s = svc()
    if s.store.get_profile(user_id) is None:
        raise HTTPException(404, "Unknown user")
    existing = s.store.get_baseline(user_id)
    sessions = list(existing.sessions) if existing else []
    key = f"enrol:{user_id}"

    async def progress(p: dict) -> None:
        s.bus.publish(key, {"type": "sensing_progress", "progress": p})

    kwargs: dict = {}
    if isinstance(s.provider, ReplayCSIProvider):
        recs = s.provider.manifest().get(user_id, {}).get("baseline", [])
        if not recs:
            raise HTTPException(409, "No baseline recordings configured for this demo user")
        kwargs["recording_id"] = recs[len(sessions) % len(recs)]
    s.bus.publish(key, {"type": "sensing_state", "state": "ACTIVE"})
    run = await s.provider.run("5xSTS", user_id=user_id, on_progress=progress, **kwargs)
    seg = run.segmentation
    s.bus.publish(key, {"type": "sensing_state", "state": "COMPLETE"})
    m = FunctionalAssessment(
        measurement_id="m_" + uuid.uuid4().hex[:12], session_id=key, success=seg.success, reason=seg.reason,
        total_time_seconds=seg.total_time_seconds, rise_count=seg.rise_count, per_rise_seconds=seg.per_rise_seconds,
        arms_used=bool(body.get("arms_used", False)), arms_used_source="self_report",
        single_person_confidence=seg.single_person_confidence, measurement_confidence=seg.measurement_confidence,
        source=run.source, provider_mode=run.mode, recording_id=run.recording_id, timestamp=utcnow(),
    )
    m = s.store.save_measurement(m, user_id=user_id, purpose="baseline", debug={"trace": seg.debug, "features": seg.features})
    if not seg.success:
        return {"accepted": False, "reason": seg.reason, "measurement": m.model_dump(mode="json", exclude={"signature"}), "baseline": existing.model_dump(mode="json") if existing else None}
    sessions.append(
        {"measurement_id": m.measurement_id, "recording_id": run.recording_id, "total_time_seconds": seg.total_time_seconds,
         "per_rise_seconds": seg.per_rise_seconds, "arms_used": m.arms_used, "date": utcnow().isoformat(),
         "chair": body.get("chair", "same chair, against wall"), "provider_mode": run.mode}
    )
    now = utcnow()
    b = summarise_baseline(user_id, sessions, any(x["arms_used"] for x in sessions), existing.created_at if existing else now, now)
    s.store.put_baseline(b)
    return {"accepted": True, "measurement": m.model_dump(mode="json", exclude={"signature"}), "baseline": b.model_dump(mode="json")}


@app.delete("/api/baselines/{user_id}")
def delete_baseline(user_id: str) -> dict:
    svc().store.delete_baseline(user_id)
    return {"deleted": True}


# --------------------------------------------------------------------------- privacy
@app.get("/api/privacy/{user_id}")
def privacy(user_id: str) -> dict:
    s = svc()
    raw = sorted(p.name for p in (config.RECORDINGS_DIR / "live").glob(f"live_{user_id}_*.npz")) if (config.RECORDINGS_DIR / "live").exists() else []
    return {
        "raw_csi": {"location": "This device only", "live_files": raw, "saved_for_debugging": config.SAVE_RAW_CSI},
        "baseline": {"location": "This device, encrypted", "sessions": len(b.sessions) if (b := s.store.get_baseline(user_id)) else 0},
        "assessments": {"location": "This device", "count": len(s.store.list_sessions(user_id))},
        "sent_to_agent": ["Your answers to the questions", "Chair-rise summary (time, number of rises, confidence)", "Comparison label (e.g. 'within your usual range')"],
        "never_sent": ["Raw Wi-Fi signal data", "Your full baseline history", "Medication list"],
        "llm_extraction_enabled": bool(config.LLM_BASE_URL and config.LLM_API_KEY),
    }


@app.delete("/api/users/{user_id}/data")
def wipe(user_id: str) -> dict:
    s = svc()
    s.store.wipe_user(user_id)
    s.store.delete_baseline(user_id)
    live = config.RECORDINGS_DIR / "live"
    if live.exists():
        for f in live.glob(f"live_{user_id}_*.npz"):
            f.unlink()
    return {"deleted": True}


# --------------------------------------------------------------------------- developer / demo
@app.get("/api/dev/sensor")
def dev_sensor() -> dict:
    s = svc()
    out = {**s.provider.describe(), "live_counts": s.live_counts, "sensor_mode": config.SENSOR_MODE}
    if isinstance(s.provider, ReplayCSIProvider):
        out.update(recordings=s.provider.recordings(), manifest=s.provider.manifest(), next_override=s.provider.next_override, speed=s.provider.speed)
    return out


@app.get("/api/dev/sensor/ports")
def dev_sensor_ports() -> dict:
    return {"ports": list_ports(), "active": HUB.active()}


@app.post("/api/dev/sensor/reset-board")
def dev_sensor_reset(body: dict = Body(...)) -> dict:
    stream = HUB.get(body.get("port", ""))
    if stream is None:
        raise HTTPException(409, "Open the live monitor for this port first")
    stream.reset_board()
    return {"reset": True}


class SensorWifi(BaseModel):
    port: str
    ssid: str = Field(min_length=1, max_length=32)
    password: str = Field(default="", max_length=63)


@app.post("/api/dev/sensor/wifi")
def dev_sensor_wifi(body: SensorWifi) -> dict:
    """Provision the WISP CSI firmware's Wi-Fi over USB. Credentials go only to the board."""
    stream = HUB.get(body.port)
    if stream is None:
        raise HTTPException(409, "Open the live monitor for this port first")
    if body.password and not 8 <= len(body.password.encode()) <= 63:
        raise HTTPException(400, "Wi-Fi passwords are 8–63 characters (or empty for an open network)")
    if len(body.ssid.encode()) > 32:
        raise HTTPException(400, "Network name is too long")
    stream.write_line(f"WISP_WIFI {body.ssid.encode().hex()} {body.password.encode().hex()}")
    return {"sent": True}


@app.post("/api/dev/sensor/command")
def dev_sensor_command(body: dict = Body(...)) -> dict:
    stream = HUB.get(body.get("port", ""))
    if stream is None:
        raise HTTPException(409, "Open the live monitor for this port first")
    cmd = body.get("command")
    if cmd not in ("WISP_STATUS", "WISP_FORGET"):
        raise HTTPException(400, "Unknown command")
    stream.write_line(cmd)
    return {"sent": cmd}


@app.post("/api/dev/sensor")
def dev_sensor_update(body: dict = Body(...)) -> dict:
    s = svc()
    if body.get("provider") == "esp32":
        port = body.get("port")
        if not port or port not in {p["port"] for p in list_ports()}:
            raise HTTPException(400, "Unknown serial port")
        s.provider = ESP32CSIProvider(port, int(body.get("baud") or config.SERIAL_BAUD))
    elif body.get("provider") == "replay":
        s.provider = state["replay"]
    if "live_counts" in body:
        s.live_counts = bool(body["live_counts"])
    if isinstance(s.provider, ReplayCSIProvider):
        if "next_override" in body:
            rid = body["next_override"]
            if rid is not None and rid not in s.provider.recordings():
                raise HTTPException(400, "Unknown recording")
            s.provider.next_override = rid
        if "speed" in body:
            s.provider.speed = max(0.5, min(8.0, float(body["speed"])))
    return dev_sensor()


@app.get("/api/dev/measurements")
def dev_measurements() -> list[dict]:
    return [m.model_dump(mode="json", exclude={"signature"}) for m in svc().store.list_measurements()]


@app.get("/api/dev/measurements/{measurement_id}")
def dev_measurement(measurement_id: str) -> dict:
    s = svc()
    m = s.store.get_measurement(measurement_id)
    if not m:
        raise HTTPException(404, "Unknown measurement")
    return {"measurement": m.model_dump(mode="json", exclude={"signature"}), "debug": s.store.measurement_debug(measurement_id)}


@app.post("/api/dev/reset")
def dev_reset() -> dict:
    s = svc()
    for p in s.store.list_profiles():
        s.store.wipe_user(p.user_id)
        s.store.delete_baseline(p.user_id)
    manifest = demo_seed.generate_recordings()
    for p in demo_seed.PERSONAS:
        s.store.put_profile(p)
        if p.user_id in demo_seed.PRE_ENROLLED:
            demo_seed.enrol_from_recordings(s.store, p.user_id, manifest[p.user_id]["baseline"])
    return {"reset": True}


# --------------------------------------------------------------------------- evaluation
@app.post("/api/evaluation/validation")
def add_validation(body: dict = Body(...)) -> dict:
    s = svc()
    mid = body.get("measurement_id")
    gt = body.get("ground_truth_seconds")
    if not mid or not isinstance(gt, (int, float)) or not (2 <= gt <= 120):
        raise HTTPException(400, "measurement_id and ground_truth_seconds (2–120) required")
    if s.store.get_measurement(mid) is None:
        raise HTTPException(404, "Unknown measurement")
    s.store.add_validation(mid, float(gt), body.get("method", "stopwatch"), body.get("participant"), body.get("notes"))
    return sensor_evaluation()


@app.get("/api/evaluation/sensor")
def sensor_evaluation() -> dict:
    s = svc()
    rows = []
    for v in s.store.validations():
        m = s.store.get_measurement(v["measurement_id"])
        if not m:
            continue
        rows.append({**v, "wisp_seconds": m.total_time_seconds, "success": m.success, "confidence": m.measurement_confidence, "provider_mode": m.provider_mode})
    ok = [r for r in rows if r["success"] and r["wisp_seconds"] is not None]
    errs = [abs(r["wisp_seconds"] - r["ground_truth_seconds"]) for r in ok]
    return {
        "n_sessions": len(rows),
        "n_failures": len(rows) - len(ok),
        "mae_seconds": round(statistics.mean(errs), 2) if errs else None,
        "median_abs_error_seconds": round(statistics.median(errs), 2) if errs else None,
        "mean_confidence": round(statistics.mean(r["confidence"] for r in rows), 2) if rows else None,
        "rows": rows,
        "note": "Only sessions with recorded ground truth are included. Synthetic replays are labelled and must not be reported as real accuracy.",
    }


# --------------------------------------------------------------------------- tools (MCP bridge)
TOOLS = {
    "get_active_session", "get_health_profile", "get_previous_assessments", "record_case_facts", "screen_red_flags",
    "check_assessment_eligibility", "run_functional_assessment", "compare_to_baseline", "decide_care_tier",
    "schedule_recheck", "share_summary", "log_decision", "say_to_patient",
}


@app.post("/api/tools/{name}")
async def call_tool(name: str, body: dict = Body(default={}), x_wisp_token: str | None = Header(default=None)) -> Any:
    if not x_wisp_token or not hmac.compare_digest(x_wisp_token, config.MCP_TOKEN):
        raise HTTPException(401, "Missing or invalid tool token")
    if name not in TOOLS:
        raise HTTPException(404, "Unknown tool")
    s = svc()
    actor = "workbuddy"
    if name == "get_active_session":
        return s.get_active_session(body.get("user_id"))
    sid = body.get("session_id")
    if not isinstance(sid, str):
        raise HTTPException(400, "session_id required")
    meta = s.store.session_meta(sid)
    if meta and meta["agent"] != "workbuddy":
        raise HTTPException(409, "This session is run by the built-in agent, not WorkBuddy")
    match name:
        case "get_health_profile":
            return s.get_health_profile(sid, actor)
        case "get_previous_assessments":
            return s.get_previous_assessments(sid, actor)
        case "record_case_facts":
            return s.record_case_facts(sid, CaseFacts.model_validate(body.get("facts", {})), actor)
        case "screen_red_flags":
            return s.screen_red_flags(sid, actor).model_dump(mode="json")
        case "check_assessment_eligibility":
            return s.check_assessment_eligibility(sid, actor).model_dump(mode="json")
        case "run_functional_assessment":
            return await s.run_functional_assessment(sid, actor, assessment=body.get("type", "5xSTS"), grant_id=body.get("grant_id"), wait=True)
        case "compare_to_baseline":
            return s.compare_to_baseline(sid, actor, body.get("measurement_id")).model_dump(mode="json")
        case "decide_care_tier":
            return s.decide_care_tier(sid, actor).model_dump(mode="json")
        case "schedule_recheck":
            return s.schedule_recheck(sid, actor)
        case "share_summary":
            return s.share_summary(sid, actor, consent=body.get("patient_consented") is True)
        case "log_decision":
            return s.log_decision(sid, actor, str(body.get("selected_action", "")), str(body.get("why", "")), body.get("available_actions"))
        case "say_to_patient":
            # Mirror WorkBuddy's message onto the patient's WISP screen in large text.
            s.say(sid, "agent", str(body.get("text", ""))[:1000], kind="info", source="workbuddy")
            s.publish(sid)
            return {"ok": True}


# --------------------------------------------------------------------------- websockets
async def _pump(ws: WebSocket, key: str, initial: dict | None) -> None:
    await ws.accept()
    q = svc().bus.subscribe(key)
    try:
        if initial:
            await ws.send_json(initial)
        while True:
            ev = await q.get()
            await ws.send_json(ev)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        svc().bus.unsubscribe(key, q)


@app.websocket("/ws/sessions/{session_id}")
async def ws_session(ws: WebSocket, session_id: str):
    try:
        snap = svc().snapshot(session_id)
    except ToolError:
        await ws.close(code=4404)
        return
    await _pump(ws, session_id, {"type": "snapshot", "snapshot": snap})


@app.websocket("/ws/sensor/live")
async def ws_sensor_live(ws: WebSocket, port: str, baud: int = config.SERIAL_BAUD):
    """Engineering-view live monitor. Reads the radio only while this socket is open."""
    if port not in {p["port"] for p in list_ports()}:
        await ws.close(code=4404)
        return
    await ws.accept()
    try:
        stream = HUB.acquire(port, baud)
    except Exception as exc:  # noqa: BLE001
        await ws.send_json({"type": "error", "message": f"Could not open {port}: {exc}"})
        await ws.close()
        return
    try:
        while True:
            await ws.send_json({"type": "frame", "status": stream.status(), "frame": stream.live_frame(), "text": stream.recent_text()})
            await asyncio.sleep(0.25)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        HUB.release(port)


@app.websocket("/ws/enrol/{user_id}")
async def ws_enrol(ws: WebSocket, user_id: str):
    await _pump(ws, f"enrol:{user_id}", None)


def run() -> None:
    import uvicorn

    uvicorn.run("wisp.api.main:app", host="127.0.0.1", port=8787)
