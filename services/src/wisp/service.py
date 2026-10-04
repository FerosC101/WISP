"""WISP tool service.

Every agent-facing tool (MCP, REST, built-in agent) goes through this class so
that ordering and safety rules are enforced in one place:

* red-flag screen runs on every case update; a red flag locks sensing for the session
* `run_functional_assessment` requires a fresh, single-use eligibility grant
* measurements are produced only by the sensing provider, signed, and bound to
  the session; the agent can reference them by id but cannot author them
* `decide_care_tier` reads verified evidence from the store, never from the caller
"""

from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Literal

from pydantic import Field

from . import config
from .audit.trace import build_trace
from .baseline.compare import compare_to_baseline as _compare
from .rules.care_tier import decide_care_tier as _decide
from .rules.eligibility import check_assessment_eligibility as _eligibility
from .rules.red_flags import screen_red_flags as _screen
from .schemas import (
    RED_FLAG_FIELDS,
    TIER_LABELS,
    Actor,
    AssessmentEligibility,
    AuditEvent,
    BaselineComparison,
    CareDisposition,
    CaseState,
    FunctionalAssessment,
    Modifiers,
    RedFlagResult,
    Strict,
    utcnow,
)
from .sensing.providers import AssessmentProvider
from .store import Store


class ToolError(Exception):
    def __init__(self, message: str, code: str = "tool_error"):
        super().__init__(message)
        self.code = code


class CaseFacts(Strict):
    """Structured facts an agent may record. Unknown keys are rejected."""

    complaint_text: str | None = Field(default=None, max_length=1000)
    complaint_summary: str | None = Field(default=None, max_length=120)
    complaint_category: Literal["functional", "out_of_scope", "unknown"] | None = None
    onset: Literal["sudden", "gradual"] | None = None
    duration_days: float | None = Field(default=None, ge=0, le=3650)
    red_flags: dict[str, bool] = {}
    modifiers: dict[str, bool] = {}
    uncertain_fields: list[str] = []
    feels_safe_to_stand: bool | None = None
    others_present: bool | None = None
    arms_used: bool | None = None
    functional_status: Literal["declined", "stopped_early"] | None = None
    contradiction: str | None = Field(default=None, max_length=300)


