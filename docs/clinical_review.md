# WISP — clinician review pack

**Status: NOT YET REVIEWED.** WISP's safety logic is a hackathon prototype. Do not describe it as
"clinically validated". After a real review, the wording "Prototype safety logic reviewed by
<name, role> on <date>" may be used, together with the changes listed in the review log below.

This document lists every rule that decides urgency, in plain language, so a clinician can
check it without reading code. Source of truth: `services/src/wisp/rules/` (tested by
`services/tests/test_safety_rules.py`).

---

## 1. Scope

- **Intended users:** community-dwelling adults (prototype persona: 65+, Singapore) who normally rise from a chair without help, with a new, non-specific complaint ("I feel weak / tired / slower / not myself / dizzy / something feels off").
- **Out of scope (WISP abstains):** people who do not normally stand unaided; complaints unrelated to general function (e.g. toothache, rash); anyone who cannot use the system without assistance.
- **Not:** a diagnosis, continuous monitoring, or a measurement device with clinical-grade accuracy.

## 2. Emergency red flags → T1 ("This needs help now. Call 995 or go to A&E.")

Any one of these, reported by the patient or by family, gives T1 immediately. Physical sensing is then locked for the session.

| # | Red flag | Question as asked (English) |
|---|---|---|
| 1 | Sudden onset | "Did it start suddenly, or gradually?" |
| 2 | Chest pain / tightness | "Any chest pain or tightness?" |
| 3 | Severe breathlessness | "Are you so short of breath that it's hard to talk or walk?" |
| 4 | One-sided weakness / numbness / clumsiness | "Any weakness, numbness or clumsiness on one side of your body or face?" |
| 5 | Speech difficulty | "Is your speech slurred, or is it hard to find your words?" |
| 6 | New confusion / unusual drowsiness | "Do you feel confused or unusually drowsy? Has anyone said you seem confused?" |
| 7 | Fainting / blackout | "Have you fainted or blacked out?" |
| 8 | Fall with injury or head strike | "Have you had a fall today or yesterday?" → "Were you hurt, or did you hit your head?" |
| 9 | Sudden vision change | "Any sudden change in your eyesight?" |

- Every red flag is asked as a direct question with fixed answer buttons (Yes / No / Not sure), in English, Mandarin, Malay and Tamil. Free-text recognition is an additional backstop only.
- **"Not sure"** on any red flag → the flag stays unknown → **Abstain** (an emergency cannot be ruled out remotely).
- A red flag, once reported, cannot be withdrawn within the same check.

**Reviewer questions:**
- [ ] Is "sudden onset" of a vague functional complaint, on its own, appropriate as a T1 trigger?
- [ ] Is anything missing (e.g. severe headache, high fever with rigors, black stools, new incontinence)?
- [ ] Are the question wordings understandable to the target population?

## 3. Symptom-based care range (after all red flags are denied)

| Rule | Finding | Least urgent allowed (floor) | Most urgent reachable (ceiling) |
|---|---|---|---|
| SR-1 | Unable to keep fluids down | T2 | T2 |
| SR-2 | Normally stands unaided but doesn't feel steady enough to try | T2 | T2 |
| SR-3 | Any of: eating/drinking less, fall without injury, fever, getting worse, symptoms ≥ 7 days | T3 | T2 |
| SR-0 | None of the above | T4 | T3 |

**Reviewer questions:**
- [ ] Should reduced intake alone set a T3 floor in older adults?
- [ ] Is 7 days the right threshold for "persistent"?

## 4. Movement-check eligibility

The movement check (Five-Times Sit-to-Stand, 5xSTS) is offered **only if all** of the following hold:

1. All red flags denied (screen passed) and sensing not locked.
2. Complaint is about general function.
3. Profile says the person normally stands unaided.
4. The person says they feel steady enough to try.
5. Nobody else is moving in the room (self-report; automatic detection is experimental).
6. A sensor is available and a personal baseline (≥ 3 healthy-day checks) exists.
7. The result could change the advice (floor ≠ ceiling).

Patient instructions: sturdy chair without wheels, against a wall; stop if dizzy, breathless, or in pain. The patient can skip at any point without penalty.

