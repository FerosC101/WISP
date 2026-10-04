"""Tool ordering, session binding and anti-fabrication guarantees."""

from __future__ import annotations

import asyncio

import pytest

from wisp.schemas import Tier
from wisp.service import CaseFacts, ToolError

ALL_DENIED = {f: False for f in (
    "sudden_onset", "chest_pain", "severe_breathlessness", "one_sided_weakness", "speech_difficulty",
    "confusion", "loss_of_consciousness", "recent_fall_with_injury", "sudden_vision_change",
)}


def setup_case(service, user="mdm_tan", **extra):
    case = service.start_session(user, agent="workbuddy")
    facts = dict(complaint_text="I feel weak", complaint_summary="weaker than usual", complaint_category="functional",
                 onset="gradual", duration_days=2, red_flags=ALL_DENIED, modifiers={"reduced_intake": True},
                 feels_safe_to_stand=True, others_present=False)
    facts.update(extra)
    service.record_case_facts(case.session_id, CaseFacts(**facts), "workbuddy")
    return case.session_id


async def run_check(service, sid, grant):
    task = asyncio.create_task(service.run_functional_assessment(sid, "workbuddy", grant_id=grant))
    for _ in range(100):
        await asyncio.sleep(0.01)
        if sid in service._ready:
            break
    service.patient_ready(sid)
    return await task


async def test_no_sensing_before_red_flag_pass(service):
    case = service.start_session("mdm_tan", agent="workbuddy")
    service.record_case_facts(case.session_id, CaseFacts(complaint_text="weak", complaint_category="functional"), "workbuddy")
    el = service.check_assessment_eligibility(case.session_id, "workbuddy")
    assert not el.allowed and el.grant_id is None
    with pytest.raises(ToolError) as e:
        await service.run_functional_assessment(case.session_id, "workbuddy", grant_id=None)
    assert e.value.code == "order_violation"
    events = [ev.result for ev in service.store.audit(case.session_id) if ev.tool == "run_functional_assessment"]
    assert events == ["refused_screen"]


async def test_sensing_requires_grant(service):
    sid = setup_case(service)
    with pytest.raises(ToolError) as e:
        await service.run_functional_assessment(sid, "workbuddy", grant_id="g_forged")
    assert e.value.code == "order_violation"


async def test_grant_is_single_use_and_session_bound(service):
    sid = setup_case(service)
    other = setup_case(service, user="mdm_siti")
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    with pytest.raises(ToolError):
        await service.run_functional_assessment(other, "workbuddy", grant_id=grant)
    result = await run_check(service, sid, grant)
    assert result["success"]
    with pytest.raises(ToolError):
        await service.run_functional_assessment(sid, "workbuddy", grant_id=grant)


async def test_red_flag_locks_sensor(service):
    sid = setup_case(service)
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    assert grant
    service.record_case_facts(sid, CaseFacts(red_flags={"chest_pain": True}), "workbuddy")
    case = service.case(sid)
    assert case.sensing_locked and case.sensing_state == "LOCKED"
    with pytest.raises(ToolError) as e:
        await service.run_functional_assessment(sid, "workbuddy", grant_id=grant)
    assert e.value.code == "sensing_locked"
    assert not service.check_assessment_eligibility(sid, "workbuddy").allowed


async def test_red_flag_cannot_be_withdrawn(service):
    sid = setup_case(service, red_flags={**ALL_DENIED, "confusion": True})
    service.record_case_facts(sid, CaseFacts(red_flags={"confusion": False}), "workbuddy")
    case = service.case(sid)
    assert case.red_flags.confusion is True and case.sensing_locked
    assert service.decide_care_tier(sid, "workbuddy").tier == Tier.T1


async def test_agent_cannot_fabricate_measurement(service):
    sid = setup_case(service)
    with pytest.raises(ToolError) as e:
        service.compare_to_baseline(sid, "workbuddy", measurement_id="m_fake")
    assert e.value.code == "unverified_measurement"
    with pytest.raises(Exception):
        CaseFacts(functional_status="measured")  # agents cannot mark a session as measured
    with pytest.raises(Exception):
        CaseFacts(total_time_seconds=9.0)  # unknown fields rejected


async def test_measurement_from_other_session_rejected(service):
    sid = setup_case(service)
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    res = await run_check(service, sid, grant)
    other = setup_case(service, user="mdm_siti")
    with pytest.raises(ToolError):
        service.compare_to_baseline(other, "workbuddy", measurement_id=res["measurement_id"])


async def test_tampered_measurement_fails_verification(service):
    sid = setup_case(service)
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    res = await run_check(service, sid, grant)
    row = service.store._one("SELECT json FROM measurements WHERE measurement_id=?", (res["measurement_id"],))
    tampered = row["json"].replace('"total_time_seconds":15.', '"total_time_seconds":11.')
    service.store._exec("UPDATE measurements SET json=? WHERE measurement_id=?", (tampered, res["measurement_id"]))
    assert service.store.get_measurement(res["measurement_id"], sid).verified is False
    with pytest.raises(ToolError):
        service.decide_care_tier(sid, "workbuddy")


async def test_measurement_carries_provenance(service):
    sid = setup_case(service)
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    res = await run_check(service, sid, grant)
    for k in ("source", "timestamp", "measurement_confidence", "session_id"):
        assert res[k] is not None
    assert res["session_id"] == sid and res["verified"] is True
    assert "csi" not in str(res).lower().replace("wisp-synthetic-csi", "")


async def test_multiple_people_measurement_end_to_end(service, provider):
    sid = setup_case(service, modifiers={})
    provider.next_override = "tan_interference"
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    res = await run_check(service, sid, grant)
    assert res["success"] is False and res["reason"] == "multiple_people_detected"
    service.compare_to_baseline(sid, "workbuddy")
    assert service.decide_care_tier(sid, "workbuddy").tier == Tier.ABSTAIN


async def test_sensor_failure_degrades_not_crashes(service, provider):
    sid = setup_case(service, modifiers={})
    provider.next_override = "does_not_exist"
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    res = await run_check(service, sid, grant)
    assert res["success"] is False and res["reason"] == "tool_failure"
    service.compare_to_baseline(sid, "workbuddy")
    assert service.decide_care_tier(sid, "workbuddy").tier == Tier.ABSTAIN


async def test_audit_log_records_ordering(service):
    sid = setup_case(service)
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    await run_check(service, sid, grant)
    service.compare_to_baseline(sid, "workbuddy")
    service.decide_care_tier(sid, "workbuddy")
    names = [e.event for e in service.store.audit(sid)]
    first = {n: names.index(n) for n in ("red_flag_screen", "assessment_selected", "measurement_complete", "care_tier_decided")}
    assert first["red_flag_screen"] < first["assessment_selected"] < first["measurement_complete"] < first["care_tier_decided"]