class EventBus:
    """Fan-out of session events to WebSocket subscribers.

    Sync API handlers run in a worker thread, so delivery is marshalled onto the
    server's event loop (asyncio queues are not thread-safe).
    """

    def __init__(self) -> None:
        self._subs: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self.loop: asyncio.AbstractEventLoop | None = None

    def subscribe(self, key: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subs[key].add(q)
        return q

    def unsubscribe(self, key: str, q: asyncio.Queue) -> None:
        self._subs[key].discard(q)

    def publish(self, key: str, event: dict) -> None:
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None
        if self.loop is not None and running is not self.loop:
            self.loop.call_soon_threadsafe(self._deliver, key, event)
        else:
            self._deliver(key, event)

    def _deliver(self, key: str, event: dict) -> None:
        for k in (key, "*"):
            for q in list(self._subs.get(k, ())):
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass


CheckHook = Callable[[str], Awaitable[None]]


class WispService:
    def __init__(self, store: Store, provider: AssessmentProvider, bus: EventBus | None = None):
        self.store = store
        self.provider = provider
        self.bus = bus or EventBus()
        self._ready: dict[str, asyncio.Event] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self.on_check_complete: list[CheckHook] = []
        self.live_counts = False  # show 1/5..5/5 in the patient UI (developer toggle)

    # ------------------------------------------------------------------ helpers
    def case(self, session_id: str) -> CaseState:
        if not isinstance(session_id, str) or not session_id.startswith("s_") or len(session_id) > 40:
            raise ToolError("Invalid session_id", "invalid_session")
        case = self.store.get_case(session_id)
        if case is None:
            raise ToolError("Unknown session_id", "invalid_session")
        return case

    def profile(self, case: CaseState):
        p = self.store.get_profile(case.user_id)
        if p is None:
            raise ToolError("No profile for this user", "no_profile")
        return p

    def audit(self, session_id: str, actor: Actor, event: str, tool: str | None = None, result: str | None = None, **data: Any) -> None:
        ev = self.store.log(AuditEvent(session_id=session_id, actor=actor, event=event, tool=tool, result=result, data=data))
        self.bus.publish(session_id, {"type": "audit", "event": ev.model_dump(mode="json")})

    def snapshot(self, session_id: str) -> dict:
        # Read the version FIRST: everything read afterwards is at least this new,
        # so clients can safely drop snapshots with a lower version.
        version = self.store.version(session_id)
        case = self.case(session_id)
        meta = self.store.session_meta(session_id) or {}
        profile = self.store.get_profile(case.user_id)
        disposition = self.store.get_disposition(session_id)
        messages = self.store.messages(session_id)
        trace = build_trace(self.store, session_id)
        return {
            "session_id": session_id,
            "version": version,
            "agent": meta.get("agent"),
            "profile": _public_profile(profile) if profile else None,
            "case": case.model_dump(mode="json"),
            "messages": messages,
            "trace": trace.model_dump(mode="json"),
            "disposition": disposition.model_dump(mode="json") if disposition else None,
            "sensor": {**self.provider.describe(), "live_counts": self.live_counts},
            "baseline_available": self.store.get_baseline(case.user_id) is not None,
        }

    def publish(self, session_id: str) -> None:
        self.bus.publish(session_id, {"type": "snapshot", "snapshot": self.snapshot(session_id)})

    def say(self, session_id: str, role: str, text: str, **data: Any) -> dict:
        msg = self.store.add_message(session_id, role, text, data)
        self.bus.publish(session_id, {"type": "message", "message": msg})
        return msg

    # ------------------------------------------------------------------ sessions
    def start_session(self, user_id: str, *, agent: str = "local_agent", previous_session_id: str | None = None) -> CaseState:
        if self.store.get_profile(user_id) is None:
            raise ToolError("Unknown user", "no_profile")
        case = self.store.create_session(user_id, agent=agent, previous_session_id=previous_session_id)
        self.audit(case.session_id, "patient", "assessment_started", result=agent, previous_session_id=previous_session_id)
        return case

    def get_active_session(self, user_id: str | None = None) -> dict:
        """WorkBuddy attaches to an assessment the patient started on the WISP screen."""
        for s in self.store.list_sessions(user_id, limit=10):
            meta = self.store.session_meta(s["session_id"])
            case = self.store.get_case(s["session_id"])
            if meta and meta["agent"] == "workbuddy" and case and not case.finished:
                return {"session_id": s["session_id"], "user_id": s["user_id"], "created_at": s["created_at"], "previous_session_id": s["previous_session_id"]}
        raise ToolError(
            "No active WorkBuddy assessment. Ask the patient to press 'Start assessment' on the WISP screen first.",
            "no_active_session",
        )

    # ------------------------------------------------------------------ tools
    def get_health_profile(self, session_id: str, actor: Actor) -> dict:
        case = self.case(session_id)
        p = self.profile(case)
        self.audit(session_id, actor, "tool_call", "get_health_profile", "ok")
        return _public_profile(p)

    def get_previous_assessments(self, session_id: str, actor: Actor, limit: int = 3) -> list[dict]:
        case = self.case(session_id)
        out = []
        for s in self.store.list_sessions(case.user_id, limit=limit + 1):
            if s["session_id"] == session_id or not s["tier"]:
                continue
            prev = self.store.get_case(s["session_id"])
            out.append(
                {
                    "session_id": s["session_id"],
                    "date": s["created_at"],
                    "complaint": s["complaint"],
                    "tier": s["tier"],
                    "title": s["title"],
                    "functional_result": prev.comparison.label if prev and prev.comparison else None,
                }
            )
        self.audit(session_id, actor, "tool_call", "get_previous_assessments", f"{len(out)} found")
        return out[:limit]

    def record_case_facts(self, session_id: str, facts: CaseFacts, actor: Actor) -> dict:
        case = self.case(session_id)
        if case.finished and not any(v is True for v in facts.red_flags.values()):
            raise ToolError("This assessment is finished. Start a new assessment.", "finished")
        upd = case.model_copy(deep=True)
        for f in ("complaint_text", "complaint_summary", "complaint_category", "onset", "duration_days", "feels_safe_to_stand", "others_present", "arms_used"):
            v = getattr(facts, f)
            if v is not None:
                setattr(upd, f, v)
        for k, v in facts.red_flags.items():
            if k not in RED_FLAG_FIELDS:
                raise ToolError(f"Unknown red flag '{k}'", "invalid_input")
            if getattr(upd.red_flags, k) is True and v is False:
                # Fail closed: a reported warning sign cannot be withdrawn within a session.
                upd.contradictions.append(f"{k} reported then denied")
                continue
            setattr(upd.red_flags, k, v)
            if k in upd.uncertain_fields:
                upd.uncertain_fields.remove(k)
        for k, v in facts.modifiers.items():
            if k not in Modifiers.model_fields:
                raise ToolError(f"Unknown modifier '{k}'", "invalid_input")
            setattr(upd.modifiers, k, v)
        for k in facts.uncertain_fields:
            if k not in RED_FLAG_FIELDS:
                raise ToolError(f"Unknown field '{k}'", "invalid_input")
            if getattr(upd.red_flags, k) is None and k not in upd.uncertain_fields:
                upd.uncertain_fields.append(k)
        if facts.onset == "sudden":
            upd.red_flags.sudden_onset = True
        elif facts.onset == "gradual" and upd.red_flags.sudden_onset is None:
            upd.red_flags.sudden_onset = False
        if facts.functional_status:
            if case.functional_status in ("measured",) and facts.functional_status == "declined":
                raise ToolError("A measurement already exists for this session", "invalid_state")
            upd.functional_status = facts.functional_status
        if facts.contradiction:
            upd.contradictions.append(facts.contradiction)

        rf = _screen(upd)
        if rf.status == "triggered" and not upd.sensing_locked:
            upd.sensing_locked = True
            upd.sensing_state = "LOCKED"
            self._cancel_check(session_id)
            self.audit(session_id, "rule_engine", "sensing_locked", result="red_flag", flags=rf.triggered_flags)
        self.store.save_case(upd)
        changed = facts.model_dump(exclude_defaults=True)
        self.audit(session_id, actor, "tool_call", "record_case_facts", "ok", facts=changed)
        self.audit(session_id, "rule_engine", "red_flag_screen", "screen_red_flags", rf.status, triggered=rf.triggered_flags)
        self.publish(session_id)
        return {"red_flag_screen": rf.model_dump(mode="json"), "case": upd.model_dump(mode="json")}

    def screen_red_flags(self, session_id: str, actor: Actor) -> RedFlagResult:
        case = self.case(session_id)
        rf = _screen(case)
        if rf.status == "triggered" and not case.sensing_locked:
            case.sensing_locked = True
            case.sensing_state = "LOCKED"
            self.store.save_case(case)
            self.audit(session_id, "rule_engine", "sensing_locked", result="red_flag", flags=rf.triggered_flags)
        self.audit(session_id, actor, "tool_call", "screen_red_flags", rf.status, triggered=rf.triggered_flags, missing=rf.missing)
        self.publish(session_id)
        return rf

    def log_decision(self, session_id: str, actor: Actor, selected_action: str, why: str, available_actions: list[str] | None = None) -> dict:
        self.case(session_id)
        if len(why) > 400 or len(selected_action) > 80:
            raise ToolError("Decision summary too long; log a short structured reason, not reasoning text", "invalid_input")
        self.audit(session_id, actor, "agent_decision", "log_decision", selected_action, selected_action=selected_action, why=why, available_actions=available_actions or [])
        self.publish(session_id)
        return {"logged": True}

    def check_assessment_eligibility(self, session_id: str, actor: Actor) -> AssessmentEligibility:
        case = self.case(session_id)
        profile = self.profile(case)
        el = _eligibility(
            case,
            profile,
            baseline_available=self.store.get_baseline(case.user_id) is not None,
            sensor_available=self.provider.available(),
        )
        if el.allowed:
            exp = utcnow() + timedelta(seconds=config.GRANT_TTL_SECONDS)
            el = el.model_copy(update={"grant_id": self.store.create_grant(session_id, exp), "grant_expires_at": exp})
        self.audit(session_id, actor, "tool_call", "check_assessment_eligibility", "allowed" if el.allowed else "refused", reason=el.reason)
        self.publish(session_id)
        return el

    async def run_functional_assessment(self, session_id: str, actor: Actor, *, assessment: str = "5xSTS", grant_id: str | None = None, wait: bool = True) -> dict:
        if assessment != "5xSTS":
            raise ToolError("Only '5xSTS' is supported", "invalid_input")
        case = self.case(session_id)
        if case.sensing_locked:
            self.audit(session_id, actor, "tool_call", "run_functional_assessment", "refused_locked")
            raise ToolError("Physical sensing is locked for this session because an emergency warning sign was reported.", "sensing_locked")
        if not _screen(case).passed:
            self.audit(session_id, actor, "tool_call", "run_functional_assessment", "refused_screen")
            raise ToolError("The red-flag screen must pass before any physical assessment.", "order_violation")
        if session_id in self._tasks and not self._tasks[session_id].done():
            raise ToolError("An assessment is already running for this session", "invalid_state")
        if not grant_id or not self.store.consume_grant(grant_id, session_id):
            self.audit(session_id, actor, "tool_call", "run_functional_assessment", "refused_no_grant")
            raise ToolError("No valid eligibility grant. Call check_assessment_eligibility first.", "order_violation")

        case.functional_status = "awaiting_patient"
        case.sensing_state = "ACTIVE"
        self.store.save_case(case)
        self.audit(session_id, actor, "tool_call", "run_functional_assessment", "awaiting_patient", assessment=assessment)
        self.audit(session_id, actor, "assessment_selected", result=assessment, reason="Functional evidence could change the care tier.")
        self._ready[session_id] = asyncio.Event()
        task = asyncio.create_task(self._run_check(session_id))
        self._tasks[session_id] = task
        self.publish(session_id)
        if not wait:
            return {"status": "awaiting_patient", "message": "The patient's screen is showing the instructions. Waiting for them to start."}
        try:
            return await asyncio.shield(task)
        except asyncio.CancelledError:
            if task.cancelled():
                return {"success": False, "reason": "stopped_by_patient_or_red_flag"}
            raise

    def patient_ready(self, session_id: str) -> None:
        ev = self._ready.get(session_id)
        if ev is None:
            raise ToolError("No assessment is waiting to start", "invalid_state")
        self.audit(session_id, "patient", "patient_ready_for_check")
        ev.set()

    async def patient_stop(self, session_id: str) -> None:
        task = self._tasks.get(session_id)
        if task is None or task.done():
            raise ToolError("No assessment is running", "invalid_state")
        task.cancel()
        case = self.case(session_id)
        if case.functional_status == "awaiting_patient":
            # Skipped before starting: the patient chose not to do it.
            case.functional_status = "declined"
            case.sensing_state = "OFF"
            self.audit(session_id, "patient", "check_skipped_by_patient")
        else:
            case.functional_status = "stopped_early"
            case.sensing_state = "COMPLETE"
            self.audit(session_id, "patient", "check_stopped_by_patient")
        self.store.save_case(case)
        self.publish(session_id)
        await self._fire_hooks(session_id)

    def _cancel_check(self, session_id: str) -> None:
        task = self._tasks.get(session_id)
        if task and not task.done():
            task.cancel()

    async def _run_check(self, session_id: str) -> dict:
        try:
            await asyncio.wait_for(self._ready[session_id].wait(), timeout=config.PATIENT_READY_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            case = self.case(session_id)
            case.functional_status = "declined"
            case.sensing_state = "OFF"
            self.store.save_case(case)
            self.audit(session_id, "sensing", "check_not_started", result="timeout")
            self.publish(session_id)
            await self._fire_hooks(session_id)
            return {"success": False, "reason": "patient_did_not_start"}
        finally:
            self._ready.pop(session_id, None)

        case = self.case(session_id)
        if case.sensing_locked:  # a red flag arrived while waiting
            return {"success": False, "reason": "sensing_locked"}
        case.functional_status = "measuring"
        self.store.save_case(case)
        self.audit(session_id, "sensing", "sensing_active", result=self.provider.name, mode=self.provider.mode)
        self.publish(session_id)

        async def progress(p: dict) -> None:
            self.bus.publish(session_id, {"type": "sensing_progress", "progress": p})

        debug: dict = {}
        try:
            run = await self.provider.run("5xSTS", user_id=case.user_id, on_progress=progress)
            seg = run.segmentation
            debug = {"trace": seg.debug, "features": seg.features, "onset_s": seg.onset_s, "offset_s": seg.offset_s, "stand_peaks_s": seg.stand_peaks_s}
            m = FunctionalAssessment(
                measurement_id="m_" + uuid.uuid4().hex[:12],
                session_id=session_id,
                success=seg.success,
                reason=seg.reason,
                total_time_seconds=seg.total_time_seconds,
                rise_count=seg.rise_count,
                per_rise_seconds=seg.per_rise_seconds,
                single_person_confidence=seg.single_person_confidence,
                measurement_confidence=seg.measurement_confidence,
                source=run.source,
                provider_mode=run.mode,
                recording_id=run.recording_id,
                timestamp=utcnow(),
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - a sensor failure must degrade, not crash
            m = FunctionalAssessment(
                measurement_id="m_" + uuid.uuid4().hex[:12],
                session_id=session_id,
                success=False,
                reason="tool_failure",
                single_person_confidence=0.0,
                measurement_confidence=0.0,
                source=f"{self.provider.name}:error",
                provider_mode=self.provider.mode,
                timestamp=utcnow(),
            )
            debug = {"error": str(exc)}

        m = self.store.save_measurement(m, user_id=case.user_id, debug=debug)
        case = self.case(session_id)
        case.measurement_id = m.measurement_id
        case.functional_status = "measured" if m.success else "unreliable"
        case.sensing_state = "COMPLETE"
        self.store.save_case(case)
        result = _agent_view(m)
        self.audit(session_id, "sensing", "measurement_complete", "run_functional_assessment", "success" if m.success else (m.reason or "failed"), measurement=result)
        self.publish(session_id)
        await self._fire_hooks(session_id)
        return result

    async def _fire_hooks(self, session_id: str) -> None:
        for hook in self.on_check_complete:
            await hook(session_id)
        self.publish(session_id)  # hooks may have added messages outside any request

    def compare_to_baseline(self, session_id: str, actor: Actor, measurement_id: str | None = None) -> BaselineComparison:
        case = self.case(session_id)
        mid = measurement_id or case.measurement_id
        m = self.store.get_measurement(mid, session_id) if mid else None
        if mid and (m is None or not m.verified):
            self.audit(session_id, actor, "tool_call", "compare_to_baseline", "rejected_unverified", measurement_id=mid)
            raise ToolError("Measurement not found, not verified, or not from this session", "unverified_measurement")
        if m is not None and case.arms_used is not None and m.arms_used is None:
            m = self.store.update_measurement(m.model_copy(update={"arms_used": case.arms_used, "arms_used_source": "self_report"}))
        cmp = _compare(m, self.store.get_baseline(case.user_id))
        case.comparison = cmp
        self.store.save_case(case)
        self.audit(session_id, actor, "tool_call", "compare_to_baseline", cmp.status, comparison=cmp.model_dump(mode="json"))
        self.publish(session_id)
        return cmp

    def decide_care_tier(self, session_id: str, actor: Actor) -> CareDisposition:
        case = self.case(session_id)
        profile = self.profile(case)
        comparison = None
        if case.measurement_id:
            m = self.store.get_measurement(case.measurement_id, session_id)
            if m is None or not m.verified:
                raise ToolError("Session measurement failed verification", "unverified_measurement")
            comparison = case.comparison or _compare(m, self.store.get_baseline(case.user_id))
        d = _decide(case, profile, comparison)
        self.store.save_disposition(session_id, d)
        case.finished = True
        if case.sensing_state == "ACTIVE":
            case.sensing_state = "OFF"
        self.store.save_case(case)
        self.audit(
            session_id, "rule_engine", "care_tier_decided", "decide_care_tier", d.tier.value,
            requested_by=actor, tier=d.tier.value, label=TIER_LABELS[d.tier], rules=[h.rule_id for h in d.rule_hits],
        )
        if case.previous_session_id:
            self.store.complete_recheck(case.previous_session_id)
        self.publish(session_id)
        return d

    def schedule_recheck(self, session_id: str, actor: Actor) -> dict:
        case = self.case(session_id)
        d = self.store.get_disposition(session_id)
        if d is None or d.recheck is None:
            raise ToolError("No re-check is planned for this recommendation", "invalid_state")
        rid = self.store.add_recheck(session_id, case.user_id, d.recheck.due_at, d.recheck.reason)
        self.audit(session_id, actor, "tool_call", "schedule_recheck", d.recheck.due_at.isoformat(), recheck_id=rid)
        self.publish(session_id)
        return {"recheck_id": rid, "due_at": d.recheck.due_at.isoformat(), "reason": d.recheck.reason}

    def caregiver_summary(self, session_id: str) -> dict:
        case = self.case(session_id)
        p = self.profile(case)
        d = self.store.get_disposition(session_id)
        if d is None:
            raise ToolError("No recommendation yet", "invalid_state")
        reasons = [r for r in d.reasons if not r.startswith("A normal movement check")]
        text = (
            f"{p.display_name} completed a WISP self-triage check.\n\n"
            f"Recommendation:\n{d.title}. {d.action}\n\n"
            "Reasons:\n" + "\n".join(f"- {r}" for r in reasons) + "\n\n"
            "This is not a diagnosis. Raw sensing data is not shared."
        )
        return {"caregiver": p.caregiver.model_dump() if p.caregiver else None, "summary": text, "tier": d.tier.value}

    def share_summary(self, session_id: str, actor: Actor, consent: bool) -> dict:
        s = self.caregiver_summary(session_id)
        if not s["caregiver"]:
            raise ToolError("No caregiver on file", "invalid_state")
        if consent is not True:
            self.audit(session_id, actor, "tool_call", "share_summary", "declined_by_patient")
            return {"shared": False}
        record = {"to": s["caregiver"]["name"], "summary": s["summary"], "consented_at": utcnow().isoformat(), "delivered": "simulated"}
        self.store.add_share(session_id, record)
        self.audit(session_id, actor, "tool_call", "share_summary", "shared_with_consent", to=s["caregiver"]["name"], delivery="simulated")
        self.publish(session_id)
        return {"shared": True, **record}


def _public_profile(p) -> dict:
    """Minimum profile needed for personalisation (no medications list sent to the agent)."""
    return {
        "user_id": p.user_id,
        "display_name": p.display_name,
        "age": p.age,
        "lives_alone": p.lives_alone,
        "usual_gp": p.usual_gp,
        "mobility_aid": p.mobility_aid,
        "normally_stands_unaided": p.normally_stands_unaided,
        "conditions": p.conditions,
        "caregiver": {"name": p.caregiver.name, "relationship": p.caregiver.relationship} if p.caregiver else None,
    }


def _agent_view(m: FunctionalAssessment) -> dict:
    """What the agent receives: a structured summary. Never raw CSI."""
    return m.model_dump(mode="json", exclude={"signature"})
