"""Deterministic emergency red-flag screen.

The language model may *populate* `CaseState.red_flags` from what the patient says,
but it never decides whether something is an emergency. This module does.
"""

from __future__ import annotations

from ..schemas import RED_FLAG_FIELDS, CaseState, RedFlagResult, RuleHit, Tier
from .ranges import symptom_range

# Patient-facing description of each red flag, used in explanations.
RED_FLAG_PHRASES: dict[str, str] = {
    "sudden_onset": "your symptoms started suddenly",
    "chest_pain": "you have chest pain",
    "severe_breathlessness": "you are very short of breath",
    "one_sided_weakness": "you have weakness, numbness or clumsiness on one side",
    "speech_difficulty": "you have new trouble speaking",
    "confusion": "there is new confusion or unusual drowsiness",
    "loss_of_consciousness": "you fainted or blacked out",
    "recent_fall_with_injury": "you fell and were hurt",
    "sudden_vision_change": "you have a sudden change in your eyesight",
}

RED_FLAG_LABELS: dict[str, str] = {
    "sudden_onset": "Sudden onset",
    "chest_pain": "Chest pain",
    "severe_breathlessness": "Severe breathlessness",
    "one_sided_weakness": "One-sided weakness / numbness",
    "speech_difficulty": "Speech difficulty",
    "confusion": "Confusion / drowsiness",
    "loss_of_consciousness": "Fainting / blackout",
    "recent_fall_with_injury": "Fall with injury",
    "sudden_vision_change": "Sudden vision change",
}


def _join(parts: list[str]) -> str:
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def emergency_sentence(flags: list[str]) -> str:
    return f"This needs urgent medical attention now because {_join([RED_FLAG_PHRASES[f] for f in flags])}."


def screen_red_flags(case: CaseState) -> RedFlagResult:
    """Screen the case for emergency warning signs.

    * Any red flag present -> `triggered`, tier T1, sensing must be locked.
    * Every red flag explicitly denied -> `passed`, with the symptom-based care range.
    * Otherwise -> `incomplete` (still asking). "Not sure" answers keep a flag unknown.
    """
    rf = case.red_flags
    triggered = [f for f in RED_FLAG_FIELDS if getattr(rf, f) is True]
    if triggered:
        return RedFlagResult(
            status="triggered",
            passed=False,
            triggered_flags=triggered,
            tier=Tier.T1,
            reasons=[emergency_sentence(triggered)],
            rule_hits=[
                RuleHit(
                    rule_id="RF-1",
                    description=f"Emergency warning sign reported: {', '.join(RED_FLAG_LABELS[f] for f in triggered)}",
                    effect="Tier T1. Physical sensing locked for this session.",
                )
            ],
        )

    missing = [f for f in RED_FLAG_FIELDS if getattr(rf, f) is None]
    uncertain = [f for f in missing if f in case.uncertain_fields]
    if missing:
        return RedFlagResult(status="incomplete", passed=False, missing=missing, uncertain=uncertain)

    rng = symptom_range(case)
    return RedFlagResult(
        status="passed",
        passed=True,
        care_floor=rng.floor,
        care_ceiling=rng.ceiling,
        reasons=["No emergency warning signs reported."],
        rule_hits=[RuleHit(rule_id="RF-0", description="All emergency warning signs denied", effect="Normal assessment may continue")],
    )
