"""Built-in triage agent (local stand-in for Tencent WorkBuddy).

It plays the same role WorkBuddy plays when connected over MCP: it holds the
conversation, turns answers into structured facts, picks the next step, and calls
the same WISP tools. Every safety-relevant decision is made by the deterministic
tools, not here. This agent exists so the demo runs offline and as a reference
for the WorkBuddy skill prompt (docs/workbuddy/).
"""

from __future__ import annotations

from ..rules.ranges import symptom_range
from ..schemas import TIER_LABELS, Tier
from ..service import CaseFacts, ToolError, WispService
from .extract import extract, parse_yes_no

ACTOR = "local_agent"
YES_NO = ["Yes", "No", "Not sure"]

# Safety questions, one at a time, in this order.
RED_FLAG_QUESTIONS: list[tuple[str, str]] = [
    ("chest_pain", "Do you have any chest pain or tightness in your chest?"),
    ("severe_breathlessness", "Are you so short of breath that it's hard to talk or walk?"),
    ("one_sided_weakness", "Do you have weakness, numbness or clumsiness mainly on one side of your body or face?"),
    ("speech_difficulty", "Is your speech slurred, or is it hard to find your words?"),
    ("confusion", "Do you feel confused or unusually drowsy? Has anyone told you that you seem confused?"),
    ("loss_of_consciousness", "Have you fainted or blacked out?"),
    ("sudden_vision_change", "Have you had any sudden change in your eyesight?"),
]

