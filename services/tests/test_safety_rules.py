"""Deterministic safety rules: red flags, ranges, eligibility, care tiers, asymmetric rule."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from conftest import all_denied, make_case
from wisp.baseline.compare import compare_to_baseline
from wisp.rules.care_tier import decide_care_tier
from wisp.rules.eligibility import check_assessment_eligibility
from wisp.rules.red_flags import screen_red_flags
from wisp.schemas import RED_FLAG_FIELDS, Baseline, BaselineComparison, FunctionalAssessment, Modifiers, RedFlags, Tier

NOW = datetime(2026, 10, 4, 9, 0, tzinfo=timezone.utc)

WITHIN = BaselineComparison(status="within_usual_range", severity="none", confidence="high", label="Within your usual range", explanation="")
CLEAR = BaselineComparison(status="slower_than_usual", severity="clear", confidence="high", label="Clearly slower", explanation="")
MILD = BaselineComparison(status="slower_than_usual", severity="mild", confidence="high", label="Mildly slower", explanation="")
UNRELIABLE = BaselineComparison(status="measurement_unreliable", severity=None, confidence="low", label="Measurement unreliable", explanation="")
NO_BASELINE = BaselineComparison(status="unable_to_compare", severity=None, confidence="low", label="Unable to compare", explanation="")


def baseline(n=3, arms=False) -> Baseline:
    return Baseline(
        user_id="mdm_tan", sessions=[{"total_time_seconds": t} for t in (11.2, 11.8, 12.4)[:n]], median_time=11.8,
        usual_min=11.2, usual_max=12.4, arms_used_normally=arms, created_at=NOW, last_updated=NOW,
    )


def measurement(total=12.0, success=True, conf=0.95, single=0.97, arms=False, verified=True, reason=None) -> FunctionalAssessment:
    return FunctionalAssessment(
        measurement_id="m_x", session_id="s_test", success=success, reason=reason, total_time_seconds=total if success else None,
        rise_count=5, per_rise_seconds=[], arms_used=arms, single_person_confidence=single, measurement_confidence=conf,
        source="test", provider_mode="recorded", timestamp=NOW, verified=verified,
    )


# --------------------------------------------------------------------------- red flags
@pytest.mark.parametrize("flag", RED_FLAG_FIELDS)
def test_every_red_flag_triggers_t1(flag, profile):
    case = make_case(red_flags=all_denied(**{flag: True}))
    rf = screen_red_flags(case)
    assert rf.status == "triggered" and rf.tier == Tier.T1 and rf.triggered_flags == [flag]
    assert decide_care_tier(case, profile, WITHIN, now=NOW).tier == Tier.T1


def test_screen_incomplete_until_every_flag_answered():
    rf = screen_red_flags(make_case(red_flags=RedFlags(chest_pain=False)))
    assert rf.status == "incomplete" and not rf.passed and "confusion" in rf.missing


def test_emergency_explanation_names_symptoms():
    rf = screen_red_flags(make_case(red_flags=all_denied(sudden_onset=True, one_sided_weakness=True)))
    assert "started suddenly" in rf.reasons[0] and "one side" in rf.reasons[0]


def test_passed_screen_returns_range():
    rf = screen_red_flags(make_case())
    assert rf.passed and rf.care_floor == Tier.T4 and rf.care_ceiling == Tier.T3


# --------------------------------------------------------------------------- eligibility
def test_red_flag_blocks_eligibility(profile):
    el = check_assessment_eligibility(make_case(red_flags=all_denied(confusion=True)), profile, baseline_available=True, sensor_available=True)
    assert not el.allowed and "Emergency" in el.reason


def test_eligibility_requires_patient_feels_safe(profile):
    el = check_assessment_eligibility(make_case(feels_safe_to_stand=None), profile, baseline_available=True, sensor_available=True)
    assert not el.allowed


def test_eligibility_refuses_when_test_cannot_change_tier(profile):
    case = make_case(modifiers=Modifiers(unable_to_keep_fluids=True))
    el = check_assessment_eligibility(case, profile, baseline_available=True, sensor_available=True)
    assert not el.allowed
    assert next(c for c in el.checks if c.name == "could_change_tier").passed is False


def test_eligibility_refuses_other_people_present(profile):
    el = check_assessment_eligibility(make_case(others_present=True), profile, baseline_available=True, sensor_available=True)
    assert not el.allowed


def test_eligibility_refuses_non_functional_complaint(profile):
    el = check_assessment_eligibility(make_case(complaint_category="out_of_scope"), profile, baseline_available=True, sensor_available=True)
    assert not el.allowed


def test_eligibility_allows_full_happy_path(profile):
    el = check_assessment_eligibility(make_case(), profile, baseline_available=True, sensor_available=True)
    assert el.allowed and "T4" in el.reason and "T3" in el.reason


# --------------------------------------------------------------------------- asymmetric urgency rule
def test_normal_sensor_cannot_lower_T2(profile):
    case = make_case(modifiers=Modifiers(unable_to_keep_fluids=True))
    d = decide_care_tier(case, profile, WITHIN, now=NOW)
    assert d.tier == Tier.T2
    case2 = make_case(feels_safe_to_stand=False)
    assert decide_care_tier(case2, profile, WITHIN, now=NOW).tier == Tier.T2


def test_normal_sensor_cannot_lower_T3_floor(profile):
    case = make_case(modifiers=Modifiers(reduced_intake=True))
    d = decide_care_tier(case, profile, WITHIN, now=NOW)
    assert d.tier == Tier.T3


def test_sensing_can_raise_urgency(profile):
    case = make_case(modifiers=Modifiers(reduced_intake=True))
    d = decide_care_tier(case, profile, CLEAR, now=NOW)
    assert d.tier == Tier.T2 and d.sensing_used
    assert any(h.rule_id == "FN-3b" for h in d.rule_hits)


@pytest.mark.parametrize("comparison", [WITHIN, MILD, CLEAR, UNRELIABLE, NO_BASELINE, None])
@pytest.mark.parametrize("mods", [Modifiers(), Modifiers(reduced_intake=True), Modifiers(unable_to_keep_fluids=True), Modifiers(fever=True, getting_worse=True)])
def test_final_tier_never_less_urgent_than_symptom_floor(profile, comparison, mods):
    from wisp.rules.ranges import symptom_range
    from wisp.schemas import URGENCY_RANK

    case = make_case(modifiers=mods)
    floor = symptom_range(case).floor
    d = decide_care_tier(case, profile, comparison, now=NOW)
    if d.tier != Tier.ABSTAIN:
        assert URGENCY_RANK[d.tier] <= URGENCY_RANK[floor]
    assert d.tier != Tier.T4 or comparison in (WITHIN,)


def test_self_care_only_with_reliable_normal_measurement(profile):
    assert decide_care_tier(make_case(), profile, WITHIN, now=NOW).tier == Tier.T4
    assert decide_care_tier(make_case(), profile, None, now=NOW).tier == Tier.T3


def test_t4_includes_recheck_and_self_care(profile):
    d = decide_care_tier(make_case(), profile, WITHIN, now=NOW)
    assert d.recheck is not None and d.self_care and d.worsening_signs
    assert d.recheck.due_at.hour == 10


# --------------------------------------------------------------------------- abstention
def test_low_sensor_confidence_abstains(profile):
    cmp = compare_to_baseline(measurement(conf=0.4), baseline())
    assert cmp.status == "measurement_unreliable"
    d = decide_care_tier(make_case(), profile, cmp, now=NOW)
    assert d.tier == Tier.ABSTAIN


def test_multiple_people_invalidates_measurement(profile):
    cmp = compare_to_baseline(measurement(success=False, reason="multiple_people_detected", single=0.31), baseline())
    assert cmp.status == "measurement_unreliable"
    assert decide_care_tier(make_case(), profile, cmp, now=NOW).tier == Tier.ABSTAIN


def test_unreliable_measurement_never_lowers_symptom_floor(profile):
    case = make_case(modifiers=Modifiers(unable_to_keep_fluids=True))
    assert decide_care_tier(case, profile, UNRELIABLE, now=NOW).tier == Tier.T2


def test_missing_baseline_cannot_support_self_care(profile):
    cmp = compare_to_baseline(measurement(total=11.0), None)
    assert cmp.status == "unable_to_compare"
    assert decide_care_tier(make_case(), profile, cmp, now=NOW).tier == Tier.T3
    cmp2 = compare_to_baseline(measurement(total=11.0), baseline(n=2))
    assert cmp2.status == "unable_to_compare"


def test_uncertain_red_flag_answers_abstain(profile):
    case = make_case(red_flags=all_denied(confusion=None), uncertain_fields=["confusion"])
    d = decide_care_tier(case, profile, WITHIN, now=NOW)
    assert d.tier == Tier.ABSTAIN and "confusion" in d.reasons[-1]


def test_contradictions_abstain(profile):
    assert decide_care_tier(make_case(contradictions=["x"]), profile, WITHIN, now=NOW).tier == Tier.ABSTAIN


def test_out_of_scope_abstains(profile):
    assert decide_care_tier(make_case(complaint_category="out_of_scope"), profile, None, now=NOW).tier == Tier.ABSTAIN


def test_profile_not_standing_unaided_abstains(profile):
    p = profile.model_copy(update={"normally_stands_unaided": False})
    assert decide_care_tier(make_case(), p, None, now=NOW).tier == Tier.ABSTAIN


def test_abstain_never_routes_to_self_care(profile):
    for cmp in (UNRELIABLE,):
        d = decide_care_tier(make_case(), profile, cmp, now=NOW)
        assert d.tier == Tier.ABSTAIN and d.recheck is None and not d.self_care


def test_stopped_early_is_same_day(profile):
    assert decide_care_tier(make_case(functional_status="stopped_early"), profile, None, now=NOW).tier == Tier.T2


def test_new_red_flag_overrides_previous_normal_measurement(profile):
    # Day 1: normal result -> T4. Day 2: new confusion with the same normal comparison -> T1.
    assert decide_care_tier(make_case(), profile, WITHIN, now=NOW).tier == Tier.T4
    day2 = make_case(red_flags=all_denied(confusion=True), comparison=WITHIN)
    assert decide_care_tier(day2, profile, WITHIN, now=NOW).tier == Tier.T1


# --------------------------------------------------------------------------- baseline comparison
def test_compare_within_and_slower():
    assert compare_to_baseline(measurement(total=12.0), baseline()).status == "within_usual_range"
    mild = compare_to_baseline(measurement(total=13.5), baseline())
    assert mild.status == "slower_than_usual" and mild.severity == "mild"
    clear = compare_to_baseline(measurement(total=16.8), baseline())
    assert clear.severity == "clear" and "%" not in clear.label


def test_new_arm_use_makes_change_clear():
    c = compare_to_baseline(measurement(total=12.2, arms=True), baseline(arms=False))
    assert c.status == "slower_than_usual" and c.severity == "clear" and c.new_arm_use


def test_unverified_measurement_rejected():
    assert compare_to_baseline(measurement(verified=False), baseline()).status == "measurement_unreliable"
