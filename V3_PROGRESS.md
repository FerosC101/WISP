# WISP v3 — progress tracker

Source: `docs/WISP_Progress_Report.pdf` §11 "v3 To-Do" (6 Oct 2026).
Branch: `v3/patient-app` (from `origin/refactor/product-v2`).

Scope: the two P0 patient-UI tasks that the P1 screens depend on, followed by every P1 task, done one at a time in this order.
The hardware/WorkBuddy P0 tasks (real 5xSTS, real sensor data, live WorkBuddy) and the P2 tasks are out of scope here.
They need people and hardware in the room.

This file is updated each time a task is finished.

Status: ⬜ not started · 🟡 in progress · ✅ done · ⏸ blocked

## Summary

| # | Pri | Task | Status |
|---|---|---|---|
| 1 | P0 | Expand the patient app beyond chat (bottom nav) | ✅ |
| 2 | P0 | Build a proper Today dashboard | ✅ |
| 3 | P1 | Build a dedicated Check flow | ✅ |
| 4 | P1 | Replace chat-style red-flag questions | ✅ |
| 5 | P1 | Add "What WISP understood" screen | ✅ |
| 6 | P1 | Add an agent-decision screen | ✅ |
| 7 | P1 | Create a proper Room Ready screen | ✅ |
| 8 | P1 | Redesign the movement test as an immersive experience | ✅ |
| 9 | P1 | Add a movement-result screen | ✅ |
| 10 | P1 | Expand Care into a real section | ✅ |
| 11 | P1 | Build a Care Plan screen | ✅ |
| 12 | P1 | Improve Find Care | ✅ |
| 13 | P1 | Build a Doctor Visit Summary | ✅ |
| 14 | P1 | Turn follow-up into its own flow | ✅ |
| 15 | P1 | Upgrade History | ✅ |
| 16 | P1 | Expand "My Usual" | ✅ |
| 17 | P1 | Create a proper "You" section | ✅ |
| 18 | P1 | Redesign caregiver sharing | ✅ |
| 19 | P1 | Preserve separate Technical View | ✅ |
| 20 | P1 | Preserve and polish Engineering View | ✅ |
| 21 | P1 | Improve mobile UX | ⬜ |

## Tasks

### 1. P0 — Expand the patient app beyond chat ✅
- [x] Primary navigation: Today / Check / Care / History / You
- [ ] Stop making every interaction look like a conversation → replaced screen by screen in tasks 3–9
- [x] Structured cards, workflows, timelines, status views, dedicated assessment screens (Care and You are now card hubs; the dedicated check screens come in tasks 3–9)
- [ ] Chat only for open-ended complaints and clarification → tasks 3–9

What changed:
- `Shell.tsx`: five tabs. Each tab owns its route prefixes: Check covers `/session/*`, Care covers `/caregiver/*`, and You covers `/baseline` and `/privacy`, so the right tab stays highlighted.
- `/` redirects to `/today`. The old home page moved to `/today`, and task 2 rebuilds it.
- New `/check` (start a check, plus the scheduled check-in), `/care` (latest recommendation, or an empty state) and `/you` (profile, My usual, Privacy, Language, Larger text).
- The language picker moved from the home page to You.
- Shared code: `components/StartCheck.tsx` (entry form + `useStartCheck`), `components/CareCards.tsx`, `lib/useMe.ts`.

Verified: `tsc` and `eslint` are clean. In the browser, `/` redirects to `/today`, every tab loads, and the active tab is correct on `/baseline` and `/session/*`. The bottom bar was checked at 390 px. "I feel weak" still starts a session.

### 2. P0 — Build a proper Today dashboard ✅
- [x] Greeting
- [x] "How are you today?"
- [x] Quick symptom cards
- [x] Next scheduled check
- [x] Last recommendation
- [x] Current baseline status
- [x] Shortcut to new check-in

What changed:
- `app/today/page.tsx` was rebuilt as a dashboard, and the free-text box is gone (it lives on the Check tab).
- A 2×2 grid of large symptom cards: Weaker than usual, Dizzy, Unusually tired, Something feels off. Each starts a check with those words.
- The "Start a new check-in" button goes to `/check`.
- The scheduled check-in card appears at the top when one is due.
- The last recommendation is shown as a card.
- A new "My usual" status card reads `/api/baselines/{user}`. It shows "Ready to compare", "N of 3 healthy-day checks" or "Not set up yet", and links to `/baseline`. No seconds are shown.

Verified: `tsc` and `eslint` are clean. At 390 px:
- Mdm Tan: baseline ready.
- Mr Lim, after an API-run emergency session: "Emergency help" recommendation card and "Not set up yet" baseline.
- Tapping "Unusually tired" starts a session.

Not checked live: the scheduled check-in card. No persona had a recheck due, and the component is unchanged from v2.

### 3. P1 — Build a dedicated Check flow ✅
- [x] /check/start, /check/concern, /check/safety, /check/summary, /check/decision
- [x] /check/room-ready, /check/movement, /check/movement-result, /check/complete
- [x] One clear task per screen

How it works:
- The screens sit on top of the same built-in agent the chat used. The agent asks one question at a time, and each question key belongs to one screen: `lib/checkFlow.ts` → `stageOf()`.
- A screen shows the question as large buttons and sends the language-independent answer value. Backend rules and the agent are unchanged.
- Every screen redirects to the stage the session is really at (`useCheckFlow`). Refreshing, the back button and emergency answers always land on the right screen.
- A T1 result jumps straight to `/check/complete`.
- The session id is in `?s=`. `app/check/layout.tsx` provides the Suspense boundary that `useSearchParams` needs.
- Summary, decision and movement-result are "Continue" screens. Their acknowledgements live in sessionStorage. A finished check opened later from Care or History goes straight to the recommendation.
- WorkBuddy sessions still use the conversation view at `/session/[id]`, which is also reachable from "See the conversation".
- Shared parts: `components/check/CheckFrame.tsx` (journey progress bar, loading/error) and `components/check/QuestionScreen.tsx` (question + answer buttons; typing only behind "Answer in your own words").
- Entry points now go to the flow: Today cards, `/check/start`, the scheduled check-in, and the recommendation cards.

