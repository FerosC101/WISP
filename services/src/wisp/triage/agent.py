"""Built-in triage agent (local stand-in for Tencent WorkBuddy).

It plays the same role WorkBuddy plays when connected over MCP: it holds the
conversation, turns answers into structured facts, picks the next step, and calls
the same WISP tools. Every safety-relevant decision is made by the deterministic
tools, not here. This agent exists so the demo runs offline and as a reference
for the WorkBuddy skill prompt (docs/workbuddy/).

Answers arrive as (text, value): quick-reply buttons send a language-independent
value ("yes", "no", "unsure", "ready", ...). Free text is mapped to the same values
with English rules, so a translated label never has to be parsed.
"""

from __future__ import annotations

import asyncio
import re

from ..rules.care_tier import complaint_sentence
from ..rules.ranges import symptom_range
from ..schemas import TIER_LABELS, Tier
from ..service import CaseFacts, ToolError, WispService
from .extract import extract, parse_yes_no
from .i18n import reply, t

ACTOR = "local_agent"

# Safety questions, one at a time, in this order (after onset and duration).
RED_FLAG_QUESTIONS = [
    "chest_pain",
    "severe_breathlessness",
    "one_sided_weakness",
    "speech_difficulty",
    "confusion",
    "loss_of_consciousness",
    "sudden_vision_change",
]

DURATIONS = {"d_today": 0.5, "d_yesterday": 1, "d_days": 2.5, "d_week": 7, "d_longer": 14}

# Fields the patient may correct on the "What WISP understood" screen.
CORRECTABLE = {"duration", "onset", "eating", "fluids", "fall", *RED_FLAG_QUESTIONS}

# How each tier is described to the patient when explaining why a check could help.
PATIENT_TIER_PHRASE = {
    Tier.T2: "being seen today",
    Tier.T3: "seeing your doctor in the next few days",
    Tier.T4: "home monitoring",
}


def normalise(text: str, value: str | None) -> str | None:
    """Map an answer to a canonical value. Buttons send the value directly."""
    if value:
        return value
    low = text.lower().strip()
    if re.search(r"\bskip\b|rather not", low):
        return "skip"
    if "do the check" in low:
        return "do_check"
    if "sudden" in low:
        return "sudden"
    if "gradual" in low or "slowly" in low:
        return "gradual"
    if "alone" in low:
        return "alone"
    if "someone" in low:
        return "someone"
    if "clear" in low:
        return "clear"
    yn = parse_yes_no(text)
    if yn == "unsure":
        return "unsure"
    if yn is True:
        return "yes"
    if yn is False:
        return "no"
    return None


