"""Typed data models shared by the rules engine, sensing service, API and MCP tools.

Conventions
-----------
* Tiers are ordered by urgency: T1 (most urgent) .. T4 (least urgent). ABSTAIN is
  separate and is never treated as "less urgent than T3".
* A *care floor* is the least urgent tier the symptoms allow. A *care ceiling* is
  the most urgent tier still reachable without a red flag.
* `None` on a symptom field means "not yet asked / not known". Rules treat unknown
  differently from "no".
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Tier(str, Enum):
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"
    T4 = "T4"
    ABSTAIN = "ABSTAIN"


URGENCY_RANK = {Tier.T1: 1, Tier.T2: 2, Tier.T3: 3, Tier.T4: 4}

TIER_TITLES = {
    Tier.T1: "This needs help now",
    Tier.T2: "Please be seen today",
    Tier.T3: "Book your doctor in the next few days",
    Tier.T4: "You can continue monitoring at home for now",
    Tier.ABSTAIN: "I can't safely judge this from here",
}

TIER_LABELS = {
    Tier.T1: "Emergency",
    Tier.T2: "Same-day care",
    Tier.T3: "Primary care soon",
    Tier.T4: "Self-care with monitoring",
    Tier.ABSTAIN: "Cannot safely assess",
}


def more_urgent(a: Tier, b: Tier) -> Tier:
    """Return the more urgent of two graded tiers (T1..T4)."""
    return a if URGENCY_RANK[a] <= URGENCY_RANK[b] else b


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------- #
# Profile
# --------------------------------------------------------------------------- #


class Caregiver(Strict):
    name: str
    relationship: str
    sharing_enabled: bool = False


class ProviderDetails(Strict):
    """Where the person's usual clinic is. No opening hours or availability: WISP never claims those."""

    address: str | None = Field(default=None, max_length=200)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class UserProfile(Strict):
    user_id: str
    display_name: str
    age: int
    sex: Literal["female", "male", "other"] | None = None
    preferred_language: str = "en"
    lives_alone: bool
    usual_gp: str
    usual_gp_details: ProviderDetails | None = None
    mobility_aid: str | None = None
    normally_stands_unaided: bool
    conditions: list[str] = []
    medications: list[str] = []
    caregiver: Caregiver | None = None


# --------------------------------------------------------------------------- #
# Case state
# --------------------------------------------------------------------------- #

RED_FLAG_FIELDS: tuple[str, ...] = (
    "sudden_onset",
    "chest_pain",
    "severe_breathlessness",
    "one_sided_weakness",
    "speech_difficulty",
    "confusion",
    "loss_of_consciousness",
    "recent_fall_with_injury",
    "sudden_vision_change",
)


class RedFlags(Strict):
    """Emergency warning signs. True = present, False = denied, None = not asked."""

    sudden_onset: bool | None = None
    chest_pain: bool | None = None
    severe_breathlessness: bool | None = None
    one_sided_weakness: bool | None = None
    speech_difficulty: bool | None = None
    confusion: bool | None = None
    loss_of_consciousness: bool | None = None
    recent_fall_with_injury: bool | None = None
    sudden_vision_change: bool | None = None


class Modifiers(Strict):
    """Non-emergency findings that can raise the care floor or ceiling."""

    reduced_intake: bool | None = None  # eating/drinking less than usual
    unable_to_keep_fluids: bool | None = None
    fall_without_injury: bool | None = None
    fever: bool | None = None
    getting_worse: bool | None = None


ComplaintCategory = Literal["functional", "out_of_scope", "unknown"]
FunctionalStatus = Literal[
    "not_considered",
    "not_needed",  # sensing could not change the tier
    "no_baseline",
    "declined",  # patient chose not to try (not due to unsteadiness)
    "unsteady",  # patient normally stands but does not feel safe now
    "not_eligible",
    "awaiting_patient",
    "measuring",
    "measured",
    "unreliable",  # measurement rejected (multi-person, low confidence, tool failure)
    "stopped_early",  # patient stopped mid-test because of symptoms
]
SensingState = Literal["OFF", "ACTIVE", "COMPLETE", "LOCKED"]


class CaseState(Strict):
    session_id: str
    user_id: str
    created_at: datetime = Field(default_factory=utcnow)
    previous_session_id: str | None = None

    complaint_text: str | None = None
    complaint_summary: str | None = None
    complaint_category: ComplaintCategory = "unknown"
    onset: Literal["sudden", "gradual"] | None = None
    duration_days: float | None = None

    red_flags: RedFlags = Field(default_factory=RedFlags)
    modifiers: Modifiers = Field(default_factory=Modifiers)

    # Fields the patient was unsure about ("not sure") on safety-critical questions.
    uncertain_fields: list[str] = []
    contradictions: list[str] = []

    feels_safe_to_stand: bool | None = None
    others_present: bool | None = None  # self-report: someone else moving nearby
    arms_used: bool | None = None  # self-report after the test

    functional_status: FunctionalStatus = "not_considered"
    sensing_state: SensingState = "OFF"
    sensing_locked: bool = False
    measurement_id: str | None = None
    comparison: "BaselineComparison | None" = None

    finished: bool = False


