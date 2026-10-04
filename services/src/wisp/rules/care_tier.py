"""Deterministic care-tier engine.

Safety invariants (enforced here, tested in tests/test_safety_rules.py):

  SAFE-1  Physical sensing may increase urgency but never lowers it below the
          symptom-based floor:  final = more_urgent(symptom_floor, functional_tier).
  SAFE-2  Any red flag -> T1, regardless of any measurement (current or previous).
  SAFE-3  An unreliable / rejected measurement is never used; it never yields T4.
  SAFE-4  Self-care (T4) requires a verified, reliable measurement within the
          person's usual range. Without functional evidence the floor is T3.
  SAFE-5  Abstention never routes to self-care.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from ..schemas import (
    TIER_LABELS,
    TIER_TITLES,
    URGENCY_RANK,
    BaselineComparison,
    CareAction,
    CareDisposition,
    CaseState,
    ReassessmentPlan,
    RuleHit,
    Tier,
    UserProfile,
    more_urgent,
)
from .ranges import symptom_range
from .red_flags import screen_red_flags

SGT = ZoneInfo("Asia/Singapore")

EMERGENCY_SIGNS = [
    "Sudden weakness, numbness or droop on one side of the face or body",
    "New confusion or unusual drowsiness",
    "Chest pain",
    "Severe breathlessness",
    "Fainting or blacking out",
    "A fall where you are hurt or hit your head",
]

ACTIONS: dict[Tier, list[CareAction]] = {
    Tier.T1: [
        CareAction(kind="call_995", label="Call 995", detail="Singapore emergency ambulance (SCDF). Free for emergencies."),
        CareAction(kind="emergency_department", label="Nearest A&E", detail="Go to the nearest hospital Emergency Department if you can get there quickly and safely."),
    ],
    Tier.T2: [CareAction(kind="gp_today", label="GP or polyclinic today", detail="See your regular GP or a polyclinic today. If none is available, go to an A&E.")],
    Tier.T3: [CareAction(kind="gp_soon", label="Book your GP", detail="Book your regular GP or a polyclinic in the next 2–3 days.")],
    Tier.T4: [CareAction(kind="home_monitoring", label="Monitor at home", detail="Rest at home. WISP will check in with you again.")],
    Tier.ABSTAIN: [
        CareAction(
            kind="speak_to_professional",
            label="Speak to a health professional",
            detail="Talk to your family doctor or a nurse today, or ask a family member or caregiver to help you get advice.",
        )
    ],
}

ACTION_TEXT = {
    Tier.T1: ("Call 995 now, or go to the nearest A&E.", "Now"),
    Tier.T2: ("See your GP or a polyclinic today.", "Today"),
    Tier.T3: ("Book your regular GP or a polyclinic in the next few days.", "Within 2–3 days"),
    Tier.T4: ("Rest at home and keep an eye on how you feel.", "Re-check tomorrow"),
    Tier.ABSTAIN: ("Please speak with your family doctor or a nurse today about how you're feeling.", "Today"),
}

ESCALATION = {
    Tier.T1: "Do not drive yourself. If you are alone, call 995 first, then unlock your door if you can.",
    Tier.T2: "If you cannot be seen today, or you feel worse, go to A&E. If any of the warning signs listed here appear, call 995.",
    Tier.T3: "If you feel worse before your appointment, get seen today. If any of the warning signs listed here appear, call 995.",
    Tier.T4: "If you are not improving by tomorrow, book your GP. If any of the warning signs listed here appear, call 995.",
    Tier.ABSTAIN: "If any of the warning signs listed here appear, call 995.",
}

SELF_CARE = [
    "Rest, and keep doing your usual routine if you feel able.",
    "Drink water regularly and eat small, regular meals.",
    "Get up slowly from bed or a chair.",
    "Let a family member or friend know how you're feeling today.",
]


def _duration_phrase(days: float | None) -> str:
    if days is None:
        return ""
    if days < 1:
        return " since today"
    if days < 2:
        return " since yesterday"
    if days < 14:
        return f" for {round(days)} days"
    return f" for about {round(days / 7)} weeks"


def complaint_sentence(case: CaseState) -> str | None:
    if not case.complaint_summary:
        return None
    return f"You've been feeling {case.complaint_summary}{_duration_phrase(case.duration_days)}."


def next_recheck(now: datetime) -> datetime:
    local = now.astimezone(SGT)
    due = (local + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    return due


def _build(
    tier: Tier,
    *,
    case: CaseState,
    reasons: list[str],
    confidence: str,
    hits: list[RuleHit],
    floor: Tier | None,
    functional_tier: Tier | None,
    sensing_used: bool,
    now: datetime,
) -> CareDisposition:
    action, timeframe = ACTION_TEXT[tier]
    recheck = None
    if tier == Tier.T4:
        recheck = ReassessmentPlan(
            session_id=case.session_id,
            user_id=case.user_id,
            due_at=next_recheck(now),
            reason="Self-care with monitoring: check whether you are improving.",
        )
    return CareDisposition(
        tier=tier,
        label=TIER_LABELS[tier],
        title=TIER_TITLES[tier],
        confidence=confidence,  # type: ignore[arg-type]
        reasons=[r for r in reasons if r],
        action=action,
        timeframe=timeframe,
        actions=ACTIONS[tier],
        worsening_signs=EMERGENCY_SIGNS,
        escalation=ESCALATION[tier],
        self_care=SELF_CARE if tier == Tier.T4 else [],
        recheck=recheck,
        symptom_floor=floor,
        functional_tier=functional_tier,
        rule_hits=hits,
        sensing_used=sensing_used,
    )


def functional_tier_from_comparison(comparison: BaselineComparison, has_concerning: bool) -> tuple[Tier | None, RuleHit | None, str | None]:
    """Map a baseline comparison to a tier. Returns (tier, rule_hit, patient_reason)."""
    s = comparison.status
    if s in ("within_usual_range", "faster_than_usual"):
        return (
            Tier.T4,
            RuleHit(rule_id="FN-1", description="5xSTS within personal usual range", effect="Functional tier T4"),
            "Today's movement check was within your usual range.",
        )
    if s == "slower_than_usual" and comparison.severity == "mild":
        return (
            Tier.T3,
            RuleHit(rule_id="FN-2", description="5xSTS mildly slower than personal usual range", effect="Functional tier T3"),
            "Today's movement check was a little slower than your usual pattern.",
        )
    if s == "slower_than_usual":
        if has_concerning:
            return (
                Tier.T2,
                RuleHit(rule_id="FN-3b", description="5xSTS clearly slower than usual + concerning finding", effect="Functional tier T2"),
                "Today's movement check was slower than your usual pattern.",
            )
        return (
            Tier.T3,
            RuleHit(rule_id="FN-3a", description="5xSTS clearly slower than usual, no other concerning finding", effect="Functional tier T3"),
            "Today's movement check was slower than your usual pattern.",
        )
    return None, None, None


def decide_care_tier(
    case: CaseState,
    profile: UserProfile,
    comparison: BaselineComparison | None = None,
    *,
    now: datetime | None = None,
) -> CareDisposition:
    now = now or datetime.now(SGT)
    complaint = complaint_sentence(case)

    # SAFE-2: red flags decide first, whatever any measurement says.
    rf = screen_red_flags(case)
    if rf.status == "triggered":
        return _build(
            Tier.T1,
            case=case,
            reasons=[*rf.reasons],
            confidence="high",
            hits=rf.rule_hits,
            floor=Tier.T1,
            functional_tier=None,
            sensing_used=False,
            now=now,
        )

    common = dict(case=case, floor=None, functional_tier=None, sensing_used=False, now=now)

    if case.complaint_category == "out_of_scope":
        return _build(
            Tier.ABSTAIN,
            reasons=["This kind of concern is outside what WISP is designed to check."],
            confidence="low",
            hits=[RuleHit(rule_id="AB-1", description="Complaint outside WISP scope", effect="Abstain")],
            **common,
        )
    if not profile.normally_stands_unaided:
        return _build(
            Tier.ABSTAIN,
            reasons=[complaint, "WISP is designed for people who normally get up from a chair without help."],
            confidence="low",
            hits=[RuleHit(rule_id="AB-2", description="Profile outside target population (does not stand unaided)", effect="Abstain")],
            **common,
        )
    if rf.status == "incomplete":
        if rf.uncertain:
            from .red_flags import RED_FLAG_LABELS

            unsure = ", ".join(RED_FLAG_LABELS[f].lower() for f in rf.uncertain)
            reason = f"You weren't sure about some important warning signs ({unsure})."
        else:
            reason = "Not all of the safety questions were answered."
        return _build(
            Tier.ABSTAIN,
            reasons=[complaint, reason],
            confidence="low",
            hits=[RuleHit(rule_id="AB-3", description="Safety screen incomplete or uncertain", effect="Abstain")],
            **common,
        )
    if case.contradictions:
        return _build(
            Tier.ABSTAIN,
            reasons=[complaint, "Some of your answers didn't fit together, so I can't be sure."],
            confidence="low",
            hits=[RuleHit(rule_id="AB-4", description=f"Contradictory answers: {'; '.join(case.contradictions)}", effect="Abstain")],
            **common,
        )

    rng = symptom_range(case)
    hits: list[RuleHit] = [*rng.rule_hits]
    reasons: list[str] = [complaint, *rng.reasons]

    # Determine functional evidence.
    func_tier: Tier | None = None
    sensing_used = False
    unreliable = False
    confidence = "medium"

    if case.functional_status == "stopped_early":
        func_tier = Tier.T2
        hits.append(RuleHit(rule_id="FN-4", description="Could not complete an otherwise safe 5xSTS", effect="Functional tier T2"))
        reasons.append("You weren't able to finish the movement check.")
        confidence = "medium"
    elif comparison is not None:
        if comparison.status == "measurement_unreliable":
            unreliable = True
        elif comparison.status == "unable_to_compare":
            hits.append(RuleHit(rule_id="FN-5", description="No usable personal baseline", effect="No functional tier"))
            reasons.append("I don't have your usual movement pattern to compare with yet.")
        else:
            func_tier, hit, reason = functional_tier_from_comparison(comparison, bool(rng.concerning))
            if hit:
                hits.append(hit)
                sensing_used = True
                reasons.append(reason)
                if comparison.new_arm_use:
                    reasons.append("You needed your arms to stand when you normally don't.")
                confidence = comparison.confidence
    elif case.functional_status == "unreliable":
        unreliable = True

    if unreliable:
        hits.append(RuleHit(rule_id="SAFE-3", description="Measurement rejected as unreliable; not used", effect="Cannot support self-care"))
        reasons.append("I couldn't get a reliable movement reading, so I didn't use it.")

    # Symptom floor at T2 or above: nothing measured can lower it.
    if URGENCY_RANK[rng.floor] <= URGENCY_RANK[Tier.T2]:
        if func_tier is not None and URGENCY_RANK[func_tier] > URGENCY_RANK[rng.floor]:
            hits.append(
                RuleHit(rule_id="SAFE-1", description=f"Functional result ({func_tier.value}) less urgent than symptom floor", effect=f"Held at {rng.floor.value}")
            )
            reasons.append("A normal movement check can't rule out a serious problem, so this advice stays the same.")
        return _build(rng.floor, case=case, reasons=reasons, confidence="high", hits=hits,
                      floor=rng.floor, functional_tier=func_tier, sensing_used=sensing_used, now=now)

    if unreliable:
        # SAFE-3 / SAFE-5: never self-care on an unusable reading.
        return _build(Tier.ABSTAIN, case=case, reasons=reasons, confidence="low", hits=hits,
                      floor=rng.floor, functional_tier=None, sensing_used=False, now=now)

    if func_tier is None:
        # SAFE-4: without functional evidence, self-care cannot be supported.
        tier = more_urgent(rng.floor, Tier.T3)
        if rng.floor == Tier.T4:
            hits.append(RuleHit(rule_id="SAFE-4", description="No functional evidence available", effect="Self-care not supported; T3"))
            if case.functional_status == "declined":
                reasons.append("We didn't do the movement check, so I can't confirm you're at your usual strength.")
        return _build(tier, case=case, reasons=reasons, confidence="medium", hits=hits,
                      floor=rng.floor, functional_tier=None, sensing_used=False, now=now)

    final = more_urgent(rng.floor, func_tier)  # SAFE-1
    if final != func_tier:
        hits.append(RuleHit(rule_id="SAFE-1", description=f"Functional result ({func_tier.value}) less urgent than symptom floor", effect=f"Held at {final.value}"))
    elif final != rng.floor:
        hits.append(RuleHit(rule_id="ESC-1", description=f"Functional evidence raised urgency {rng.floor.value} → {final.value}", effect=f"Tier {final.value}"))
    if final == Tier.T4:
        reasons.append("A normal movement check can't rule out every problem, so please watch for the warning signs.")
    return _build(final, case=case, reasons=reasons, confidence=confidence, hits=hits,
                  floor=rng.floor, functional_tier=func_tier, sensing_used=sensing_used, now=now)
