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
| 11 | P1 | Build a Care Plan screen | ⬜ |
| 12 | P1 | Improve Find Care | ⬜ |
| 13 | P1 | Build a Doctor Visit Summary | ⬜ |
| 14 | P1 | Turn follow-up into its own flow | ⬜ |
| 15 | P1 | Upgrade History | ⬜ |
| 16 | P1 | Expand "My Usual" | ⬜ |
| 17 | P1 | Create a proper "You" section | ⬜ |
| 18 | P1 | Redesign caregiver sharing | ⬜ |
| 19 | P1 | Preserve separate Technical View | ⬜ |
| 20 | P1 | Preserve and polish Engineering View | ⬜ |
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

### 11. P1 — Build a Care Plan screen ⬜
- [ ] Now / Today / Next / If symptoms worsen
- [ ] Actionable instructions, not just informational

### 12. P1 — Improve Find Care ⬜
- [ ] GP / Polyclinic / A&E / Usual provider
- [ ] Distance/address if available
- [ ] Never fake appointment availability

### 13. P1 — Build a Doctor Visit Summary ⬜
- [ ] Complaint, duration, important symptoms
- [ ] Functional assessment result, baseline comparison
- [ ] WISP recommendation
- [ ] Patient can show the screen or share it

### 14. P1 — Turn follow-up into its own flow ⬜
- [ ] Better / Same / Worse / Something new
- [ ] Compare to previous session
- [ ] New red flags override previous normal result
- [ ] Keep current reassessment safety logic

### 15. P1 — Upgrade History ⬜
- [ ] Health timeline instead of plain records
- [ ] Complaint, recommendation, movement check used / not used, follow-up status
- [ ] Healthy-day baseline entries
- [ ] Click into full check details

### 16. P1 — Expand "My Usual" ⬜
- [ ] Baseline progress: 1/3, 2/3, 3/3 healthy-day checks
- [ ] Current status: stable / insufficient baseline
- [ ] Last updated
- [ ] "Record another healthy-day check"
- [ ] Exact seconds behind "View details"

### 17. P1 — Create a proper "You" section ⬜
- [ ] Health profile, mobility information, usual GP
- [ ] Trusted people
- [ ] Language, accessibility
- [ ] Privacy, data deletion

### 18. P1 — Redesign caregiver sharing ⬜
- [ ] Preview exactly what will be shared
- [ ] Explicit consent
- [ ] No raw CSI, no unnecessary private information
- [ ] Option to remove trusted person

### 19. P1 — Preserve separate Technical View ⬜
- [ ] Structured decision record: safety result, care range, missing evidence, selected action, tool calls, baseline result, rule triggered, final tier
- [ ] Do not expose chain-of-thought

### 20. P1 — Preserve and polish Engineering View ⬜
- [ ] Live ESP32 connection, real vs recorded data
- [ ] CSI heatmap, motion signal, detection window
- [ ] Ground-truth timing entry, audit log
- [ ] WorkBuddy tool-call filter

### 21. P1 — Improve mobile UX ⬜
- [ ] Design primarily for 390 px
- [ ] Large touch targets, bottom navigation
- [ ] Primary action visible without scrolling (task 3 found that the summary screen's Continue sits just below the fold at 390×844)
- [ ] No desktop-first cards squeezed onto mobile
- [ ] Test all T1–T4 results

## Log

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