# --------------------------------------------------------------------------- #
# Rule outputs
# --------------------------------------------------------------------------- #


class RuleHit(Strict):
    rule_id: str
    description: str
    effect: str


class RedFlagResult(Strict):
    status: Literal["passed", "triggered", "incomplete"]
    passed: bool
    triggered_flags: list[str] = []
    missing: list[str] = []
    uncertain: list[str] = []
    tier: Tier | None = None
    care_floor: Tier | None = None
    care_ceiling: Tier | None = None
    reasons: list[str] = []
    rule_hits: list[RuleHit] = []


class EligibilityCheck(Strict):
    name: str
    passed: bool | None
    detail: str


class AssessmentEligibility(Strict):
    allowed: bool
    reason: str
    checks: list[EligibilityCheck]
    grant_id: str | None = None
    grant_expires_at: datetime | None = None


# --------------------------------------------------------------------------- #
# Sensing
# --------------------------------------------------------------------------- #


class FunctionalAssessment(Strict):
    """Structured physical-function result. Raw CSI is never part of this object."""

    measurement_id: str
    session_id: str
    assessment: Literal["5xSTS"] = "5xSTS"
    success: bool
    reason: str | None = None  # failure reason, e.g. multiple_people_detected
    total_time_seconds: float | None = None
    rise_count: int | None = None
    per_rise_seconds: list[float] = []
    arms_used: bool | None = None
    arms_used_source: Literal["self_report", "not_recorded"] = "not_recorded"
    single_person_confidence: float
    measurement_confidence: float
    source: str
    provider_mode: Literal["live", "recorded", "synthetic_recorded"]
    recording_id: str | None = None
    timestamp: datetime
    verified: bool = False
    signature: str | None = None


class Baseline(Strict):
    user_id: str
    assessment: Literal["5xSTS"] = "5xSTS"
    sessions: list[dict]
    median_time: float
    usual_min: float
    usual_max: float
    arms_used_normally: bool
    created_at: datetime
    last_updated: datetime


ComparisonStatus = Literal[
    "within_usual_range",
    "faster_than_usual",
    "slower_than_usual",
    "unable_to_compare",
    "measurement_unreliable",
]


class BaselineComparison(Strict):
    status: ComparisonStatus
    severity: Literal["none", "mild", "clear"] | None
    confidence: Literal["high", "medium", "low"]
    label: str  # patient-facing semantic label
    explanation: str
    new_arm_use: bool = False


# --------------------------------------------------------------------------- #
# Disposition
# --------------------------------------------------------------------------- #


class CareAction(Strict):
    kind: Literal["call_995", "emergency_department", "gp_today", "gp_soon", "home_monitoring", "speak_to_professional"]
    label: str
    detail: str


class ReassessmentPlan(Strict):
    session_id: str
    user_id: str
    due_at: datetime
    reason: str


class CareDisposition(Strict):
    tier: Tier
    label: str
    title: str
    confidence: Literal["high", "medium", "low"]
    reasons: list[str]
    action: str
    timeframe: str
    actions: list[CareAction]
    worsening_signs: list[str]
    escalation: str
    self_care: list[str] = []
    recheck: ReassessmentPlan | None = None
    symptom_floor: Tier | None = None
    functional_tier: Tier | None = None
    decided_by: Literal["deterministic_rules"] = "deterministic_rules"
    rule_hits: list[RuleHit] = []
    sensing_used: bool = False


# --------------------------------------------------------------------------- #
# Audit / trace
# --------------------------------------------------------------------------- #

Actor = Literal["patient", "workbuddy", "local_agent", "rule_engine", "sensing", "system"]


class AuditEvent(Strict):
    id: int | None = None
    timestamp: datetime = Field(default_factory=utcnow)
    session_id: str
    actor: Actor
    event: str
    tool: str | None = None
    result: str | None = None
    data: dict = {}


class DecisionTrace(Strict):
    session_id: str
    current_concern: str | None
    safety_screen: RedFlagResult
    possible_range: dict | None
    missing_information: list[str]
    available_actions: list[str]
    selected_action: str | None
    why: str | None
    tool_calls: list[dict]
    functional_result: dict | None
    comparison: BaselineComparison | None
    decision_impact: str | None
    disposition: CareDisposition | None
    previous: dict | None
    events: list[AuditEvent]


class CaregiverShareConsent(Strict):
    session_id: str
    caregiver_name: str
    consented: bool
    consented_at: datetime | None = None
    summary: str
    delivered: Literal["simulated"] = "simulated"


CaseState.model_rebuild()
