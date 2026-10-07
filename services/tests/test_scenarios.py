"""The required demo scenarios, driven through the built-in agent end to end."""

from __future__ import annotations

import asyncio

from wisp.schemas import Tier
from wisp.triage.extract import extract_rules


async def wait_for(pred, timeout=10.0):
    for _ in range(int(timeout / 0.02)):
        if pred():
            return
        await asyncio.sleep(0.02)
    raise AssertionError("timed out")


def pending(agent, sid):
    return agent._state(sid).get("pending")


SAFE_ANSWERS = {
    "onset": "Gradually", "duration": "2–3 days", "chest_pain": "No", "severe_breathlessness": "No",
    "one_sided_weakness": "No", "speech_difficulty": "No", "confusion": "No", "loss_of_consciousness": "No",
    "sudden_vision_change": "No", "fall": "No", "eating": "Yes", "fluids": "Yes",
    "offer": "Do the check", "steady": "Yes, I'm ready", "others": "No, I'm alone", "arms": "No",
}


async def converse(agent, service, sid, answers, until="check"):
    for _ in range(30):
        p = pending(agent, sid)
        if p == until or p is None or p == "share":
            return p
        agent.handle(sid, answers[p])
    raise AssertionError("conversation did not converge")


async def finish_check(agent, service, sid):
    await wait_for(lambda: sid in service._ready)
    service.patient_ready(sid)
    await wait_for(lambda: pending(agent, sid) != "check")


async def test_scenario_1_agent_chooses_sensing(agent, service):
    case = service.start_session("mdm_tan")
    sid = case.session_id
    agent.open(sid)
    agent.handle(sid, "I've felt weak for two days.")
    answers = {**SAFE_ANSWERS, "eating": "No, I've been eating less"}
    assert await converse(agent, service, sid, answers) == "check"
    decision = [e for e in service.store.audit(sid) if e.event == "agent_decision"][-1]
    assert decision.data["selected_action"] == "Physical function check"
    await finish_check(agent, service, sid)
    assert pending(agent, sid) == "arms"
    agent.handle(sid, "Yes")  # needed arms today
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T2 and d.sensing_used
    assert any("slower than your usual" in r for r in d.reasons)
    assert any("eating" in r for r in d.reasons)
    from wisp.audit.trace import build_trace

    t = build_trace(service.store, sid)
    assert t.decision_impact == "Primary care soon → Same-day care"


async def test_scenario_2_agent_refuses_sensing(agent, service):
    sid = service.start_session("mr_lim").session_id
    agent.open(sid)
    agent.handle(sid, "This morning I suddenly felt dizzy and my left hand feels clumsy.")
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T1 and not d.sensing_used
    case = service.case(sid)
    assert case.sensing_locked and case.measurement_id is None
    assert "suddenly" in d.reasons[0] and "one side" in d.reasons[0]
    decision = [e for e in service.store.audit(sid) if e.event == "agent_decision"][-1]
    assert decision.data["selected_action"] == "Escalate now"
    assert not any(e.tool == "run_functional_assessment" for e in service.store.audit(sid))


async def test_scenario_3_dynamic_reassessment(agent, service):
    sid = service.start_session("mdm_siti").session_id
    agent.open(sid)
    agent.handle(sid, "I'm tired and don't feel like myself.")
    assert await converse(agent, service, sid, SAFE_ANSWERS) == "check"
    await finish_check(agent, service, sid)
    agent.handle(sid, "No")
    d1 = service.store.get_disposition(sid)
    assert d1.tier == Tier.T4 and d1.recheck is not None
    assert service.store.rechecks("mdm_siti")[0]["status"] == "scheduled"

    sid2 = service.start_session("mdm_siti", previous_session_id=sid).session_id
    agent.open(sid2)
    agent.handle(sid2, "My daughter said I seemed confused last night.")
    d2 = service.store.get_disposition(sid2)
    assert d2.tier == Tier.T1
    from wisp.audit.trace import build_trace

    t = build_trace(service.store, sid2)
    assert t.previous["tier"] == "T4" and "never used to lower" in t.previous["note"]


