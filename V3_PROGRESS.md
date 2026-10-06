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
| 4 | P1 | Replace chat-style red-flag questions | ⬜ |
| 5 | P1 | Add "What WISP understood" screen | ⬜ |
| 6 | P1 | Add an agent-decision screen | ⬜ |
| 7 | P1 | Create a proper Room Ready screen | ⬜ |
| 8 | P1 | Redesign the movement test as an immersive experience | ⬜ |
| 9 | P1 | Add a movement-result screen | ⬜ |
| 10 | P1 | Expand Care into a real section | ⬜ |
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

### 4. P1 — Replace chat-style red-flag questions ⬜
- [ ] Dedicated "Safety Check"
- [ ] One question per screen
- [ ] Progress indicator
- [ ] Large Yes / No / Not sure buttons
- [ ] Keep deterministic backend rules unchanged
- [ ] Immediately route red flags to emergency care

### 5. P1 — Add "What WISP understood" screen ⬜
- [ ] Main complaint
- [ ] Duration
- [ ] Associated changes
- [ ] Safety screen result
- [ ] Allow user to correct mistakes before continuing

### 6. P1 — Add an agent-decision screen ⬜
- [ ] "WISP is checking what would help next…"
- [ ] If sensing is useful: explain why; "Do the check / Continue without it"
- [ ] If sensing is unnecessary: go directly to recommendation
- [ ] Make this the signature agentic moment

### 7. P1 — Create a proper Room Ready screen ⬜
- [ ] Chair against wall
- [ ] No wheels
- [ ] Clear surrounding area
- [ ] Ask whether someone else is moving nearby
- [ ] Ask whether user feels steady enough
- [ ] Only activate sensing after confirmation

### 8. P1 — Redesign the movement test as an immersive experience ⬜
- [ ] Near-full-screen layout
- [ ] "Quick movement check"
- [ ] WISP line animation
- [ ] Five-step counter if reliable
- [ ] Stop button always available
- [ ] No CSI graphs, timing numbers or confidence % on patient UI

### 9. P1 — Add a movement-result screen ⬜
- [ ] "Within your usual range" / "Slower than your usual pattern" / "Unable to compare" / "Reading wasn't reliable"
- [ ] Explain that this does not diagnose the cause
- [ ] CTA: "See my next step"
- Note from task 3: `comparison.explanation` from the backend reads technically ("outside this user's usual recorded range"). Patient wording is needed here.

### 10. P1 — Expand Care into a real section ⬜
- [ ] Recommendation
- [ ] Care plan
- [ ] Find care
- [ ] Provider detail
- [ ] Visit summary
- [ ] Share with family
- [ ] Follow-up plan

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

- 2026-10-06 — ✅ Task 3: dedicated Check flow (9 routes) over the existing agent. Scenario 1 → T2, a mid-check red flag → T1, declining the check → T3.
- 2026-10-06 — ✅ Task 2: Today dashboard with symptom cards, new check-in shortcut, next check, last recommendation and baseline status.
- 2026-10-06 — ✅ Task 1: five-tab navigation (Today / Check / Care / History / You), `/` → `/today`, new Check, Care and You hubs.
- 2026-10-06 — Tracker created. Branch `v3/patient-app` cut from `origin/refactor/product-v2` @ `8e482b0`.
