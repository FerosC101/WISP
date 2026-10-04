"""Symptom-based care range (floor and ceiling) for cases that passed the red-flag screen.

floor   = least urgent tier the symptoms allow (the safety floor)
ceiling = most urgent tier reachable from these symptoms plus a functional finding

Rule table (documented in docs/safety.md):

  SR-1  Unable to keep fluids down                    floor T2
  SR-2  Patient normally stands but feels unsteady    floor T2
  SR-3  Any concerning modifier (eating/drinking less, fall without injury,
        fever, getting worse, symptoms >= 7 days)      floor T3, ceiling T2
  SR-0  No modifiers                                  floor T4, ceiling T3
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..schemas import CaseState, RuleHit, Tier

MODIFIER_PHRASES = {
    "reduced_intake": "You've been eating or drinking less than usual.",
    "fall_without_injury": "You had a fall recently.",
    "fever": "You have a fever.",
    "getting_worse": "Your symptoms have been getting worse.",
    "persistent": "You've felt this way for a week or more.",
}


@dataclass
class SymptomRange:
    floor: Tier
    ceiling: Tier
    concerning: list[str] = field(default_factory=list)  # modifier keys present
    reasons: list[str] = field(default_factory=list)  # patient-facing
    rule_hits: list[RuleHit] = field(default_factory=list)


def concerning_modifiers(case: CaseState) -> list[str]:
    m = case.modifiers
    present = [k for k in ("reduced_intake", "fall_without_injury", "fever", "getting_worse") if getattr(m, k) is True]
    if case.duration_days is not None and case.duration_days >= 7:
        present.append("persistent")
    return present


def symptom_range(case: CaseState) -> SymptomRange:
    concerning = concerning_modifiers(case)
    reasons = [MODIFIER_PHRASES[k] for k in concerning]

    if case.modifiers.unable_to_keep_fluids:
        return SymptomRange(
            Tier.T2,
            Tier.T2,
            concerning,
            ["You haven't been able to keep fluids down.", *reasons],
            [RuleHit(rule_id="SR-1", description="Unable to keep fluids down", effect="Symptom floor T2")],
        )

    if case.feels_safe_to_stand is False:
        return SymptomRange(
            Tier.T2,
            Tier.T2,
            concerning,
            ["You normally get up on your own, but today you don't feel steady enough to stand safely.", *reasons],
            [RuleHit(rule_id="SR-2", description="Normally stands unaided but feels unsteady now", effect="Symptom floor T2")],
        )

    if concerning:
        return SymptomRange(
            Tier.T3,
            Tier.T2,
            concerning,
            reasons,
            [RuleHit(rule_id="SR-3", description=f"Concerning non-emergency finding(s): {', '.join(concerning)}", effect="Symptom floor T3, ceiling T2")],
        )

    return SymptomRange(
        Tier.T4,
        Tier.T3,
        [],
        [],
        [RuleHit(rule_id="SR-0", description="No concerning non-emergency findings", effect="Symptom range T4–T3")],
    )