async def test_scenario_4_interference_abstains(agent, service, provider):
    sid = service.start_session("mdm_tan").session_id
    agent.open(sid)
    agent.handle(sid, "I feel weak.")
    assert await converse(agent, service, sid, {**SAFE_ANSWERS, "duration": "Since yesterday"}) == "check"
    provider.next_override = "tan_interference"
    await finish_check(agent, service, sid)
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.ABSTAIN
    assert any("couldn't get a reliable reading" in m["text"] for m in service.store.messages(sid))


async def test_unsteady_patient_is_not_tested(agent, service):
    sid = service.start_session("mdm_tan").session_id
    agent.open(sid)
    agent.handle(sid, "I feel weak and slow.")
    await converse(agent, service, sid, {**SAFE_ANSWERS, "steady": "No"})
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T2 and service.case(sid).measurement_id is None


async def test_no_baseline_skips_sensing(agent, service):
    sid = service.start_session("mr_lim").session_id
    agent.open(sid)
    agent.handle(sid, "I feel tired since yesterday.")
    await converse(agent, service, sid, SAFE_ANSWERS)
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T3
    decision = [e for e in service.store.audit(sid) if e.event == "agent_decision"][-1]
    assert "baseline" in decision.data["why"]


async def test_red_flag_mid_conversation(agent, service):
    sid = service.start_session("mdm_tan").session_id
    agent.open(sid)
    agent.handle(sid, "I feel weak.")
    agent.handle(sid, "Gradually")
    agent.handle(sid, "Since yesterday")
    agent.handle(sid, "Yes")  # chest pain
    assert service.store.get_disposition(sid).tier == Tier.T1


def test_extraction_negation_and_reported_by_family():
    assert extract_rules("No chest pain, just tired").red_flags == {}
    assert extract_rules("My daughter said I seemed confused last night").red_flags == {"confusion": True}
    ex = extract_rules("This morning I suddenly felt dizzy and my left hand feels clumsy")
    assert ex.red_flags.get("sudden_onset") and ex.red_flags.get("one_sided_weakness")
    assert extract_rules("I've felt weak for two days").duration_days == 2


async def test_offer_explains_why_and_can_be_skipped(agent, service):
    sid = service.start_session("mdm_tan").session_id
    agent.open(sid, greet=False)
    agent.handle(sid, "I feel weak.")
    assert await converse(agent, service, sid, SAFE_ANSWERS, until="offer") == "offer"
    offer = [m for m in service.store.messages(sid) if m["data"].get("kind") == "offer"][-1]
    assert "home monitoring" in offer["data"]["why"] and "doctor" in offer["data"]["why"]
    assert [r["value"] for r in offer["data"]["quick_replies"]] == ["do_check", "skip"]
    agent.handle(sid, "Skip", "skip")
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T3 and service.case(sid).measurement_id is None


async def test_safety_questions_in_mandarin_use_button_values(agent, service):
    """Translated labels are never parsed: the rules only see the button values."""
    from wisp.triage.i18n import T

    sid = service.start_session("mdm_tan").session_id
    agent.open(sid, lang="zh", greet=False)
    agent.handle(sid, "I feel weak since yesterday")
    q = [m for m in service.store.messages(sid) if m["data"].get("question") == "onset"][-1]
    assert q["text"] == T["q_onset"]["zh"] and q["data"]["quick_replies"][0]["label"] == T["sudden"]["zh"]
    agent.handle(sid, T["gradual"]["zh"], "gradual")
    agent.handle(sid, T["yes"]["zh"], "yes")  # chest pain
    d = service.store.get_disposition(sid)
    assert d.tier == Tier.T1 and service.case(sid).sensing_locked
    assert any(m["text"] == T["emergency_now"]["zh"] for m in service.store.messages(sid))


def test_every_language_has_every_safety_string():
    from wisp.triage.i18n import LANGUAGES, T

    for key, entry in T.items():
        for lang in LANGUAGES:
            assert entry.get(lang), f"missing {lang} for {key}"
