"""Registry of physical-function assessment modules.

Each module describes what it needs, how its measurements are quality-checked, and
what it cannot tell you. Only modules that are implemented and tested belong here:
`run_functional_assessment` refuses any assessment not listed. Adding a module means
adding a provider path for it, quality checks in the pipeline, baseline support, and
tests, then registering it here.

The safety rules do not read this registry. Whether an assessment may run is decided
by `rules/eligibility.py`, and how a result changes care by `rules/care_tier.py`.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AssessmentModule:
    id: str
    name: str
    patient_name: str  # how the patient screens refer to it
    duration_seconds: int  # rough length, for patient guidance
    hardware: tuple[str, ...]
    eligibility: tuple[str, ...]  # conditions checked by rules/eligibility.py before it may run
    quality_checks: tuple[str, ...]  # a failing check discards the measurement
    baseline: str
    output: tuple[str, ...]
    limitations: tuple[str, ...]
    validation_status: str
    patient_available: bool = True
    notes: tuple[str, ...] = field(default=())


FIVE_X_STS = AssessmentModule(
    id="5xSTS",
    name="Five-times sit-to-stand (5xSTS)",
    patient_name="Quick movement check",
    duration_seconds=30,
    hardware=(
        "Two ESP32 boards on a dedicated Wi-Fi link (live mode), or a recorded CSI session (replay mode)",
        "A sturdy chair without wheels, against a wall",
    ),
    eligibility=(
        "Red-flag screen passed and sensing not locked for the session",
        "Complaint is about physical function",
        "Patient normally stands unaided and feels steady enough today",
        "Patient reports being alone in the sensing area",
        "A sensing provider is available",
        "A personal baseline is on file",
        "A measurement could change the care tier (symptom floor differs from ceiling)",
    ),
    quality_checks=(
        "Single-person check: the measurement is discarded if another person appears to be moving (multiple_people_detected)",
        "Exactly five rises must be found (expected_5_rises_found_N otherwise)",
        "Measurement confidence must reach 0.6 (low_measurement_confidence otherwise)",
        "The patient can stop at any time; a stopped check is never used as a measurement",
    ),
    baseline="Three healthy-day checks; today's time is compared with the person's own usual range",
    output=(
        "Total time for five rises and per-rise times (engineering views only)",
        "Patient-facing label: within usual, a little slower, slower than usual, or not usable",
        "Whether the arms were used (self-reported)",
    ),
    limitations=(
        "Measures how quickly someone rises from a chair; it does not explain why, and it is not a diagnosis",
        "A normal result never lowers urgency set by symptoms, and never rules out serious illness",
        "Automatic detection of a second person is experimental; the patient is also asked directly",
        "Thresholds are prototype values and have not been clinically validated",
    ),
    validation_status=(
        "Prototype. Timing accuracy is evaluated on synthetic CSI only (evaluation/results/report.md); "
        "no real-participant trials are recorded yet, and it is not clinically validated."
    ),
)

ASSESSMENTS: dict[str, AssessmentModule] = {m.id: m for m in (FIVE_X_STS,)}


def get_assessment(assessment_id: str) -> AssessmentModule | None:
    return ASSESSMENTS.get(assessment_id)
