"""Shared evaluation harness: runs conversations through the real agent + rules
+ sensing pipeline against an isolated temporary store.

Run everything:  cd services && uv run python ../evaluation/run_all.py
"""

from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "src"))

from wisp import config  # noqa: E402
from wisp.demo import seed as demo_seed  # noqa: E402
from wisp.schemas import UserProfile  # noqa: E402
from wisp.sensing.providers import ReplayCSIProvider  # noqa: E402
from wisp.service import EventBus, WispService  # noqa: E402
from wisp.store import Store  # noqa: E402
from wisp.triage.agent import LocalAgent  # noqa: E402

_TMP = Path(tempfile.mkdtemp(prefix="wisp-eval-"))
config.RECORDINGS_DIR = _TMP / "recorded_csi"
config.DEMO_DIR = _TMP / "demo"
MANIFEST = demo_seed.generate_recordings()


def fresh_env() -> tuple[WispService, LocalAgent]:
    d = Path(tempfile.mkdtemp(dir=_TMP))
    store = Store(d / "e.sqlite3", d / "k.key")
    for p in demo_seed.PERSONAS:
        store.put_profile(p)
        if p.user_id in demo_seed.PRE_ENROLLED:
            demo_seed.enrol_from_recordings(store, p.user_id, MANIFEST[p.user_id]["baseline"])
    provider = ReplayCSIProvider(config.DEMO_DIR / "recordings.json")
    provider.speed = 500.0
    svc = WispService(store, provider, EventBus())
    return svc, LocalAgent(svc)


DEFAULT_ANSWERS = {
    "scope": "Yes", "onset": "Gradually", "duration": "2–3 days", "chest_pain": "No", "severe_breathlessness": "No",
    "one_sided_weakness": "No", "speech_difficulty": "No", "confusion": "No", "loss_of_consciousness": "No",
    "sudden_vision_change": "No", "fall": "No", "fall_injury": "No", "eating": "Yes", "fluids": "Yes",
    "steady": "Yes, I feel steady", "others": "No, I'm alone", "others_clear": "The room is clear now", "arms": "No",
    "stop_reason": "No",
}


async def run_conversation(
    complaint: str,
    *,
    base_user: str = "mdm_tan",
    profile_overrides: dict | None = None,
    answers: dict | None = None,
    recording: str | None = None,
) -> dict:
    """Run one full conversation. Returns tier, whether sensing ran, and the transcript."""
    svc, agent = fresh_env()
    if profile_overrides:
        p = svc.store.get_profile(base_user)
        svc.store.put_profile(UserProfile(**{**p.model_dump(), **profile_overrides}))
    ans = {**DEFAULT_ANSWERS, **(answers or {})}
    sid = svc.start_session(base_user).session_id
    agent.open(sid)
    agent.handle(sid, complaint)
    for _ in range(40):
        pending = agent._state(sid).get("pending")
        if pending is None or pending == "share":
            break
        if pending == "check":
            if recording:
                svc.provider.next_override = recording
            for _ in range(500):
                if sid in svc._ready:
                    break
                await asyncio.sleep(0.01)
            svc.patient_ready(sid)
            for _ in range(1000):
                await asyncio.sleep(0.01)
                if agent._state(sid).get("pending") != "check":
                    break
            continue
        agent.handle(sid, ans[pending])
    d = svc.store.get_disposition(sid)
    case = svc.case(sid)
    return {
        "tier": d.tier.value if d else None,
        "sensing_used": bool(d and d.sensing_used),
        "measured": case.measurement_id is not None,
        "transcript": [(m["role"], m["text"]) for m in svc.store.messages(sid)],
    }