Verified in the browser at 390 px:
- Scenario 1 (Mdm Tan, weak 2 days, eating less → movement check, arms used) goes start → safety ×10 → summary → decision → room-ready ×2 → movement (replay) → movement-result → complete. Result **T2 "Please be seen today"**, the same as the README.
- Answering "Yes" to chest pain partway through the safety check → straight to **T1 "This needs help now"**.
- Declining the movement check → **T3**, never self-care (SAFE-4).
- Reopening from Care with no stored flow state → recommendation. The share prompt goes away after answering.
- `tsc` and `eslint` are clean. Backend `pytest`: 112 passed (backend unchanged).

### 4. P1 — Replace chat-style red-flag questions ✅
- [x] Dedicated "Safety Check"
- [x] One question per screen
- [x] Progress indicator
- [x] Large Yes / No / Not sure buttons
- [x] Keep deterministic backend rules unchanged
- [x] Immediately route red flags to emergency care

What changed:
- `app/check/safety/page.tsx` is now a dedicated screen.
- "Question N of 11" counter, driven by `SAFETY_ORDER` / `safetyStep()` in `lib/checkFlow.ts`. These mirror the agent's question order. Follow-ups (fall → injury, eating → fluids) keep their parent's number.
- Answer buttons are 64 px tall and full width. Yes / No / Not sure get ✓ ✗ ? icons only when every option has one. Colours are neutral, so no answer looks "right".
- "If you're not sure, that's fine. WISP will play it safe."
- The agent's lead-in ("You said you've been feeling dizzy…") sits in a soft card above the first question.
- Focus moves to each new question for screen readers. Typing stays behind "Answer in your own words".
- A "Feeling very unwell right now? Call 995" link is always on screen.
- Backend: no changes.

Verified in the browser at 390 px:
- Counter: 1→3 after onset and duration; fall and fall-injury are both "10 of 11"; eating is "11 of 11".
- "Not sure" on confusion → **ABSTAIN** ("I can't safely judge this from here"), never self-care.
- Chest pain "Yes" → T1 (tested in task 3).
- `tsc` and `eslint` are clean.

### 5. P1 — Add "What WISP understood" screen ✅
- [x] Main complaint
- [x] Duration
- [x] Associated changes
- [x] Safety screen result
- [x] Allow user to correct mistakes before continuing

What changed, backend (opt-in, so the chat view, WorkBuddy, existing tests and the evaluation harness are unchanged):
- `LocalAgent.open(confirm_summary=True)` pauses after the safety questions with a new `confirm` step. It doesn't decide anything until the patient taps "That's right". New i18n strings `confirm` and `q_confirm` (zh/ms/ta are drafts, like the rest).
- `LocalAgent.correct(field, value)` and `POST /api/sessions/{id}/corrections` are only accepted while the agent waits at `confirm`.
- Correctable fields: duration, onset, eating, fluids, fall (no / not hurt / hurt) and each warning sign (yes/no).
- Every correction goes through `record_case_facts` as actor `patient`, then the red-flag screen.
- Correcting a warning sign to Yes, or "fell and was hurt", escalates to T1 at once. A reported red flag still can't be withdrawn.
- Changing eating to "less than usual" asks the fluids question that was skipped.
- A warning sign can only be corrected to Yes or No, because the backend can't reset an answer to "unknown".
- `docs/safety.md`: new invariant ORD-5.
- `POST /api/sessions` and `/followup` accept `confirm_summary`. The Check flow always sends it.

What changed, frontend:
- `/check/summary` lists the main concern ("Start again" link), how long, how it started, eating and drinking, keeping fluids down (if relevant), a recent fall, and anything else found in the patient's words (fever, getting worse).
- Each row has a "Change" control with large options, using the agent's own translated answer labels where it has them.
- The safety check card shows "No warning signs reported" plus a count of "not sure" answers. If there are any, the card explains what they mean, and the answers list opens automatically so they can be changed.
- The summary is now shown whenever the agent waits at `confirm`. The client-side "summary" acknowledgement is gone.

Verified:
- Backend `pytest`: 126 passed. That's 13 new tests in `tests/test_summary_confirm.py` plus `test_corrections_endpoint`: pause before deciding, no pause without opt-in, Yes-correction → T1 + sensing locked, fall-with-injury → T1, not sure → No, eating → fluids follow-up, audited as patient, refused after confirming, invalid values refused, WorkBuddy sessions refused.
- Browser at 390 px:
  - Confusion "not sure" → No clears the "not sure" count.
  - Eating → "Less than usual" asks the fluids question and returns to the summary.
  - Confirming → decision screen.
  - One-sided weakness changed to Yes on the summary → T1.
- `tsc` and `eslint` are clean.

### 6. P1 — Add an agent-decision screen ✅
- [x] "WISP is checking what would help next…"
- [x] If sensing is useful: explain why; "Do the check / Continue without it"
- [x] If sensing is unnecessary: go directly to recommendation
- [x] Make this the signature agentic moment
- [x] (task 4 note) Fixed: the misleading "WISP has enough…" copy for ABSTAIN

