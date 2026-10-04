"""Build the auditable Decision Trace shown in the UI.

This is a structured decision record built from case state and the audit log. It
is NOT model chain-of-thought.
"""

from __future__ import annotations

from ..rules.care_tier import decide_care_tier
from ..rules.ranges import symptom_range
from ..rules.red_flags import RED_FLAG_LABELS, screen_red_flags
from ..schemas import TIER_LABELS, CaseState, DecisionTrace, Tier
from ..store import Store

QUESTION_LABELS = {
    **{k: v for k, v in RED_FLAG_LABELS.items()},
}


def counterfactual_without_sensing(case: CaseState, profile) -> Tier:
    """The tier the rules would give with no functional evidence at all."""
    c = case.model_copy(update={"functional_status": "not_considered", "comparison": None, "measurement_id": None})
    return decide_care_tier(c, profile, None).tier


def build_trace(store: Store, session_id: str) -> DecisionTrace:
    case = store.get_case(session_id)
    assert case is not None
    profile = store.get_profile(case.user_id)
    rf = screen_red_flags(case)
    events = store.audit(session_id)
    disposition = store.get_disposition(session_id)

    possible_range = None
    missing: list[str] = []
    if rf.status == "triggered":
        possible_range = {"floor": "T1", "ceiling": "T1", "floor_label": TIER_LABELS[Tier.T1], "ceiling_label": TIER_LABELS[Tier.T1]}
    elif rf.status == "passed":
        rng = symptom_range(case)
        possible_range = {
            "floor": rng.floor.value,
            "ceiling": rng.ceiling.value,
            "floor_label": TIER_LABELS[rng.floor],
            "ceiling_label": TIER_LABELS[rng.ceiling],
        }
        if rng.floor != rng.ceiling and case.comparison is None and case.functional_status in ("not_considered", "awaiting_patient", "measuring"):
            missing.append("Has physical function changed from usual?")
    else:
        possible_range = {"floor": None, "ceiling": None, "floor_label": "Not yet known", "ceiling_label": "Not yet known"}
        missing = [f"{QUESTION_LABELS[f]}?" for f in rf.missing]
        if case.complaint_category == "unknown":
            missing.insert(0, "What is the main concern?")

    decisions = [e for e in events if e.event == "agent_decision"]
    last = decisions[-1] if decisions else None
    tool_calls = [
        {"tool": e.tool, "actor": e.actor, "result": e.result, "timestamp": e.timestamp.isoformat(), "data": e.data}
        for e in events
        if e.tool
    ]

    functional = None
    if case.measurement_id:
        m = store.get_measurement(case.measurement_id, session_id)
        if m:
            functional = m.model_dump(mode="json", exclude={"signature"})

    impact = None
    if disposition and profile:
        cf = counterfactual_without_sensing(case, profile)
        if disposition.sensing_used and cf != disposition.tier:
            impact = f"{TIER_LABELS[cf]} → {TIER_LABELS[disposition.tier]}"
        elif disposition.sensing_used:
            impact = f"Confirmed {TIER_LABELS[disposition.tier]}"
        elif rf.status == "triggered":
            impact = "Sensing not requested: emergency warning sign already determines the recommendation"

    previous = None
    if case.previous_session_id:
        prev_case = store.get_case(case.previous_session_id)
        prev_disp = store.get_disposition(case.previous_session_id)
        if prev_case:
            previous = {
                "session_id": prev_case.session_id,
                "created_at": prev_case.created_at.isoformat(),
                "complaint": prev_case.complaint_text,
                "tier": prev_disp.tier.value if prev_disp else None,
                "title": prev_disp.title if prev_disp else None,
                "functional_label": prev_case.comparison.label if prev_case.comparison else None,
                "note": "A previous result is context only. It is never used to lower today's urgency.",
            }

    actions = ["Ask another question", "Physical function check", "Recommend care now"]
    return DecisionTrace(
        session_id=session_id,
        current_concern=case.complaint_text,
        safety_screen=rf,
        possible_range=possible_range,
        missing_information=missing,
        available_actions=actions,
        selected_action=last.data.get("selected_action") if last else None,
        why=last.data.get("why") if last else None,
        tool_calls=tool_calls,
        functional_result=functional,
        comparison=case.comparison,
        decision_impact=impact,
        disposition=disposition,
        previous=previous,
        events=events[-80:],
    )