## 5. How the movement check affects the tier

| Rule | Result vs personal usual range | Effect |
|---|---|---|
| FN-1 | Within (or quicker than) usual | Functional tier T4 |
| FN-2 | Mildly slower | T3 |
| FN-3a | Clearly slower, no other concerning finding | T3 |
| FN-3b | Clearly slower + a concerning finding (SR-3) | T2 |
| FN-4 | Started but couldn't finish (felt unwell; no red flag) | T2 |
| FN-5 / SAFE-4 | No baseline, declined, or not done | No functional tier; self-care (T4) not allowed → at least T3 |
| SAFE-3 | Reading unreliable (low confidence, second person detected, sensor failure) | Not used → Abstain (unless the symptom floor is already T2) |

- "Clearly slower" = more than max(1.5 s, 12 % of usual median) beyond the usual maximum, **or** new arm use. A noise allowance of max(0.5 s, 5 % of median) applies. **These thresholds are prototype values.**
- **Asymmetric rule (SAFE-1):** final tier = the more urgent of (symptom floor, functional tier). A normal movement check can never lower urgency below what the symptoms require.
- **SAFE-2:** a previous normal result never overrides a new red flag.

**Reviewer questions:**
- [ ] Are the "mildly" vs "clearly" slower thresholds reasonable for detecting meaningful change?
- [ ] Should new arm use alone be "clearly slower"?
- [ ] Is "clearly slower + concerning finding → same day" appropriate, or too aggressive / not aggressive enough?

## 6. Abstention ("I can't safely judge this from here")

Triggered by: out-of-scope complaint; person does not normally stand unaided; "not sure" on a red flag; contradictory answers; unreliable or failed measurement (when the symptom floor is below T2).

Action shown: *"Please speak with your family doctor or a nurse today about how you're feeling."* Abstention never results in home self-care.

## 7. Patient-facing wording

| Tier | Title | Action | When |
|---|---|---|---|
| T1 | This needs help now | Call 995 now, or go to the nearest A&E. | Now |
| T2 | Please be seen today | See your GP or a polyclinic today. | Today |
| T3 | Book your doctor in the next few days | Book your regular GP or a polyclinic in the next few days. | Within 2–3 days |
| T4 | You can continue monitoring at home for now | Rest at home and keep an eye on how you feel. Re-check tomorrow 10 AM. | Re-check tomorrow |
| Abstain | I can't safely judge this from here | Please speak with your family doctor or a nurse today. | Today |

**Warning signs shown with every non-emergency result:** sudden weakness, numbness or droop on one side of the face or body; new confusion or unusual drowsiness; chest pain; severe breathlessness; fainting or blacking out; a fall where you are hurt or hit your head. *"If any of these happen, call 995."*

**Escalation text:**
- T1: "Do not drive yourself. If you are alone, call 995 first, then unlock your door if you can."
- T2: "If you cannot be seen today, or you feel worse, go to A&E. If any of the warning signs listed here appear, call 995."
- T3: "If you feel worse before your appointment, get seen today. If any of the warning signs listed here appear, call 995."
- T4: "If you are not improving by tomorrow, book your GP. If any of the warning signs listed here appear, call 995."

**T4 self-care advice:** rest and keep your usual routine if able; drink water regularly and eat small, regular meals; get up slowly from bed or a chair; let a family member or friend know how you feel today.

**Reviewer questions:**
- [ ] Is the self-care advice safe for people on diuretics / with fluid restriction?
- [ ] Is "re-check tomorrow 10 AM" the right interval?

## 8. Translations

Safety questions and answer buttons exist in English, Mandarin (简体), Malay and Tamil (`services/src/wisp/triage/i18n.py`). **They are drafts and need review by native speakers, ideally with clinical input, before use with patients.** The recommendation screens are currently English only.

| Language | Reviewed by | Date | Notes |
|---|---|---|---|
| Mandarin | | | |
| Malay | | | |
| Tamil | | | |

---

## Review log

| Field | |
|---|---|
| Reviewed by | |
| Role / registration | |
| Date | |
| Scope of review | |
| Feedback | |
| Changes made (with commit) | |
| Outstanding concerns | |