What changed:
- `app/check/decision/page.tsx` shows "WISP is checking what would help next…" with the flowing WISP line.
- It lists the three options the agent weighs (`trace.available_actions`), in patient words: ask more questions / a short movement check / suggest your next step now. Then it reveals the one the agent picked (`selected_action`). Unchosen options fade and shrink so the action stays near the fold.
- The reveal takes about 1.4 s, or is instant with prefers-reduced-motion.
- Check offered: the agent's own patient-facing reason (`offer.why`), "about 30 seconds… it's your choice", then **Do the check** / **Continue without it**.
- No check: a plain reason, then auto-continue to the recommendation after 4 s, or tap "See my next step". The reason is derived from the same structured state the agent checks, in the same order as `_after_screen`: "not sure" answers, out of scope, mobility, range already fixed, no baseline, sensor unavailable. It never parses the technical `trace.why` text.

Verified:
- Browser at 390 px, Mdm Tan: checking state → movement check chosen, with reason and buttons.
- Mr Lim (no baseline): "suggest your next step now" with "WISP doesn't have your usual movement on record yet…", then auto-advance to T3.
- API: a "not sure" answer gives `safety_screen.status = incomplete` → ABSTAIN, which shows the "couldn't be ruled out" reason.
- `tsc` and `eslint` are clean.

### 7. P1 — Create a proper Room Ready screen ✅
- [x] Chair against wall
- [x] No wheels
- [x] Clear surrounding area
- [x] Ask whether someone else is moving nearby
- [x] Ask whether user feels steady enough
- [x] Only activate sensing after confirmation

What changed:
- `app/check/room-ready/page.tsx` has three steps.
  1. **Set up:** a chair-against-wall picture and a tick-off checklist (sturdy chair with no wheels / against a wall / clear space). Continue stays disabled until all three are ticked, and "I can't set this up — skip the check" is available.
  2. **Feeling steady?** The agent's `steady` question.
  3. **The room:** the agent's `others` question, then `others_clear` ("wait until the area is clear") if someone is there.
- Every step shows "Sensing is off. It only turns on when you press Start on the next screen." Focus moves to each step's heading.
- Backend: unchanged. It already captures only after `patient_ready` (the Start press on the movement screen).

Verified in the browser at 390 px:
- Continue disabled until all three items are ticked → steady → "someone is here" → "It's clear now" → movement screen.
- At that point the API shows `functional_status = awaiting_patient` and no `sensing_active` audit event, so nothing is captured before Start.
- "Not steady" → **T2** "You normally get up on your own, but today you don't…" (SR-2).
- `tsc` and `eslint` are clean.

### 8. P1 — Redesign the movement test as an immersive experience ✅
- [x] Near-full-screen layout
- [x] "Quick movement check"
- [x] WISP line animation
- [x] Five-step counter if reliable
- [x] Stop button always available
- [x] No CSI graphs, timing numbers or confidence % on patient UI

What changed:
- New `components/check/MovementCheck.tsx`, used by `/check/movement`. It's a full-screen forest-green dialog that covers the header and tabs, locks page scroll, and takes focus.
- It renders through a portal on `<body>`, because the screen fade-in's `transform` traps `position: fixed`.
- Phases:
  1. "Sit back in your chair" (feet flat, arms crossed, five times at your normal pace) with **I'm seated — start** / **Skip the check**.
  2. "Sit still… 3, 2, 1".
  3. "Stand up and sit down five times" with the flowing WISP line.
- Five dots fill as rises are counted, only when `sensor.live_counts` (the reliability toggle in the Engineering view) is on. Otherwise: "Take your time. WISP is following your movement."
- **Stop** is pinned at the bottom in every phase, with "Stop if you feel dizzy, breathless, or in pain".
- No signal plots, timings or confidence values. The only label is a small "Recorded session" badge for non-live sensor data, as the README requires.
- v2's `CheckScreen` is kept for the WorkBuddy conversation view.

Verified in the browser at 390 px:
- The overlay covers the full screen in all three phases.
- With `live_counts` on, the dots showed 2 of 5 mid-check.
- Stop mid-check → `/check/movement-result` asking "Did you stop because you felt unwell?" Page scroll restored, `live_counts` set back to off.
- `tsc` and `eslint` are clean.

### 9. P1 — Add a movement-result screen ✅
- [x] "Within your usual range" / "Slower than your usual pattern" / "Unable to compare" / "Reading wasn't reliable"
- [x] Explain that this does not diagnose the cause
- [x] CTA: "See my next step"
- [x] (task 3 note) The backend's technical `comparison.explanation`, which also contains confidence numbers for unreliable readings, is no longer shown to patients.

What changed:
- `app/check/movement-result/page.tsx` maps `comparison.status` / `severity` / `functional_status` to six patient outcomes with their own wording:
  - within (also covers "quicker")
  - a little slower (mild)
  - slower than your usual pattern (clear)
  - unable to compare
  - the reading wasn't reliable
  - you stopped before finishing
- Within, mild and clear get a number-free picture: a "Your usual" band on a track and a "Today" marker. The marker is green when within and amber when slower.
- Unreliable readings say why, from the pipeline's reason code: someone else moving nearby / couldn't see five stands / sensor problem / signal not clear.
- New arm use gets its own line.
- The "doesn't tell us what is causing how you feel" note appears whenever a comparison was made.
- `lib/checkFlow.ts` routing fix: once a check was attempted, the session always goes to the result screen. Before, a missing "decision" acknowledgement (another tab, cleared storage) sent it back to the decision screen, which then wrongly said no check was needed. Room questions also no longer depend on that acknowledgement.

Verified (four checks driven through the API at 8× replay, then each result screen at 390 px):
- `tan_today` → "Slower than your usual pattern" (T2).
- `siti_today` → "Within your usual range" (T3, because eating less sets that floor).
- `tan_interference` → "The reading wasn't reliable · It looked like someone else was moving nearby" (ABSTAIN).
- `tan_baseline_2` → within.
- Not exercised: "a little slower". No bundled recording produces a mild result.
- Re-checked after the routing fix: Do the check → room-ready; Continue without it → T3.
- `tsc` and `eslint` are clean.

