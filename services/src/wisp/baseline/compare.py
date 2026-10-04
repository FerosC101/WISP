"""Compare a 5xSTS result against the person's own baseline.

Returns semantic labels only. The difference is never turned into a diagnosis or a
percentage for the patient.
"""

from __future__ import annotations

import statistics

from ..schemas import Baseline, BaselineComparison, FunctionalAssessment

MIN_BASELINE_SESSIONS = 3
MIN_MEASUREMENT_CONFIDENCE = 0.6
MIN_SINGLE_PERSON_CONFIDENCE = 0.8


def summarise_baseline(user_id: str, sessions: list[dict], arms_used_normally: bool, created_at, last_updated) -> Baseline:
    times = [s["total_time_seconds"] for s in sessions]
    return Baseline(
        user_id=user_id,
        sessions=sessions,
        median_time=round(statistics.median(times), 2),
        usual_min=round(min(times), 2),
        usual_max=round(max(times), 2),
        arms_used_normally=arms_used_normally,
        created_at=created_at,
        last_updated=last_updated,
    )


def _confidence(c: float) -> str:
    return "high" if c >= 0.85 else "medium" if c >= 0.7 else "low"


def compare_to_baseline(result: FunctionalAssessment | None, baseline: Baseline | None) -> BaselineComparison:
    if result is None or not result.success or not result.verified:
        reason = result.reason if result is not None and result.reason else "no verified measurement"
        return BaselineComparison(
            status="measurement_unreliable",
            severity=None,
            confidence="low",
            label="Measurement unreliable",
            explanation=f"The measurement cannot be used ({reason.replace('_', ' ')}).",
        )
    if result.measurement_confidence < MIN_MEASUREMENT_CONFIDENCE or result.single_person_confidence < MIN_SINGLE_PERSON_CONFIDENCE:
        return BaselineComparison(
            status="measurement_unreliable",
            severity=None,
            confidence="low",
            label="Measurement unreliable",
            explanation=(
                f"Sensing confidence was too low to trust (measurement {result.measurement_confidence:.2f}, "
                f"single person {result.single_person_confidence:.2f})."
            ),
        )
    if baseline is None or len(baseline.sessions) < MIN_BASELINE_SESSIONS:
        return BaselineComparison(
            status="unable_to_compare",
            severity=None,
            confidence="low",
            label="Unable to compare",
            explanation=f"A personal baseline needs at least {MIN_BASELINE_SESSIONS} recorded well-day sessions.",
        )

    t = result.total_time_seconds or 0.0
    tolerance = max(0.5, 0.05 * baseline.median_time)  # measurement noise allowance
    new_arm_use = bool(result.arms_used) and not baseline.arms_used_normally
    conf = _confidence(result.measurement_confidence)

    if t <= baseline.usual_max + tolerance and not new_arm_use:
        if t < baseline.usual_min - tolerance:
            return BaselineComparison(
                status="faster_than_usual",
                severity="none",
                confidence=conf,
                label="Within or quicker than your usual range",
                explanation="The total time was quicker than this user's usual recorded range.",
            )
        return BaselineComparison(
            status="within_usual_range",
            severity="none",
            confidence=conf,
            label="Within your usual range",
            explanation="The total time was inside this user's usual recorded range.",
        )

    excess = t - baseline.usual_max
    clear = excess > max(1.5, 0.12 * baseline.median_time) or new_arm_use
    parts = []
    if excess > tolerance:
        parts.append("The total time was outside this user's usual recorded range")
    if new_arm_use:
        parts.append("the user required arm support not normally used")
    explanation = (" and ".join(parts) + ".") if parts else "Slower than usual."
    explanation = explanation[0].upper() + explanation[1:]
    return BaselineComparison(
        status="slower_than_usual",
        severity="clear" if clear else "mild",
        confidence=conf,
        label="Clearly slower than usual" if clear else "Mildly slower than usual",
        explanation=explanation,
        new_arm_use=new_arm_use,
    )