class LocalAgent:
    def __init__(self, svc: WispService):
        self.svc = svc
        svc.on_check_complete.append(self.on_check_complete)

    # ------------------------------------------------------------------ state
    def _state(self, sid: str) -> dict:
        return (self.svc.store.session_meta(sid) or {}).get("agent_state") or {}

    def _set(self, sid: str, **kw) -> None:
        st = self._state(sid)
        st.update(kw)
        self.svc.store.set_agent_state(sid, st)

    def _lang(self, sid: str) -> str:
        return self._state(sid).get("lang", "en")

    def ask(self, sid: str, key: str, text: str, replies: list[dict] | None = None, kind: str = "question", **data) -> None:
        self._set(sid, pending=key)
        self.svc.say(sid, "agent", text, kind=kind, quick_replies=replies or [], question=key, **data)

    def tell(self, sid: str, text: str, kind: str = "info", **data) -> None:
        self.svc.say(sid, "agent", text, kind=kind, **data)

    def yes_no(self, sid: str, unsure: bool = True) -> list[dict]:
        lang = self._lang(sid)
        out = [reply("yes", lang), reply("no", lang)]
        return out + [reply("unsure", lang)] if unsure else out

    def record(self, sid: str, **facts) -> dict:
        return self.svc.record_case_facts(sid, CaseFacts(**facts), ACTOR)

    # ------------------------------------------------------------------ entry points
    def open(self, sid: str, *, lang: str = "en", greet: bool = True, confirm_summary: bool = False) -> None:
        """Start the agent. With greet=False the patient's first message follows immediately.

        With confirm_summary=True the agent pauses after the safety questions so the
        patient can review and correct what it understood (the app's Check flow).
        """
        self._set(sid, pending="complaint", stage="intake", lang=lang, confirm=confirm_summary)
        case = self.svc.case(sid)
        profile = self.svc.get_health_profile(sid, ACTOR)
        name = profile["display_name"]
        if case.previous_session_id:
            prev = self.svc.get_previous_assessments(sid, ACTOR, limit=1)
            if prev:
                p = prev[0]
                self.tell(
                    sid,
                    f"Hello again, {name}. Last time you said: “{p['complaint']}”, and I suggested: {p['title'].lower()}. "
                    "How are you feeling today?",
                    kind="question",
                    question="complaint",
                )
                return
        if greet:
            self.tell(sid, f"Hello {name}. How are you feeling today? Tell me in your own words.", kind="question", question="complaint")

    def handle(self, sid: str, text: str, value: str | None = None) -> None:
        text = text.strip()[:1000]
        if not text:
            return
        self.svc.say(sid, "patient", text)
        pending = self._state(sid).get("pending")
        ex = extract(text) if value is None else None
        if pending in (None, "complaint") and not self.svc.case(sid).finished:
            return self._on_complaint(sid, text, ex or extract(text))

        # Any typed message may contain a new warning sign ("my daughter said I seemed confused").
        if ex and ex.red_flags:
            self.record(sid, red_flags=ex.red_flags)
            if self._emergency_if_needed(sid):
                return

        case = self.svc.case(sid)
        if case.finished and pending != "share":
            self.tell(sid, "If anything changes or you feel worse, please start a new check. If you notice any warning sign, call 995.")
            return

        ans = normalise(text, value)
        if pending in RED_FLAG_QUESTIONS:
            return self._on_red_flag(sid, pending, ans)
        handler = getattr(self, f"_on_{pending}", None) if pending else None
        if handler:
            handler(sid, ans, text, ex)

    # ------------------------------------------------------------------ handlers
    def _on_complaint(self, sid: str, text: str, ex) -> None:
        facts: dict = {"complaint_text": text}
        if ex.complaint_category:
            facts["complaint_category"] = ex.complaint_category
        if ex.summary:
            facts["complaint_summary"] = ex.summary
        if ex.duration_days is not None:
            facts["duration_days"] = ex.duration_days
        if ex.onset:
            facts["onset"] = ex.onset
        if ex.modifiers:
            facts["modifiers"] = ex.modifiers
        if ex.red_flags:
            facts["red_flags"] = ex.red_flags
        self.record(sid, **facts)
        if self._emergency_if_needed(sid):
            return
        case = self.svc.case(sid)
        if case.complaint_category == "unknown":
            self.ask(sid, "scope", "Thank you. Is the main problem that you feel weaker, slower or more tired than usual?", self.yes_no(sid, unsure=False))
            return
        if case.complaint_category == "out_of_scope":
            self._finish(sid, "Recommend care now", "Concern is outside what WISP is designed to check.")
            return
        self._acknowledge(sid)
        self._next(sid)

    def _acknowledge(self, sid: str) -> None:
        sentence = complaint_sentence(self.svc.case(sid))
        echo = sentence.replace("You've been feeling", "You said you've been feeling") if sentence else "Thank you for telling me."
        self.tell(sid, echo)
        self.tell(sid, t("warning_intro", self._lang(sid)))

    def _on_scope(self, sid: str, ans, text, ex) -> None:
        if ans == "yes":
            self.record(sid, complaint_category="functional", complaint_summary=self.svc.case(sid).complaint_summary or "not like yourself")
            self._acknowledge(sid)
            self._next(sid)
        elif ans == "no":
            self.record(sid, complaint_category="out_of_scope")
            self._finish(sid, "Recommend care now", "Concern is outside what WISP is designed to check.")
        else:
            self._reask(sid)

    def _on_onset(self, sid: str, ans, text, ex) -> None:
        if ans == "sudden":
            self.record(sid, onset="sudden")
            self._emergency_if_needed(sid)
            return
        if ans == "gradual":
            self.record(sid, onset="gradual")
        elif ans == "unsure":
            self.record(sid, uncertain_fields=["sudden_onset"])
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_duration(self, sid: str, ans, text, ex) -> None:
        days = DURATIONS.get(ans or "")
        if days is None:
            days = (ex.duration_days if ex else None) or (14 if "longer" in text.lower() else None)
        if days is None:
            return self._reask(sid)
        self.record(sid, duration_days=days)
        self._next(sid)

    def _on_red_flag(self, sid: str, key: str, ans) -> None:
        if ans not in ("yes", "no", "unsure"):
            return self._reask(sid)
        if ans == "unsure":
            self.record(sid, uncertain_fields=[key])
        else:
            self.record(sid, red_flags={key: ans == "yes"})
            if self._emergency_if_needed(sid):
                return
        self._next(sid)

    def _on_fall(self, sid: str, ans, text, ex) -> None:
        if ans == "yes":
            return self.ask(sid, "fall_injury", t("q_fall_injury", self._lang(sid)), self.yes_no(sid))
        if ans == "no":
            self.record(sid, red_flags={"recent_fall_with_injury": False}, modifiers={"fall_without_injury": False})
        elif ans == "unsure":
            self.record(sid, uncertain_fields=["recent_fall_with_injury"])
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_fall_injury(self, sid: str, ans, text, ex) -> None:
        if ans == "yes":
            self.record(sid, red_flags={"recent_fall_with_injury": True})
            self._emergency_if_needed(sid)
            return
        if ans == "no":
            self.record(sid, red_flags={"recent_fall_with_injury": False}, modifiers={"fall_without_injury": True})
        elif ans == "unsure":
            self.record(sid, uncertain_fields=["recent_fall_with_injury"])
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_eating(self, sid: str, ans, text, ex) -> None:
        if ans == "yes":
            self.record(sid, modifiers={"reduced_intake": False})
        elif ans in ("no", "unsure") or (ex and ex.modifiers.get("reduced_intake")):
            self.record(sid, modifiers={"reduced_intake": True})
            return self.ask(sid, "fluids", t("q_fluids", self._lang(sid)), self.yes_no(sid, unsure=False))
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_fluids(self, sid: str, ans, text, ex) -> None:
        if ans not in ("yes", "no"):
            return self._reask(sid)
        self.record(sid, modifiers={"unable_to_keep_fluids": ans == "no"})
        self._next(sid)

    def _on_offer(self, sid: str, ans, text, ex) -> None:
        lang = self._lang(sid)
        if ans in ("do_check", "yes"):
            self.tell(sid, t("instructions", lang), kind="instructions")
            self.ask(sid, "steady", t("q_steady", lang), [reply("ready", lang), reply("no", lang), reply("skip", lang)])
        elif ans in ("skip", "no"):
            self.record(sid, functional_status="declined")
            self.tell(sid, t("declined_ok", lang))
            self._finish(sid, "Recommend care now", "Patient chose not to do the movement check.")
        else:
            self._reask(sid)

    def _on_steady(self, sid: str, ans, text, ex) -> None:
        lang = self._lang(sid)
        if ans in ("ready", "yes"):
            self.record(sid, feels_safe_to_stand=True)
            self.ask(sid, "others", t("q_others", lang), [reply("alone", lang), reply("someone", lang)])
        elif ans == "skip":
            self.record(sid, feels_safe_to_stand=True, functional_status="declined")
            self.tell(sid, t("declined_ok", lang))
            self._finish(sid, "Recommend care now", "Patient chose not to do the movement check.")
        elif ans in ("no", "unsure"):
            self.record(sid, feels_safe_to_stand=False)
            self.tell(sid, t("unsteady_ok", lang))
            self._finish(sid, "Recommend care now", "Patient normally stands unaided but does not feel steady now; that sets a same-day floor.")
        else:
            self._reask(sid)

    def _on_others(self, sid: str, ans, text, ex) -> None:
        lang = self._lang(sid)
        if ans in ("alone", "no"):
            self.record(sid, others_present=False)
            self._start_check(sid)
        elif ans in ("someone", "yes"):
            self.record(sid, others_present=True)
            self.ask(sid, "others_clear", t("others_wait", lang), [reply("clear", lang), reply("skip", lang)])
        else:
            self._reask(sid)

    def _on_others_clear(self, sid: str, ans, text, ex) -> None:
        if ans == "skip":
            self.record(sid, functional_status="declined")
            self._finish(sid, "Recommend care now", "Movement check skipped: another person in the sensing area.")
            return
        self.record(sid, others_present=False)
        self._start_check(sid)

    def _on_arms(self, sid: str, ans, text, ex) -> None:
        if ans not in ("yes", "no"):
            return self._reask(sid)
        self.record(sid, arms_used=ans == "yes")
        self.svc.compare_to_baseline(sid, ACTOR)
        self._finish(sid, None, None)

    def _on_stop_reason(self, sid: str, ans, text, ex) -> None:
        if ans in ("yes", "unsure"):
            self.ask(sid, "stop_chest", t("q_stop_chest", self._lang(sid)), self.yes_no(sid, unsure=False))
        elif ans == "no":
            self.record(sid, functional_status="declined")
            self._finish(sid, "Recommend care now", "Check stopped for a non-medical reason; no functional evidence.")
        else:
            self._reask(sid)

    def _on_stop_chest(self, sid: str, ans, text, ex) -> None:
        if ans not in ("yes", "no"):
            return self._reask(sid)
        self.record(sid, red_flags={"chest_pain": ans == "yes"})
        if self._emergency_if_needed(sid):
            return
        self.ask(sid, "stop_breath", t("q_stop_breath", self._lang(sid)), self.yes_no(sid, unsure=False))

    def _on_stop_breath(self, sid: str, ans, text, ex) -> None:
        if ans not in ("yes", "no"):
            return self._reask(sid)
        self.record(sid, red_flags={"severe_breathlessness": ans == "yes"})
        if self._emergency_if_needed(sid):
            return
        self.tell(sid, "Please sit and rest. Not being able to finish the check is important information.")
        self._finish(sid, "Recommend care now", "Could not complete an otherwise safe 5xSTS.")

    def _on_share(self, sid: str, ans, text, ex) -> None:
        profile = self.svc.store.get_profile(self.svc.case(sid).user_id)
        name = profile.caregiver.name if profile and profile.caregiver else "your caregiver"
        if ans in ("share_yes", "yes"):
            self.svc.share_summary(sid, ACTOR, consent=True)
            self.tell(sid, f"Done. I've shared a short summary with {name}. No sensor data was included.")
        else:
            self.svc.share_summary(sid, ACTOR, consent=False)
            self.tell(sid, "Okay, I won't share anything.")
        self._set(sid, pending=None, stage="done")

    def _on_check(self, sid: str, ans, text, ex) -> None:
        self.tell(sid, "Your screen is showing the movement check. Press “I'm seated — start” when you're ready, or “Skip”.")

    def _reask(self, sid: str) -> None:
        msgs = [m for m in self.svc.store.messages(sid) if m["role"] == "agent" and m["data"].get("question")]
        last = msgs[-1] if msgs else None
        self.svc.say(
            sid, "agent", t("reask", self._lang(sid)), kind="question",
            quick_replies=last["data"].get("quick_replies", []) if last else [],
            question=last["data"]["question"] if last else None,
        )

    # ------------------------------------------------------------------ flow
    def _next(self, sid: str) -> None:
        case = self.svc.case(sid)
        lang = self._lang(sid)
        if case.onset is None and "sudden_onset" not in case.uncertain_fields and case.red_flags.sudden_onset is None:
            return self.ask(sid, "onset", t("q_onset", lang), [reply("sudden", lang), reply("gradual", lang), reply("unsure", lang)])
        if case.duration_days is None:
            return self.ask(sid, "duration", t("q_duration", lang), [reply(k, lang) for k in DURATIONS])
        for key in RED_FLAG_QUESTIONS:
            if getattr(case.red_flags, key) is None and key not in case.uncertain_fields:
                return self.ask(sid, key, t(f"q_{key}", lang), self.yes_no(sid))
        if case.red_flags.recent_fall_with_injury is None and "recent_fall_with_injury" not in case.uncertain_fields:
            return self.ask(sid, "fall", t("q_fall", lang), self.yes_no(sid))
        if case.modifiers.reduced_intake is None:
            return self.ask(sid, "eating", t("q_eating", lang), self.yes_no(sid))
        if self._state(sid).get("confirm"):
            return self.ask(sid, "confirm", t("q_confirm", lang), [reply("confirm", lang)], kind="confirm")
        self._after_screen(sid)

    def _on_confirm(self, sid: str, ans, text, ex) -> None:
        if ans in ("confirm", "yes"):
            self._after_screen(sid)
        else:
            self._reask(sid)

    def correct(self, sid: str, field: str, value: str) -> None:
        """Apply a patient's correction from the summary screen, then continue.

        Only allowed while the agent is waiting for the patient to confirm the summary.
        Corrections go through record_case_facts like any answer: a newly reported
        warning sign escalates at once, and a reported one cannot be withdrawn.
        """
        if self._state(sid).get("pending") != "confirm":
            raise ToolError("Answers can only be changed while reviewing the summary.", "invalid_state")
        if field not in CORRECTABLE:
            raise ToolError(f"'{field}' cannot be changed here", "invalid_input")
        rec = lambda **facts: self.svc.record_case_facts(sid, CaseFacts(**facts), "patient")  # noqa: E731
        if field == "duration":
            if value not in DURATIONS:
                raise ToolError("Unknown duration", "invalid_input")
            rec(duration_days=DURATIONS[value])
        elif field == "onset":
            if value not in ("sudden", "gradual"):
                raise ToolError("Onset must be sudden or gradual", "invalid_input")
            rec(onset=value)
        elif field == "eating":  # "Have you been eating and drinking as usual?"
            if value not in ("yes", "no"):
                raise ToolError("Answer must be yes or no", "invalid_input")
            rec(modifiers={"reduced_intake": value == "no"} | ({"unable_to_keep_fluids": False} if value == "yes" else {}))
        elif field == "fluids":  # "Can you drink water and keep it down?"
            if value not in ("yes", "no"):
                raise ToolError("Answer must be yes or no", "invalid_input")
            rec(modifiers={"reduced_intake": True, "unable_to_keep_fluids": value == "no"})
        elif field == "fall":
            if value == "no":
                rec(red_flags={"recent_fall_with_injury": False}, modifiers={"fall_without_injury": False})
            elif value == "yes_no_injury":
                rec(red_flags={"recent_fall_with_injury": False}, modifiers={"fall_without_injury": True})
            elif value == "yes_injury":
                rec(red_flags={"recent_fall_with_injury": True})
            else:
                raise ToolError("Unknown fall answer", "invalid_input")
        else:  # a warning-sign question
            if value not in ("yes", "no"):
                raise ToolError("Answer must be yes or no", "invalid_input")
            rec(red_flags={field: value == "yes"})
        if self._emergency_if_needed(sid):
            return
        if field == "eating" and value == "no" and self.svc.case(sid).modifiers.unable_to_keep_fluids is None:
            # Eating less now: ask the follow-up the original answer skipped.
            return self.ask(sid, "fluids", t("q_fluids", self._lang(sid)), self.yes_no(sid, unsure=False))
        self._next(sid)  # back to the confirm step

    def _emergency_if_needed(self, sid: str) -> bool:
        rf = self.svc.screen_red_flags(sid, ACTOR)
        if rf.status != "triggered":
            return False
        self.svc.log_decision(
            sid, ACTOR, "Escalate now",
            "Emergency warning sign reported. Physical sensing not requested: it cannot change an emergency recommendation.",
            ["Ask another question", "Physical function check", "Recommend care now"],
        )
        self._finish(sid, None, None)
        return True

    def _after_screen(self, sid: str) -> None:
        rf = self.svc.screen_red_flags(sid, ACTOR)
        case = self.svc.case(sid)
        profile = self.svc.store.get_profile(case.user_id)
        actions = ["Ask another question", "Physical function check", "Recommend care now"]
        if rf.status == "incomplete":
            return self._finish(sid, "Recommend care now", "Some warning-sign answers were 'not sure'; an emergency cannot be safely ruled out remotely.")
        rng = symptom_range(case)
        if not profile.normally_stands_unaided:
            return self._finish(sid, "Recommend care now", "Physical check not appropriate: patient does not normally stand unaided.")
        if rng.floor == rng.ceiling:
            return self._finish(sid, "Recommend care now", f"Symptoms already set {TIER_LABELS[rng.floor]}; a measurement could not change it.")
        if self.svc.store.get_baseline(case.user_id) is None:
            return self._finish(sid, "Recommend care now", "No personal baseline on file, so a chair-rise result could not be compared.")
        if not self.svc.provider.available():
            return self._finish(sid, "Recommend care now", "No sensing provider available; relying on symptoms only.")

        self.svc.log_decision(
            sid, ACTOR, "Physical function check",
            f"A functional measurement could help distinguish {TIER_LABELS[rng.floor].lower()} from {TIER_LABELS[rng.ceiling].lower()}.",
            actions,
        )
        self._set(sid, stage="sensing")
        lang = self._lang(sid)
        why = (
            f"Your answers currently fall between {PATIENT_TIER_PHRASE[rng.floor]} and {PATIENT_TIER_PHRASE[rng.ceiling]}. "
            "Comparing today's movement check with your usual result may help clarify that."
        )
        self.ask(
            sid, "offer", "\n".join([t("offer_1", lang), t("offer_2", lang), t("offer_3", lang)]),
            [reply("do_check", lang), reply("skip", lang)], kind="offer", why=why,
        )

    def _start_check(self, sid: str) -> None:
        el = self.svc.check_assessment_eligibility(sid, ACTOR)
        if not el.allowed:
            self.tell(sid, "I won't do the movement check this time.")
            return self._finish(sid, "Recommend care now", f"Physical check not allowed: {el.reason}")
        self._set(sid, pending="check")

        async def go() -> None:
            try:
                await self.svc.run_functional_assessment(sid, ACTOR, assessment="5xSTS", grant_id=el.grant_id, wait=False)
            except ToolError as e:
                self.tell(sid, "I couldn't start the check, so I'll base my advice on what you've told me.")
                self._finish(sid, "Recommend care now", f"Physical check failed to start: {e}")
                self.svc.publish(sid)

        try:
            asyncio.get_running_loop().create_task(go())
        except RuntimeError:  # called from a worker thread (sync API handler)
            asyncio.run_coroutine_threadsafe(go(), self.svc.bus.loop)
        self.tell(sid, t("check_screen", self._lang(sid)), kind="check")

    async def on_check_complete(self, sid: str) -> None:
        meta = self.svc.store.session_meta(sid) or {}
        if meta.get("agent") != "local_agent" or self._state(sid).get("pending") != "check":
            return
        lang = self._lang(sid)
        case = self.svc.case(sid)
        if case.functional_status == "measured":
            self.tell(sid, t("check_complete", lang), kind="check_complete")
            self.ask(sid, "arms", t("q_arms", lang), self.yes_no(sid, unsure=False))
        elif case.functional_status == "unreliable":
            self.tell(sid, t("unreliable", lang))
            self.svc.compare_to_baseline(sid, ACTOR)
            self._finish(sid, None, None)
        elif case.functional_status == "stopped_early":
            self.ask(sid, "stop_reason", t("q_stop_reason", lang), self.yes_no(sid))
        else:
            self.tell(sid, t("declined_ok", lang))
            self._finish(sid, None, None)

    def _finish(self, sid: str, action: str | None, why: str | None) -> None:
        if action and why:
            self.svc.log_decision(sid, ACTOR, action, why, ["Ask another question", "Physical function check", "Recommend care now"])
        d = self.svc.decide_care_tier(sid, ACTOR)
        self._set(sid, pending=None, stage="done")
        lang = self._lang(sid)
        if d.tier == Tier.T1:
            text = f"{d.reasons[0]} {t('emergency_now', lang)}" if lang == "en" else t("emergency_now", lang)
        else:
            text = f"{d.title}. {d.action}"
        self.tell(sid, text, kind="result", tier=d.tier.value)
        if d.recheck:
            self.svc.schedule_recheck(sid, ACTOR)
            self.tell(sid, f"I'll check in with you again tomorrow at {d.recheck.due_at.strftime('%-I %p')}.")
        profile = self.svc.store.get_profile(self.svc.case(sid).user_id)
        if d.tier != Tier.T1 and profile and profile.caregiver:
            self.ask(sid, "share", t("q_share", lang, name=profile.caregiver.name), [reply("share_yes", lang), reply("share_no", lang)])