DURATION_REPLIES = {"Since today": 0.5, "Since yesterday": 1, "2–3 days": 2.5, "About a week": 7, "Longer than a week": 14}
STEADY_REPLIES = ["Yes, I feel steady", "No, I don't feel steady", "I'd rather not"]


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

    def ask(self, sid: str, key: str, text: str, replies: list[str] | None = None, kind: str = "question") -> None:
        self._set(sid, pending=key)
        self.svc.say(sid, "agent", text, kind=kind, quick_replies=replies or [], question=key)

    def record(self, sid: str, **facts) -> dict:
        return self.svc.record_case_facts(sid, CaseFacts(**facts), ACTOR)

    # ------------------------------------------------------------------ entry points
    def open(self, sid: str) -> None:
        case = self.svc.case(sid)
        profile = self.svc.get_health_profile(sid, ACTOR)
        name = profile["display_name"]
        if case.previous_session_id:
            prev = self.svc.get_previous_assessments(sid, ACTOR, limit=1)
            if prev:
                p = prev[0]
                self.svc.say(
                    sid,
                    "agent",
                    f"Good morning, {name}. Last time you told me: “{p['complaint']}”. I suggested: {p['title'].lower()}. "
                    "This is your follow-up check. How are you feeling today?",
                    kind="question",
                    question="complaint",
                )
                self._set(sid, pending="complaint", stage="intake")
                return
        self.svc.say(
            sid,
            "agent",
            f"Hello {name}. I'm WISP. I can help you work out what to do next. Tell me how you're feeling today, in your own words.",
            kind="question",
            question="complaint",
        )
        self._set(sid, pending="complaint", stage="intake")

    def handle(self, sid: str, text: str) -> None:
        text = text.strip()[:1000]
        if not text:
            return
        self.svc.say(sid, "patient", text)
        st = self._state(sid)
        pending = st.get("pending")
        ex = extract(text)
        if pending in (None, "complaint") and not self.svc.case(sid).finished:
            return self._on_complaint(sid, text, ex)

        # Any later message may contain a new warning sign ("my daughter said I seemed confused").
        if ex.red_flags:
            self.record(sid, red_flags=ex.red_flags)
            if self._emergency_if_needed(sid):
                return

        case = self.svc.case(sid)
        if case.finished and pending not in ("share",):
            self.svc.say(sid, "agent", "If anything changes or you feel worse, please start a new check. If you notice any warning sign, call 995.")
            return

        handler = getattr(self, f"_on_{pending}", None) if pending else None
        if pending in dict(RED_FLAG_QUESTIONS):
            self._on_red_flag(sid, pending, text)
        elif handler:
            handler(sid, text, ex)

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
            self.ask(sid, "scope", "Thank you. Is the main problem that you feel weaker, slower or more tired than usual?", ["Yes", "No"])
            return
        if case.complaint_category == "out_of_scope":
            self._finish(sid, "Recommend care now", "Concern is outside what WISP is designed to check.")
            return
        self.svc.say(sid, "agent", "Thank you for telling me. I'll ask a few short questions first, one at a time.", kind="info")
        self._next(sid)

    def _on_scope(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is True:
            self.record(sid, complaint_category="functional", complaint_summary=self.svc.case(sid).complaint_summary or "not like yourself")
            self.svc.say(sid, "agent", "Thank you. I'll ask a few short questions, one at a time.", kind="info")
            self._next(sid)
        elif ans is False:
            self.record(sid, complaint_category="out_of_scope")
            self._finish(sid, "Recommend care now", "Concern is outside what WISP is designed to check.")
        else:
            self._reask(sid)

    def _on_onset(self, sid: str, text: str, ex) -> None:
        t = text.lower()
        if "sudden" in t:
            self.record(sid, onset="sudden")
            self._emergency_if_needed(sid)
            return
        if "gradual" in t or "slowly" in t:
            self.record(sid, onset="gradual")
        elif parse_yes_no(text) == "unsure":
            self.record(sid, uncertain_fields=["sudden_onset"])
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_duration(self, sid: str, text: str, ex) -> None:
        days = DURATION_REPLIES.get(text) if text in DURATION_REPLIES else ex.duration_days
        if days is None:
            if "longer" in text.lower():
                days = 14
            else:
                return self._reask(sid)
        self.record(sid, duration_days=days)
        self._next(sid)

    def _on_red_flag(self, sid: str, key: str, text: str) -> None:
        ans = parse_yes_no(text)
        if ans is None:
            return self._reask(sid)
        if ans == "unsure":
            self.record(sid, uncertain_fields=[key])
        else:
            self.record(sid, red_flags={key: ans})
            if self._emergency_if_needed(sid):
                return
        self._next(sid)

    def _on_fall(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is True:
            self.ask(sid, "fall_injury", "Were you hurt when you fell, or did you hit your head?", YES_NO)
            return
        if ans is False:
            self.record(sid, red_flags={"recent_fall_with_injury": False}, modifiers={"fall_without_injury": False})
        elif ans == "unsure":
            self.record(sid, uncertain_fields=["recent_fall_with_injury"])
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_fall_injury(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is True:
            self.record(sid, red_flags={"recent_fall_with_injury": True})
            self._emergency_if_needed(sid)
            return
        if ans is False:
            self.record(sid, red_flags={"recent_fall_with_injury": False}, modifiers={"fall_without_injury": True})
        elif ans == "unsure":
            self.record(sid, uncertain_fields=["recent_fall_with_injury"])
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_eating(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is True:
            self.record(sid, modifiers={"reduced_intake": False})
        elif ans is False or ans == "unsure" or ex.modifiers.get("reduced_intake"):
            self.record(sid, modifiers={"reduced_intake": True})
            self.ask(sid, "fluids", "Are you able to drink water and keep it down?", ["Yes", "No"])
            return
        else:
            return self._reask(sid)
        self._next(sid)

    def _on_fluids(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is None:
            return self._reask(sid)
        self.record(sid, modifiers={"unable_to_keep_fluids": ans is False})
        self._next(sid)

    def _on_steady(self, sid: str, text: str, ex) -> None:
        t = text.lower()
        if "rather not" in t or "skip" in t:
            self.record(sid, feels_safe_to_stand=True, functional_status="declined")
            self.svc.say(sid, "agent", "That's completely fine. I'll base my advice on what you've told me.", kind="info")
            self._finish(sid, "Recommend care now", "Patient chose not to do the physical check.")
            return
        ans = parse_yes_no(text)
        if ans is True:
            self.record(sid, feels_safe_to_stand=True)
            self.ask(sid, "others", "Is anyone else moving around in the room right now?", ["No, I'm alone", "Yes, someone is here"])
        elif ans is False or ans == "unsure":
            self.record(sid, feels_safe_to_stand=False)
            self.svc.say(sid, "agent", "Thank you for telling me. Please don't try it. Not feeling steady today is useful information in itself.", kind="info")
            self._finish(sid, "Recommend care now", "Patient normally stands unaided but does not feel steady now; that sets a same-day floor.")
        else:
            self._reask(sid)

    def _on_others(self, sid: str, text: str, ex) -> None:
        t = text.lower()
        if t.startswith("no") or "alone" in t:
            self.record(sid, others_present=False)
            self._start_check(sid)
        elif t.startswith("yes") or "someone" in t:
            self.record(sid, others_present=True)
            self.ask(
                sid,
                "others_clear",
                "Could you ask them to keep still or step out for a minute? Other movement can confuse the measurement.",
                ["The room is clear now", "Skip the check"],
            )
        else:
            self._reask(sid)

    def _on_others_clear(self, sid: str, text: str, ex) -> None:
        if "skip" in text.lower():
            self.record(sid, functional_status="declined")
            self._finish(sid, "Recommend care now", "Physical check skipped: another person in the sensing area.")
            return
        self.record(sid, others_present=False)
        self._start_check(sid)

    def _on_arms(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans not in (True, False):
            return self._reask(sid)
        self.record(sid, arms_used=ans)
        self.svc.compare_to_baseline(sid, ACTOR)
        self._finish(sid, None, None)

    def _on_stop_reason(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is True or ans == "unsure":
            self.ask(sid, "stop_chest", "Do you have chest pain right now?", ["Yes", "No"])
        elif ans is False:
            self.record(sid, functional_status="declined")
            self._finish(sid, "Recommend care now", "Check stopped for a non-medical reason; no functional evidence.")
        else:
            self._reask(sid)

    def _on_stop_chest(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is None:
            return self._reask(sid)
        self.record(sid, red_flags={"chest_pain": ans is True})
        if self._emergency_if_needed(sid):
            return
        self.ask(sid, "stop_breath", "Are you very short of breath right now?", ["Yes", "No"])

    def _on_stop_breath(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        if ans is None:
            return self._reask(sid)
        self.record(sid, red_flags={"severe_breathlessness": ans is True})
        if self._emergency_if_needed(sid):
            return
        self.svc.say(sid, "agent", "Please sit and rest. Not being able to finish the check is important information.", kind="info")
        self._finish(sid, "Recommend care now", "Could not complete an otherwise safe 5xSTS.")

    def _on_share(self, sid: str, text: str, ex) -> None:
        ans = parse_yes_no(text)
        profile = self.svc.store.get_profile(self.svc.case(sid).user_id)
        name = profile.caregiver.name if profile and profile.caregiver else "your caregiver"
        if ans is True:
            self.svc.share_summary(sid, ACTOR, consent=True)
            self.svc.say(sid, "agent", f"Done. I've shared a short summary with {name}. No sensor data was included.", kind="info")
        else:
            self.svc.share_summary(sid, ACTOR, consent=False)
            self.svc.say(sid, "agent", "Okay, I won't share anything.", kind="info")
        self._set(sid, pending=None, stage="done")

    def _on_check(self, sid: str, text: str, ex) -> None:
        self.svc.say(sid, "agent", "Your screen is showing the chair-rise steps. Press “I'm seated and ready” when you're ready, or “Skip” if you'd rather not.", kind="info")

    def _reask(self, sid: str) -> None:
        msgs = [m for m in self.svc.store.messages(sid) if m["role"] == "agent" and m["data"].get("question")]
        last = msgs[-1] if msgs else None
        replies = last["data"].get("quick_replies", []) if last else []
        hint = "Please tap one of the answers below." if replies else "Could you say that another way?"
        self.svc.say(sid, "agent", f"Sorry, I didn't quite catch that. {hint}", kind="question", quick_replies=replies, question=last["data"]["question"] if last else None)

    # ------------------------------------------------------------------ flow
    def _next(self, sid: str) -> None:
        case = self.svc.case(sid)
        if case.onset is None and "sudden_onset" not in case.uncertain_fields and case.red_flags.sudden_onset is None:
            return self.ask(sid, "onset", "Did this start suddenly, or come on gradually?", ["Suddenly", "Gradually", "Not sure"])
        if case.duration_days is None:
            return self.ask(sid, "duration", "How long have you felt like this?", list(DURATION_REPLIES))
        for key, q in RED_FLAG_QUESTIONS:
            if getattr(case.red_flags, key) is None and key not in case.uncertain_fields:
                return self.ask(sid, key, q, YES_NO)
        if case.red_flags.recent_fall_with_injury is None and "recent_fall_with_injury" not in case.uncertain_fields:
            return self.ask(sid, "fall", "Have you had a fall today or yesterday?", YES_NO)
        if case.modifiers.reduced_intake is None:
            return self.ask(sid, "eating", "Have you been eating and drinking as normal?", ["Yes", "No", "Not sure"])
        self._after_screen(sid)

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
        self.svc.say(
            sid,
            "agent",
            "Thank you. Nothing you've told me is an emergency warning sign. "
            "To decide whether you need to see a doctor, it would help to check how you're getting up from a chair today compared with your usual. "
            "It takes about a minute.",
            kind="info",
        )
        self.svc.say(
            sid,
            "agent",
            "Please use a sturdy chair without wheels, placed against a wall. Keep your phone nearby. "
            "Stop straight away if you feel dizzy, very short of breath, or have any pain.",
            kind="instructions",
        )
        self.ask(sid, "steady", "Do you feel steady enough to try?", STEADY_REPLIES)

    def _start_check(self, sid: str) -> None:
        el = self.svc.check_assessment_eligibility(sid, ACTOR)
        if not el.allowed:
            self.svc.say(sid, "agent", "I won't do the physical check this time.", kind="info")
            return self._finish(sid, "Recommend care now", f"Physical check not allowed: {el.reason}")
        self._set(sid, pending="check")
        import asyncio

        async def go() -> None:
            try:
                await self.svc.run_functional_assessment(sid, ACTOR, assessment="5xSTS", grant_id=el.grant_id, wait=False)
            except ToolError as e:
                self.svc.say(sid, "agent", "I couldn't start the check, so I'll base my advice on what you've told me.", kind="info")
                self._finish(sid, "Recommend care now", f"Physical check failed to start: {e}")
                self.svc.publish(sid)

        try:
            asyncio.get_running_loop().create_task(go())
        except RuntimeError:  # called from a worker thread (sync API handler)
            asyncio.run_coroutine_threadsafe(go(), self.svc.bus.loop)
        self.svc.say(sid, "agent", "Thank you. Your screen will now show the steps for the chair-rise check.", kind="check")

    async def on_check_complete(self, sid: str) -> None:
        meta = self.svc.store.session_meta(sid) or {}
        if meta.get("agent") != "local_agent" or self._state(sid).get("pending") != "check":
            return
        case = self.svc.case(sid)
        if case.functional_status == "measured":
            self.svc.say(sid, "agent", "Thank you, that's done. Please sit and rest.", kind="info")
            self.ask(sid, "arms", "Did you need to push up with your arms to stand?", ["Yes", "No"])
        elif case.functional_status == "unreliable":
            self.svc.say(sid, "agent", "I couldn't get a clear reading, so I won't use that result. I'll base my advice on what you've told me.", kind="info")
            self.svc.compare_to_baseline(sid, ACTOR)
            self._finish(sid, None, None)
        elif case.functional_status == "stopped_early":
            self.ask(sid, "stop_reason", "You stopped the check. Did you stop because you felt unwell — for example dizzy, short of breath, or in pain?", YES_NO)
        else:
            self.svc.say(sid, "agent", "The check didn't start, so I'll base my advice on what you've told me.", kind="info")
            self._finish(sid, None, None)

    def _finish(self, sid: str, action: str | None, why: str | None) -> None:
        if action and why:
            self.svc.log_decision(sid, ACTOR, action, why, ["Ask another question", "Physical function check", "Recommend care now"])
        d = self.svc.decide_care_tier(sid, ACTOR)
        self._set(sid, pending=None, stage="done")
        if d.tier == Tier.T1:
            text = f"{d.reasons[0]} {d.action}"
        elif d.tier == Tier.ABSTAIN:
            text = f"I want to be honest with you: {d.title[0].lower() + d.title[1:]}. {d.action}"
        else:
            text = f"Here is my advice: {d.title[0].lower() + d.title[1:]}. {d.action}"
        self.svc.say(sid, "agent", text, kind="result", tier=d.tier.value)
        if d.recheck:
            self.svc.schedule_recheck(sid, ACTOR)
            when = d.recheck.due_at.strftime("%-I %p")
            self.svc.say(sid, "agent", f"I'll check in with you again tomorrow at {when}.", kind="info")
        profile = self.svc.store.get_profile(self.svc.case(sid).user_id)
        if d.tier != Tier.T1 and profile and profile.caregiver:
            self.ask(sid, "share", f"Would you like to share a short summary with {profile.caregiver.name}?", ["Yes, share it", "No, thank you"], kind="question")
