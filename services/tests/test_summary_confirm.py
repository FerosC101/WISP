"""The opt-in summary review step: the agent pauses after the safety questions and
the patient may correct answers. Corrections obey the same safety rules as answers."""

from __future__ import annotations

import pytest

from wisp.schemas import Tier
from wisp.service import ToolError

SAFE = {
    "onset": "Gradually", "duration": "2–3 days", "chest_pain": "No", "severe_breathlessness": "No",
    "one_sided_weakness": "No", "speech_difficulty": "No", "confusion": "No", "loss_of_consciousness": "No",
    "sudden_vision_change": "No", "fall": "No", "eating": "Yes", "fluids": "Yes",
}


def pending(agent, sid):
    return agent._state(sid).get("pending")


def to_confirm(agent, service, user="mdm_tan", answers=SAFE):
    sid = service.start_session(user).session_id
    agent.open(sid, confirm_summary=True)
    agent.handle(sid, "I feel weak")
    for _ in range(20):
        p = pending(agent, sid)
        if p not in answers:
            break
        agent.handle(sid, answers[p])
    return sid


def test_agent_pauses_for_review_before_deciding(agent, service):
    sid = to_confirm(agent, service)
    assert pending(agent, sid) == "confirm"
    assert service.store.get_disposition(sid) is None
    assert not [e for e in service.store.audit(sid) if e.event == "agent_decision"]
    agent.handle(sid, "That's right", "confirm")
    assert pending(agent, sid) == "offer"


def test_without_opt_in_there_is_no_review_step(agent, service):
    sid = service.start_session("mdm_tan").session_id
    agent.open(sid)
    agent.handle(sid, "I feel weak")
    for _ in range(20):
        p = pending(agent, sid)
        if p not in SAFE:
            break
        agent.handle(sid, SAFE[p])
    assert pending(agent, sid) == "offer"


def test_correcting_a_warning_sign_to_yes_escalates(agent, service):
    sid = to_confirm(agent, service)
    agent.correct(sid, "one_sided_weakness", "yes")
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T1
    assert service.case(sid).sensing_locked


def test_correcting_fall_with_injury_escalates(agent, service):
    sid = to_confirm(agent, service)
    agent.correct(sid, "fall", "yes_injury")
    assert service.store.get_disposition(sid).tier == Tier.T1


def test_not_sure_can_be_corrected_to_no(agent, service):
    sid = to_confirm(agent, service, answers={**SAFE, "confusion": "Not sure"})
    assert "confusion" in service.case(sid).uncertain_fields
    agent.correct(sid, "confusion", "no")
    case = service.case(sid)
    assert case.red_flags.confusion is False and "confusion" not in case.uncertain_fields
    assert pending(agent, sid) == "confirm"


def test_eating_less_correction_asks_about_fluids(agent, service):
    sid = to_confirm(agent, service)
    agent.correct(sid, "eating", "no")
    assert pending(agent, sid) == "fluids"
    agent.handle(sid, "Yes", "yes")
    case = service.case(sid)
    assert case.modifiers.reduced_intake is True and case.modifiers.unable_to_keep_fluids is False
    assert pending(agent, sid) == "confirm"


def test_corrections_are_audited_as_the_patient(agent, service):
    sid = to_confirm(agent, service)
    agent.correct(sid, "duration", "d_week")
    assert service.case(sid).duration_days == 7
    last = [e for e in service.store.audit(sid) if e.tool == "record_case_facts"][-1]
    assert last.actor == "patient"


def test_corrections_only_while_reviewing(agent, service):
    sid = to_confirm(agent, service)
    agent.handle(sid, "That's right", "confirm")
    with pytest.raises(ToolError) as e:
        agent.correct(sid, "duration", "d_week")
    assert e.value.code == "invalid_state"


@pytest.mark.parametrize(
    ("field", "value"),
    [("complaint_text", "x"), ("duration", "forever"), ("onset", "unsure"), ("chest_pain", "unsure"), ("fall", "maybe")],
)
def test_invalid_corrections_are_rejected(agent, service, field, value):
    sid = to_confirm(agent, service)
    with pytest.raises(ToolError):
        agent.correct(sid, field, value)
    assert pending(agent, sid) == "confirm"
