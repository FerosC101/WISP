"""Deterministic gate in front of `run_functional_assessment`.

Physical sensing is only authorised when every check passes. A passing check
produces a short-lived grant that the sensing tool requires, so the agent cannot
skip this step.
"""

from __future__ import annotations

from ..schemas import AssessmentEligibility, CaseState, EligibilityCheck, UserProfile
from .ranges import symptom_range
from .red_flags import screen_red_flags


def check_assessment_eligibility(
    case: CaseState,
    profile: UserProfile,
    *,
    baseline_available: bool,
    sensor_available: bool,
) -> AssessmentEligibility:
    rf = screen_red_flags(case)
    checks: list[EligibilityCheck] = []

    def add(name: str, passed: bool | None, detail: str) -> None:
        checks.append(EligibilityCheck(name=name, passed=passed, detail=detail))

    add(
        "red_flag_screen_passed",
        rf.passed,
        {
            "passed": "No emergency warning signs.",
            "triggered": "Emergency warning sign already determines the care recommendation.",
            "incomplete": "Safety questions are not finished yet.",
        }[rf.status],
    )
    add("sensing_not_locked", not case.sensing_locked, "Sensing is locked for this session." if case.sensing_locked else "Sensing is available in this session.")
    add(
        "complaint_is_functional",
        case.complaint_category == "functional",
        "Complaint relates to physical function." if case.complaint_category == "functional" else "Complaint is not about physical function.",
    )
    add(
        "patient_normally_stands_unaided",
        profile.normally_stands_unaided,
        "Profile: normally rises from a chair without help." if profile.normally_stands_unaided else "Profile: does not normally stand unaided.",
    )
    add(
        "patient_currently_feels_safe",
        case.feels_safe_to_stand,
        {True: "Patient feels steady enough to try.", False: "Patient does not feel steady enough today.", None: "Not asked yet."}[case.feels_safe_to_stand],
    )
    add(
        "single_person_present",
        None if case.others_present is None else not case.others_present,
        {True: "Someone else is moving nearby.", False: "Patient reports being alone in the area.", None: "Not asked yet."}[case.others_present],
    )
    add("sensor_available", sensor_available, "A permitted sensing provider is available." if sensor_available else "No sensing provider is available.")
    add("baseline_available", baseline_available, "Personal baseline on file." if baseline_available else "No personal baseline, so a result could not be compared.")

    could_change = False
    if rf.passed:
        rng = symptom_range(case)
        could_change = rng.floor != rng.ceiling
        add(
            "could_change_tier",
            could_change,
            f"Functional change could distinguish {rng.floor.value} from {rng.ceiling.value}."
            if could_change
            else f"Symptoms already fix the recommendation at {rng.floor.value}; a measurement cannot change it.",
        )
    else:
        add("could_change_tier", False, "Not evaluated until the safety screen passes.")

    failed = [c for c in checks if c.passed is not True]
    if not failed:
        return AssessmentEligibility(allowed=True, reason=next(c.detail for c in checks if c.name == "could_change_tier"), checks=checks)
    # First failing check (in priority order) explains the refusal.
    return AssessmentEligibility(allowed=False, reason=failed[0].detail, checks=checks)
