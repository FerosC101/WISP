"""Structured follow-up check-ins: better / same / worse / something new.

The previous result is context only. Every follow-up re-asks the safety questions,
and a new warning sign escalates whatever last time showed."""

from __future__ import annotations

from datetime import timedelta

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


def finished_check(agent, service, user="mdm_siti"):
    """A previous check that ended without a measurement (no-baseline path not needed)."""
    sid = service.start_session(user).session_id
    agent.open(sid)
    agent.handle(sid, "I'm tired and don't feel like myself.")
    for _ in range(25):
        p = pending(agent, sid)
        if p == "offer":
            agent.handle(sid, "Skip", "skip")
            break
        agent.handle(sid, SAFE[p])
    assert service.store.get_disposition(sid) is not None
    # Pretend it happened a day ago.
    case = service.case(sid)
    case.created_at = case.created_at - timedelta(days=1)
    service.store.save_case(case)
    return sid


def follow(agent, service, prev, trend, text=None):
    sid = service.start_session(service.case(prev).user_id, previous_session_id=prev).session_id
    agent.open(sid, greet=False)
    agent.follow_up(sid, trend, text)
    return sid


@pytest.mark.parametrize("trend", ["better", "same", "worse"])
def test_carries_over_complaint_and_reasks_safety(agent, service, trend):
    prev = finished_check(agent, service)
    sid = follow(agent, service, prev, trend)
    case, before = service.case(sid), service.case(prev)
    assert case.complaint_summary == before.complaint_summary and case.onset == "gradual"
    assert case.duration_days == pytest.approx(before.duration_days + 1, abs=0.2)
    assert pending(agent, sid) == "chest_pain"  # every warning sign asked again
    assert all(v is None for k, v in case.red_flags.model_dump().items() if k != "sudden_onset")
    assert (case.modifiers.getting_worse is True) == (trend == "worse")


def test_worse_raises_the_floor(agent, service):
    prev = finished_check(agent, service)
    sid = follow(agent, service, prev, "worse")
    for _ in range(25):
        p = pending(agent, sid)
        if p == "offer":
            agent.handle(sid, "Skip", "skip")
            break
        agent.handle(sid, SAFE[p])
    d = service.store.get_disposition(sid)
    assert d.tier in (Tier.T2, Tier.T3)
    assert any("getting worse" in r for r in d.reasons)


def test_something_new_with_red_flag_escalates_despite_previous_result(agent, service):
    prev = finished_check(agent, service)
    sid = follow(agent, service, prev, "new", "My daughter said I seemed confused last night.")
    assert service.store.get_disposition(sid).tier == Tier.T1
    assert service.case(sid).sensing_locked


def test_red_flag_in_added_words_escalates_even_when_better(agent, service):
    prev = finished_check(agent, service)
    sid = follow(agent, service, prev, "better", "but I had some chest pain this morning")
    assert service.store.get_disposition(sid).tier == Tier.T1


def test_something_new_needs_words(agent, service):
    prev = finished_check(agent, service)
    sid = service.start_session("mdm_siti", previous_session_id=prev).session_id
    agent.open(sid, greet=False)
    with pytest.raises(ToolError):
        agent.follow_up(sid, "new", "  ")
    with pytest.raises(ToolError):
        agent.follow_up(sid, "fine")


def test_follow_up_answer_is_audited_for_the_technical_view(agent, service):
    prev = finished_check(agent, service)
    sid = follow(agent, service, prev, "worse", "my legs feel heavier")
    ev = [e for e in service.store.audit(sid) if e.event == "follow_up_answer"]
    assert len(ev) == 1 and ev[0].actor == "patient" and ev[0].result == "worse" and ev[0].data["added_words"] is True