### 10. P1 — Expand Care into a real section ✅
- [x] Recommendation
- [x] Care plan (first version; task 11 restructures it into Now / Today / Next / If worse)
- [x] Find care (first version; task 12 adds distance/address and the usual-provider details)
- [x] Provider detail
- [x] Visit summary (first version; task 13 completes it)
- [x] Share with family (moved here; task 18 redesigns it)
- [x] Follow-up plan

What changed:
- New routes: `/care/recommendation`, `/care/plan`, `/care/find`, `/care/provider/[id]` (usual-gp / polyclinic / gp / ae), `/care/visit-summary`, `/care/share`. All take `?s=<session>` and default to the latest check with a recommendation (`useCareSession` in `lib/care.ts`).
- `app/care/layout.tsx` provides the Suspense boundary.
- `CareShell` gives each sub-page a "‹ Your care" back link, scrollable section tabs, and loading/empty states.
- `/care` hub:
  - The current recommendation in its tier colours.
  - Cards for care plan, find care, visit summary, and share with family (only when a trusted person exists and it isn't T1).
  - Follow-up: the scheduled check-in with "Check in now", or what to do if nothing is scheduled.
- `lib/care.ts`: provider list and which ones suit each tier (T1 → A&E only), plus "when to go" text. It never claims opening hours or availability.
- The Recommendation component's "Find care" links to `/care/find` (the inline panel is gone), and "Share with family" links to `/care/share`.
- v2's `/caregiver/[id]` page became `components/care/ShareSummary.tsx`. The old URL redirects to `/care/share?s=`.
- The end of a check links into Care. Today's "Recent recommendation" card opens the Care hub for that check.

Verified in the browser at 390 px:
- Mdm Tan's latest check (T3): hub → plan → find → polyclinic detail → visit summary → share → recommendation, and `/caregiver/<id>` → `/care/share`.
- A T1 check: hub without "Share with family", "Call 995 or go to the nearest A&E"; Find care shows only the 995 button and A&E.
- `tsc` and `eslint` are clean.

### 11. P1 — Build a Care Plan screen ✅
- [x] Now / Today / Next / If symptoms worsen
- [x] Actionable instructions, not just informational

What changed:
- `lib/carePlan.ts` → `buildPlan(snapshot)` arranges the disposition's own content into a timeline: care actions, escalation advice split into sentences, self-care steps, re-check and warning signs. It only adds practical steps (find care, take your visit summary) and never sets or changes urgency.
- Per tier:
  - **T1:** Call 995 / nearest A&E / do-not-drive advice.
  - **T2:** call your GP (by name) to be seen today; if not, A&E.
  - **T3:** book your GP; watch for changes; see your doctor within 2–3 days.
  - **T4:** the self-care checklist and the scheduled check-in.
  - **ABSTAIN:** call your GP or a nurse; ask your trusted person for help.
- `app/care/plan/page.tsx` is a vertical timeline (Now / Today / Next / If symptoms get worse).
  - Steps have action buttons: Call 995, Find care, Nearest A&E in maps, Show visit summary, Share with {name}, Check in now.
  - Steps that can be finished have a "done" tick, saved per check in `localStorage` with try/catch fallback. Emergency steps can't be ticked off.
  - "If symptoms get worse" lists the tier's escalation advice, the warning signs and a Call 995 button.

Verified in the browser at 390 px:
- Plans for T1, T2, T3, T4 (a new Mdm Siti within-usual check via the API) and ABSTAIN all read correctly.
- A tick survives a reload.
- T4 "Check in now" → `/check/concern` with "Hello again, Mdm Siti. Last time you said…".
- `tsc` and `eslint` are clean.

### 12. P1 — Improve Find Care ✅
- [x] GP / Polyclinic / A&E / Usual provider
- [x] Distance/address if available
- [x] Never fake appointment availability

What changed, backend:
- `UserProfile.usual_gp_details` (`ProviderDetails`: address, lat, lng), optional.
- The demo personas' fictional clinics get "‹Town› town centre (demo address)" with approximate town-centre coordinates. No phone numbers, because a fake number could dial a real one.
- The address and location go only to the patient's screen (snapshot). The agent's `get_health_profile` view leaves them out. New test: `test_clinic_location_reaches_the_screen_not_the_agent`.
- Existing local databases keep their old profiles until re-seeded (the field is optional). I refreshed the demo profiles in `data/`.

What changed, frontend:
- `/care/find` groups places as **Best for you now** (highlighted), **Other options**, and **In an emergency** (A&E, for T3/T4/ABSTAIN). T1 shows Call 995 and A&E only.
- Each card shows type, name, address if known, distance if known, and "When: …" for this recommendation. Buttons: **Directions** (to known coordinates) or **Find nearest** (a "near me" map search), and **Details**.
- Distance is opt-in ("Show how far away your clinic is"). It uses browser geolocation, is calculated on the device (haversine), and is never stored or sent. Denied/unavailable states are handled. It only appears for places with known coordinates (the usual clinic). Nearest polyclinic/GP/A&E is left to the maps app.
- Availability: Find care says WISP can't see opening hours, waiting times or appointment slots and doesn't book. Provider detail has an "Opening hours and appointments" card: "WISP can't see these, please call". For A&E it gives the true general statement that Singapore emergency departments are open 24 hours.
- New `components/care/ProviderCard.tsx`. `lib/care.ts` gains `directionsHref`, `distanceKm`, `distanceLabel`, `useMyLocation`.

Verified:
- Backend `pytest`: 127 passed.
- Browser at 390 px:
  - T2 list order: usual clinic (best) → polyclinic → GP → A&E ("if no clinic can see you today").
  - With a stubbed browser location near Bishan, the usual clinic showed "About 1.9 km away". The stub avoided the real browser permission prompt.
  - T3 puts A&E under "In an emergency" ("Only if warning signs appear").
  - The A&E detail page reads correctly.
- `tsc` and `eslint` are clean.

### 13. P1 — Build a Doctor Visit Summary ✅
- [x] Complaint, duration, important symptoms
- [x] Functional assessment result, baseline comparison
- [x] WISP recommendation
- [x] Patient can show the screen or share it

What changed:
- `lib/visitSummary.ts` → `buildVisitSummary(snapshot, baseline)` and `summaryText()`. The summary is clinician-facing, so it can include numbers the patient screens hide.
- Sections:
  - Main concern (the patient's words).
  - Duration and onset.
  - Important symptoms: warning signs reported / also reported / unsure about / denied.
  - Movement check: 5xSTS total time, rise count, per-rise times, arm use. If not done, it says why (declined / emergency sign / no baseline / not needed). If unusable, it says why.
  - Compared with their usual: the comparison label, plus the usual range, median, number of healthy-day checks and last updated.
  - Known conditions.
  - WISP's recommendation with its reasons.
- Honesty: a prominent amber notice whenever the movement data isn't live ("recorded SYNTHETIC sensor session (demo)"), plus a disclaimer (prototype, not a diagnosis, thresholds not clinically validated, arm use self-reported). Both are kept in the shared/copied text.
- `/care/visit-summary` offers:
  - **Show to my doctor:** a full-screen, large-text dialog with Close and Escape.
  - **Print or save PDF:** `window.print`. The app header, tabs, demo bar, footer and Care navigation are `print:hidden`.
  - **Share:** the Web Share API, falling back to copying the text.

Verified in the browser at 390 px:
- T2 measured check: all sections, including "15.8 s for 5 rises", "Usual range 11.3 s–11.8 s (median 11.5 s) from 3 healthy-day checks", and the SYNTHETIC notice.
- No-check T3: "Not done (patient chose not to)".
- T1: "Not done (emergency warning sign reported)".
- Unreliable reading: the notice and reason are shown.
- Share fallback copied the full text with the notice and showed "Copied…". The doctor view fills the screen, focuses Close and closes on Escape.
- Not clicked: Print, because the browser print dialog would block automation. Print-hiding is done with Tailwind `print:` classes.
- `tsc` and `eslint` are clean.

### 14. P1 — Turn follow-up into its own flow ✅
- [x] Better / Same / Worse / Something new
- [x] Compare to previous session
- [x] New red flags override previous normal result
- [x] Keep current reassessment safety logic

What changed, backend:
- `LocalAgent.follow_up(trend, text)`.
  - Better / same / worse carry over the previous complaint, gradual onset, and duration plus the days since. "Worse" records `getting_worse`, which the rules already treat as a concerning finding (SR-3).
  - "Something new" needs words and is handled as a new complaint.
  - Added words are screened for red flags and modifiers like any typed message.
  - Every safety question is asked again in the new session, and the previous result stays context only.
  - Documented as FU-1 in `docs/safety.md`.
- `POST /api/sessions/{id}/followup` accepts optional `trend` / `text`, validated before a session is created. Without them it behaves as before (chat view, WorkBuddy). `open(greet=False)` now also skips the follow-up greeting.
- Tests: 9 new (`tests/test_follow_up.py` plus `test_follow_up_endpoint_validates_trend`). They cover: carry-over + safety re-asked for each trend; worse → getting-worse reason; "new" + confusion → T1 and sensing locked; "better but chest pain" → T1; "new" without words refused; invalid trend refused with no session created. Total 135 passed.

What changed, frontend:
- `/follow-up?prev=` shows "Hello again", a "Last time" card (what you said, outcome, movement result) and four big cards: Better / About the same / Worse / Something new. It also keeps the 995 link.
- `/follow-up/changes` asks for optional words (required for "Something new"), then starts the check-in with `confirm_summary`, so it joins the normal Check flow (safety → summary → decision…).
- Every "Check in now" / "Start check-in" goes to `/follow-up`. WorkBuddy check-ins still start straight into its conversation. Shell: `/follow-up` belongs to the Check tab.
- `/check/complete` for a follow-up shows "Compared with your last check: last time … · today …", noting that today's answers decide and last time is only background.
- Durations are rounded for display (a carried-over "3.5 days" now reads "4 days").

Verified in the browser at 390 px:
- Mdm Siti's T4 check → `/follow-up` shows last time (home monitoring, movement within usual range).
- Something new + "My daughter said I seemed confused last night" → **T1**, with the last-time/today card (Scenario 3 through the new flow). Continue stays disabled until words are entered.
- Worse, skipping the words → safety restarts at "Question 3 of 11" (onset and duration carried over) → summary shows "Also mentioned: Getting worse".
- `tsc` and `eslint` are clean.

### 15. P1 — Upgrade History ✅
- [x] Health timeline instead of plain records
- [x] Complaint, recommendation, movement check used / not used, follow-up status
- [x] Healthy-day baseline entries
- [x] Click into full check details

What changed, backend:
- `/api/history` items also carry `agent`, `functional_status`, `comparison_status` and `comparison_severity`. These are semantic labels only, never timings. Test: `test_history_includes_semantic_movement_result_only`. Total 136 passed.

What changed, frontend:
- `/history` is a day-grouped vertical timeline with filters: Everything / Checks / Healthy days.
- Check cards show:
  - "Check" or "Follow-up of ‹day›", with the time.
  - The complaint in the patient's words, and the outcome in its tier colour.
  - A movement chip: within your usual / a little slower / slower than usual / couldn't be compared / reading not reliable / stopped early / skipped / no movement check (`lib/movementWords.ts`, same wording as the result screen).
  - "Check-in planned", and "Followed up: ‹outcome›" on the original check.
- Unfinished checks show "Continue this check" (back into the Check flow; WorkBuddy ones open the conversation).
- Planned check-ins have "Check in now". Healthy-day entries link to My usual.
- New `/history/[session]` detail page:
  - Date and type; the outcome in its tier colour.
  - "What you told WISP": how long, other changes, warning signs, movement check.
  - Follow-ups: the earlier check and later follow-ups, with their outcomes.
  - The patient-friendly "How WISP decided".
  - Links to the care plan, visit summary and conversation.

Verified in the browser at 390 px (Mdm Siti):
- The timeline shows the T4 check with "Movement within your usual" and "Followed up: emergency help", the T1 follow-up with "No movement check", unfinished check-ins with "Continue this check", and three healthy-day entries.
- The detail page for the T4 check shows all sections. Its follow-up link resumes an unfinished check-in.
- `tsc` and `eslint` are clean.

Testing note: restarting the API had left stale uvicorn instances running alongside the new one (they wait for open WebSockets). I stopped them all so exactly one instance runs the current code.

### 16. P1 — Expand "My Usual" ✅
- [x] Baseline progress: 1/3, 2/3, 3/3 healthy-day checks
- [x] Current status: stable / insufficient baseline
- [x] Last updated
- [x] "Record another healthy-day check"
- [x] Exact seconds behind "View details"

What changed, backend:
- Healthy-day checks can be stopped. `POST /api/baselines/{user}/sessions` runs the capture as a cancellable task, and the new `POST /api/baselines/{user}/stop` cancels it. A stopped (or abandoned) check returns `reason: "stopped"` and nothing is added to the usual pattern. Before, a check the patient abandoned could still have been saved.
- A second concurrent enrolment is refused (409).
- Tests: `tests/test_baseline_enrol.py` (stopped → not added, baseline unchanged, stop again → 409; completed → added). Total 138 passed.

What changed, frontend:
- My usual moved to `/you/baseline`. `/baseline` redirects, and the links on Today, History and You were updated.
  - A 1 → 2 → 3 step tracker ("2 of 3 done", plus the total when more than 3).
  - Status: Not set up yet / Not enough checks yet / Stable / Varies a little, using the same 15 % rule as v2 (`lib/baseline.ts`).
  - "Last updated".
  - Exact seconds and per-check times only behind "View details", with a [synthetic]/[recorded] tag.
  - Delete uses an inline confirmation instead of `window.confirm`.
- New `/you/baseline/enroll` journey, one task per screen:
  1. "Feeling like your usual self today?" "Not really" leads to "do this another day" and a link to start a check.
  2. Keep-it-the-same checklist (same chair and wall, same spot, arms the same way, no one moving), all ticked to continue.
  3. "Do you usually push up with your arms?" (recorded as `arms_used`), which starts the check.
  4. Full-screen check: "Sit still… 3, 2, 1", then stand five times, with Stop always visible.
  5. Result: added (n of 3, status once complete) / stopped, nothing saved / reading not clear (reason in the same wording as the movement result, now shared via `lib/movementWords.ts`).

Verified in the browser at 390 px:
- Mr Lim (no baseline): `/baseline` → `/you/baseline` shows "0 of 3 · Not set up yet".
- Enrolment at 8× replay → "Thank you. That check has been added. 1 of 3".
- A second enrolment stopped two seconds in → "You stopped the check. Nothing was saved", and the API still shows 1 session.
- Inline delete → back to 0 of 3. This also restored Mr Lim's no-baseline demo state.
- Mdm Tan: ✓✓✓ "3 of 3 done · Stable · last updated yesterday". View details shows 11.5 s (11.3–11.8) and three [synthetic] sessions.
- `tsc` and `eslint` are clean.

### 17. P1 — Create a proper "You" section ✅
- [x] Health profile, mobility information, usual GP
- [x] Trusted people (list; removing someone and the sharing redesign are task 18)
- [x] Language, accessibility
- [x] Privacy, data deletion

What changed, backend:
- `GET /api/profile/{user_id}` (`WispService.profile_for_screen`) returns the person's own profile for their screens, including medications, sex, preferred language and clinic details.
- The agent's `get_health_profile` view is unchanged and still has no medications, so the privacy page's "medication list never sent" stays true. Test: `test_profile_for_own_screen_includes_medications_but_agent_view_does_not`. Total 139 passed.

What changed, frontend:
- `/you` hub: name, age, home, then groups. Your health (health profile, My usual with its live status); People (trusted people); Settings (language, accessibility with current values); Privacy.
- `/you/health` (read-only, honestly labelled as a demo profile that can't be edited in the prototype):
  - About you: age, home.
  - Conditions.
  - Medicines, with "stays on this device, not sent to the assistant".
  - Mobility: getting up from a chair, walking aid.
  - Usual GP: address and Directions.
- `/you/caregivers`: the trusted person and the sharing rules (asked every time, preview first, no sensor data).
- `/you/language`: large radio cards and a note that the zh/ms/ta wording is still being checked by native speakers (as `triage/i18n.py` says).
- `/you/accessibility`: Larger text, and a new **Less motion** preference (`html[data-motion="reduce"]` turns off animations, alongside the OS setting). Voice input availability is detected.
- `/you/privacy` is the v2 privacy page moved here. "Delete all my WISP data" uses an inline confirmation instead of `window.confirm`. `/privacy` redirects.
- Shared `components/you/YouPage.tsx` and `lib/useProfile.ts`.

Verified in the browser at 390 px:
- `/privacy` redirects to `/you/privacy`. The hub shows "My usual: Stable", "Daniel (son)", "English", "Standard text".
- The health profile lists hypertension and amlodipine, mobility and the clinic address.
- Less motion sets `data-motion=reduce` and back.
- The delete confirmation opens and "Keep my data" cancels it. I did not delete the demo data.
- `tsc` and `eslint` are clean.

### 18. P1 — Redesign caregiver sharing ✅
- [x] Preview exactly what will be shared
- [x] Explicit consent
- [x] No raw CSI, no unnecessary private information
- [x] Option to remove trusted person

What changed, backend:
- `caregiver_summary(include_reasons=False)`: by default only the recommendation and what to do. The reasons repeat the person's symptoms, so they're opt-in. When included they're labelled "What WISP told ‹name›" (they're written as "You've been…"). Never sensor data, timings, medicines or conditions.
- The response also lists previous shares.
- `share_summary(include_reasons)` stores the exact text that was sent (identical to the preview) and needs `consent` to be literally `true`.
- `DELETE /api/profile/{user}/caregiver` (`WispService.remove_caregiver`). Afterwards nothing can be shared (409), and the built-in agent no longer offers to share. `not_found` maps to 404.
- `docs/privacy.md` updated.
- Tests: `tests/test_sharing.py` (minimal by default and no symptoms/medicines; with-reasons variant; consent-only and exact-preview record; removal blocks sharing and the agent's offer; unknown user 404). Total 142 passed.

What changed, frontend:
- `components/care/ShareSummary.tsx` (`/care/share`):
  - The recipient card, and an "Include the reasons" switch (off by default).
  - "Exactly what Daniel will receive" (the live preview), and a "Never shared" list.
  - An "I agree to send this message to Daniel" tick. Send stays disabled until it's ticked, and changing the preview un-ticks it.
  - "Don't share", and an "Already shared" history.
- The end-of-check share question no longer shares without a preview. `/check/complete` shows **Preview and share** (→ `/care/share`) or **No, thank you**, and hides the prompt once a share decision exists.
- `/you/caregivers`: "Remove ‹name›" with inline confirmation. "No one added" explains that adding isn't available in the prototype. The sharing rules are listed.

Verified in the browser at 390 px:
- Mdm Tan's T2 check: minimal preview by default. "Include the reasons" shows the "What WISP told Mdm Tan" lines and resets agreement. Send is disabled until agreed. Sending → "Sent to Daniel", history shows it, and the API records 1 share.
- Mr Lim: removing Mrs Lim → "No one added", and the API caregiver is null. I restored his demo profile afterwards.
- Mdm Siti's finished check: the prompt offers "Preview and share" (→ `/care/share?s=…`), and "No, thank you" dismisses it.
- `tsc` and `eslint` are clean.

### 19. P1 — Preserve separate Technical View ✅
- [x] Structured decision record: safety result, care range, missing evidence, selected action, tool calls, baseline result, rule triggered, final tier
- [x] Do not expose chain-of-thought

v2's `/explain/[id]` already covered every listed item (concern, safety screen, care range with floor/ceiling, missing information, options considered, selected action and why, tool called, sensor result, baseline result, care-tier change, final disposition with rule hits, tool-call timeline). It's labelled "not model chain-of-thought" and shows only the structured `trace`. This task kept it working with v3.

What changed:
- New v3 events are now in the record:
  - The **follow-up answer** (better/same/worse/new, and whether own words were added and screened).
  - **Patient corrections** from the summary screen (the facts changed, with the ORD-5 note).
  - **Sharing** (shared after preview + consent, with reasons or recommendation only, or declined).
- The timeline now also shows `follow_up_answer`, `check_skipped_by_patient` and `check_stopped_by_patient`.
- Backend: `follow_up()` audits `follow_up_answer` (actor patient, result = trend, `added_words`). The share audit records `include_reasons`. New test `test_follow_up_answer_is_audited_for_the_technical_view`. Total 143 passed.
- "Patient view" now opens the v3 screen: `/history/[id]` when finished, the Check flow when unfinished, or the conversation for WorkBuddy. It used to open the v2 chat page.
- The demo bar's "Technical view (this check)" finds the check on v3 screens: `/history/:id`, `/explain/:id`, `?s=` (Check and Care) and `?prev=` (Follow-up), as well as `/session/:id`.

Verified:
- A follow-up built through the API (worse + own words → a duration correction → declined via the agent → shared with reasons) shows all three new record sections, `follow_up_answer → worse` in the timeline, and Patient view → `/history/…`.
- With demo mode on, the Technical-view link points at the right session on `/care/plan?s=`, `/check/complete?s=` and `/follow-up?prev=`. Demo mode was switched back off.
- `tsc` and `eslint` are clean.
- Known limit: the demo bar reads `?s=` on each route change, so switching between two Care pages for different checks without a path change could show the previous check's link until the next navigation.

### 20. P1 — Preserve and polish Engineering View ✅
- [x] Live ESP32 connection, real vs recorded data
- [x] CSI heatmap, motion signal, detection window
- [x] Ground-truth timing entry, audit log
- [x] WorkBuddy tool-call filter

v2's `/dev` already had all eight items: the `LiveSensor` panel (ESP32 connect, Wi-Fi provisioning, CSI heatmap), sensor source and replay controls, motion-energy and posture charts with the detected window shaded and standing peaks marked, ground-truth entry, the validation summary and an audit log. Kept as is and polished.

Polish (frontend):
- Real vs recorded: coloured **LIVE / RECORDED / SYNTHETIC** badges in the measurements table, a mode filter (All / Live only / Recorded-synthetic), and a badge plus "Not real-world evidence" on the selected measurement's charts.
- Ground truth:
  - Input validated (2–120 s, matching the API). Save is disabled until valid and shows an inline error.
  - Method picker (stopwatch / phone video).
  - A saved/error message. Before, a blank value posted `NaN` and failed silently.
- Audit log:
  - Filters: All / **WorkBuddy tool calls** (actor workbuddy *and* a tool, not every WorkBuddy event) / Agent decisions / Deterministic rules / Patient / Sensing.
  - A session filter, an event count, and an expandable `data` payload per event.
  - Session ids link to `/explain/…`. Loads the latest 600 events (the API returns at most 500).
- Measurement session ids link to the Technical view.
- Demo shortcuts start the v3 Check flow (with `confirm_summary`) instead of the v2 chat page. The Demo 3 day-2 hint describes the v3 follow-up path.

Two v2 bugs found and fixed (backend):
1. **The audit log stopped updating after 500 events.** `store.audit()` without a session returned the *oldest* 500 events (`ORDER BY id LIMIT`), so new events, including every WorkBuddy call, never appeared. It now returns the latest N in chronological order. Per-session queries, used by the decision trace, are unchanged. Test: `test_global_audit_returns_the_latest_events`.
2. **Healthy-day measurements had no detection window.** The enrol endpoint stored only `trace`/`features`, not `onset_s`/`offset_s`/`stand_peaks_s`, so their charts couldn't shade the window. It now stores them. The `test_completed_healthy_day_check_is_added` test asserts them.
- Total 144 passed.

Verified in the browser (desktop):
- Badges and the mode filter (0 live / 14 recorded-synthetic rows).
- An assessment measurement shows 2 shaded windows and 10 peak lines (5 per chart).
- Ground-truth Save is disabled for "abc" with the error, and enabled for "12.4". I didn't save, to keep the real-participant table clean.
- Audit filter counts.
- After one local WorkBuddy tool call through the API, the WorkBuddy filter showed `screen_red_flags → incomplete` with its payload. Before the fix it showed 0.
- `tsc` and `eslint` are clean.
- Leftover from that test: an unfinished WorkBuddy session for Mdm Siti (`s_1117dfe50f39`). The Dev page's reset clears it.

### 21. P1 — Improve mobile UX ⬜
- [ ] Design primarily for 390 px
- [ ] Large touch targets, bottom navigation
- [ ] Primary action visible without scrolling (task 3 found that the summary screen's Continue sits just below the fold at 390×844)
- [ ] No desktop-first cards squeezed onto mobile
- [ ] Test all T1–T4 results

## Log

- 2026-10-07 — ✅ Task 20: Engineering view polish (mode badges and filter, validated ground-truth entry, richer audit filters with payloads). Fixed two v2 bugs: the audit log froze after 500 events, and healthy-day checks had no detection window (144 tests pass).
- 2026-10-07 — ✅ Task 19: Technical view kept and extended with follow-up answer, patient corrections and sharing decisions; links to and from it work from all v3 screens (143 tests pass).
- 2026-10-07 — ✅ Task 18: Sharing redesign (minimal by default, opt-in reasons, exact preview, explicit agree tick, history, remove trusted person). No sharing without a preview anywhere (3 new tests, 142 pass).
- 2026-10-07 — ✅ Task 17: You section with hub, health profile, trusted people, language, accessibility (new Less motion) and privacy with inline delete. Backend `GET /api/profile/{user}` for the person's own screen (139 tests pass).
- 2026-10-07 — ✅ Task 16: My usual at `/you/baseline` (progress tracker, status, last updated, seconds behind details, inline delete) and an `/you/baseline/enroll` journey. Backend: healthy-day checks can be stopped and are then discarded (2 new tests, 138 pass).
- 2026-10-07 — ✅ Task 15: History timeline (filters, movement result, follow-up links, continue unfinished, healthy-day entries) and a `/history/[session]` detail page. History API adds semantic movement fields (136 tests pass).
- 2026-10-07 — ✅ Task 14: follow-up flow (`/follow-up`, `/follow-up/changes`) with better / same / worse / something new, last-time vs today on the result, and backend `follow_up()` that re-asks every safety question (FU-1, 9 new tests, 135 pass).
- 2026-10-07 — ✅ Task 13: Doctor visit summary with 5xSTS timings vs usual range, symptom answers, conditions and recommendation, a synthetic-data notice, and show-to-doctor / print / share.
- 2026-10-07 — ✅ Task 12: Find Care with best / other / emergency groups, the usual clinic's demo address (screen only, not sent to the agent), opt-in on-device distance, and explicit "WISP can't see hours or slots".
- 2026-10-06 — ✅ Task 11: Care Plan timeline (Now / Today / Next / If worse) built from the disposition, with action buttons and done-ticks. Checked for all five tiers.
- 2026-10-06 — ✅ Task 10: Care is now a section: hub plus recommendation, plan, find care, provider detail, visit summary, share and follow-up. `/caregiver/[id]` redirects to `/care/share`.
- 2026-10-06 — ✅ Task 9: movement-result screen with number-free comparison picture and patient wording for all outcomes. Routing fix so an attempted check always shows its result.
- 2026-10-06 — ✅ Task 8: full-screen movement check with countdown, WISP line, a five-dot counter only when live counts are reliable, and Stop always visible.
- 2026-10-06 — ✅ Task 7: Room Ready screen with setup checklist, steady question and room question. Confirmed no sensing before Start; "not steady" → T2.
- 2026-10-06 — ✅ Task 6: agent-decision screen showing the options WISP weighed and the one it chose, with a plain-language reason. Auto-continues when no check is needed.
- 2026-10-06 — ✅ Task 5: "What WISP understood" screen with corrections. Backend: opt-in `confirm` step, `/corrections` endpoint, ORD-5, and 14 new tests (126 pass).
- 2026-10-06 — ✅ Task 4: dedicated Safety Check screen with question counter, large Yes/No/Not sure buttons and an always-visible 995 link. "Not sure" → ABSTAIN verified.
- 2026-10-06 — ✅ Task 3: dedicated Check flow (9 routes) over the existing agent. Scenario 1 → T2, a mid-check red flag → T1, declining the check → T3.
- 2026-10-06 — ✅ Task 2: Today dashboard with symptom cards, new check-in shortcut, next check, last recommendation and baseline status.
- 2026-10-06 — ✅ Task 1: five-tab navigation (Today / Check / Care / History / You), `/` → `/today`, new Check, Care and You hubs.
- 2026-10-06 — Tracker created. Branch `v3/patient-app` cut from `origin/refactor/product-v2` @ `8e482b0`.
