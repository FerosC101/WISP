# WISP — Wireless Intelligent Sensing for Personalized Self-Triage

> When "I just feel weak" is all you can say, WISP can check whether your physical function is actually different from your usual self, then tell you what to do next and why.

**Tencent Cloud AI CAN DO IT Hackathon 2026 · Healthcare Track · Case Study 1: "AI Grandma Knows Best" — Intelligent Self-Triage and Care Navigation**

---

## 1. Project overview

WISP is a self-triage and care-navigation agent for older adults with vague complaints ("I feel weak", "I'm slower today", "I don't feel like myself"). It is **not** a monitoring dashboard and **not** a diagnostic system.

Technically: WISP is a self-triage agent that decides whether a short contactless functional assessment could materially improve a care recommendation, performs that assessment only when safe and relevant, compares the result against the patient's personal baseline, and incorporates it into an explained, rule-governed disposition.

The patient experience is deliberately simple: *How are you feeling?* → a short conversation → safety questions → an optional quick movement check → a clear next step with reasons and warning signs. The complexity (agent, safety rules, sensing, baseline, audit) sits underneath and is shown only in the Technical and Engineering views.

Every check ends in one of five care decisions — **Emergency (T1) · Same-day care (T2) · Primary care soon (T3) · Self-care with monitoring (T4) · Cannot safely assess (ABSTAIN)** — with what to do, where, when, why, and which warning signs would change the advice.

## 2. Problem statement

Older adults living alone in Singapore often notice something is "off" but can only describe it vaguely. Vague complaints are hard to triage remotely: over-triage overwhelms A&E; under-triage misses real deterioration. The missing piece is usually objective evidence about whether the person's function has actually changed from *their own* normal.

## 3. Challenge alignment

| Case study ask | WISP |
|---|---|
| Intelligent self-triage | Conversational intake + deterministic red-flag screen + rule-governed tiers |
| Care navigation | Singapore-specific actions (995 / A&E / GP or polyclinic today / within days / home monitoring with re-check) |
| "Grandma knows best" | Personal baseline: compared with *her* usual movement, not population averages |
| Trust & safety | Asymmetric urgency rule, abstention, auditable Decision Trace, consent-based sharing |

## 4. Core innovation

**The agent decides when it needs physical evidence.** It requests the Five-Times Sit-to-Stand (5xSTS) test only when emergency signs are ruled out, the complaint is functional, the person feels safe, nobody else is moving nearby, a baseline exists, and the result could change the tier. It visibly *refuses* to sense when an emergency sign already decides the answer.

And: **sensing may increase urgency but never lowers it below the symptom-based safety floor.**

## 5. Architecture

```
PATIENT ─▶ WORKBUDDY (or built-in agent) ─MCP─▶ wisp MCP server ─token─▶ WISP local API
                                                                          │
     rules/ (red flags · ranges · eligibility · care tier)  ◀─────────────┤
     sensing/ provider ─▶ ESP32 Wi-Fi CSI or recorded replay ─▶ 5xSTS pipeline
     store (SQLite · encrypted baseline · signed measurements · audit log)
                                                                          │
PATIENT SCREEN (Next.js) ◀────── WebSocket: chat · check steps · recommendation · decision trace
```

Details: [docs/architecture.md](docs/architecture.md).

**Three views, never mixed:**

| View | Where | For |
|---|---|---|
| **Patient** (default) | `/` home, conversation, *Quick movement check*, recommendation, History, My usual, Privacy | The person checking in. No tool names, care floors, confidences or signals. "How WISP decided" explains in plain language. |
| **Technical view** | `/explain/<session>` (link in the DEMO bar) | Judges: concern → safety screen → care range → missing info → options → selected action + why → tool called → sensor result → baseline → care-tier change → final disposition with rule IDs, plus a tool-call timeline by actor. Structured record, not model chain-of-thought. |
| **Engineering view** | `/dev` (not linked from patient navigation) | Sensor source, live vs replay, synthetic vs real, measurement table, CSI-derived plots, ground truth, audit log, WorkBuddy tool calls, demo launchers. |

```
apps/web/                 Next.js 16 + TypeScript + Tailwind v4 patient UI
services/src/wisp/
  rules/                  deterministic safety + care-tier engine
  baseline/               personal-baseline comparison
  sensing/                provider interface, ESP32 serial, replay, signal pipeline, synthetic generator
  triage/                 built-in agent + NL → structured extraction
  mcp/                    MCP server for WorkBuddy
  api/                    FastAPI REST + WebSocket
  audit/                  decision-trace builder
  demo/                   personas + seeding
services/tests/           109 tests (safety rules, ordering, security, pipeline, scenarios, API)
evaluation/               vignettes, fairness, red-flag extraction, sensor accuracy → results/report.md
docs/                     architecture, safety, privacy, demo script, WorkBuddy integration
hardware/esp32/           ESP32 CSI setup and calibration
scripts/                  demo.sh, workbuddy_simulator.py
data/                     local DB, encryption key, recordings (git-ignored)
```

## 6. WorkBuddy integration

WorkBuddy is the agent; WISP's tools are the safety-constrained hands.

- WorkBuddy **understands vague language**, records structured facts (`record_case_facts`), notices what's missing, **chooses** whether a physical check is worth it (`log_decision`), calls the tools, and explains the result.
- WISP's deterministic tools own emergency screening, sensing authorisation, care floors/ceilings and the final tier. WorkBuddy cannot skip, reorder or fabricate them.

Setup, MCP config, the agent skill and a step-by-step **live-connection checklist**: [docs/workbuddy/](docs/workbuddy/README.md). An offline built-in agent calls the same tools, so the demo still works without network access.

> **Status:** verified live with **Tencent WorkBuddy AI 5.7.6** (macOS, streamable HTTP) on 10 Oct 2026. Demo scenarios 1 (T2 via the movement check) and 2 (T1, sensing locked) both passed the 8-point checklist; results and findings are in [docs/workbuddy/README.md](docs/workbuddy/README.md).
>
> The demo uses **two screens**: the patient talks to WorkBuddy in the WorkBuddy app, and the WISP app is the screen in the room. It mirrors WorkBuddy's messages in large text, holds the movement check's start button and shows the recommendation. The WISP app does not accept typed messages for WorkBuddy sessions. Steps: [§11 Running the demo with WorkBuddy](#running-the-demo-with-workbuddy).

## 7. MCP tools

`get_active_session` · `get_health_profile` · `get_previous_assessments` · `record_case_facts` · `screen_red_flags` · `log_decision` · `check_assessment_eligibility` · `run_functional_assessment` · `compare_to_baseline` · `decide_care_tier` · `schedule_recheck` · `share_summary` · `say_to_patient`

Enforcement: sensing only inside a patient-started session; red flag → sensing locked; single-use session-bound eligibility grants; HMAC-signed, session-bound measurements; strict input schemas; the patient presses start on their own screen.

## 8. Wi-Fi sensing setup

Two ESP32 boards running Espressif `esp-csi` (`csi_send` / `csi_recv`), receiver on USB. Pipeline: amplitude → Hampel outlier suppression → low-pass → per-subcarrier normalisation → motion-sensitive subcarrier selection → PCA → motion energy (test window) + posture signal (distance from seated state) → 5 standing peaks → total time, per-rise timing, confidence, single-person checks. No deep learning.

The agent never sees CSI: it receives `{total_time_seconds, rise_count, per_rise_seconds, confidences, source, timestamp, session_id, verified}`.

See [hardware/esp32/README.md](hardware/esp32/README.md). Real trials with stopwatch ground truth: `scripts/collect_trials.py` → `evaluation/sensor_accuracy/real_report.py`.

> **Status:** the ESP32 serial parser and live provider are implemented and unit-tested, but **no real ESP32 capture has been processed yet** (no hardware was attached while building). All sensing results so far are on synthetic CSI.

## 9. Local installation

Requirements: [uv](https://docs.astral.sh/uv/), Node.js 20+.

```bash
cd services && uv sync && uv run python -m wisp.demo.seed && cd ..
cd apps/web && npm install && cd ..
```

## 10. Demo setup — one command

```bash
./scripts/demo.sh            # API :8787 + web :3000, recorded sensor replay, built-in agent
./scripts/demo.sh --mcp      # + MCP server on :8765 for WorkBuddy
WISP_SENSOR_MODE=esp32 WISP_SERIAL_PORT=/dev/cu.usbserial-XXXX ./scripts/demo.sh   # live ESP32
```

Open http://localhost:3000. For demos, open http://localhost:3000/dev (Engineering view) and tick **Demo mode**: a thin DEMO bar then offers the profile switcher (Mdm Tan / Mr Lim / Mdm Siti), the Technical view and the Engineering view.

Safety questions can be asked in **English, 中文, Bahasa Melayu or தமிழ்** (selector on the home screen). Answer buttons send language-independent values, so the rules never parse translated text. Translations are drafts pending native-speaker review.

Optional LLM extraction via any OpenAI-compatible endpoint (e.g. Tencent Hunyuan): `WISP_LLM_BASE_URL`, `WISP_LLM_API_KEY`, `WISP_LLM_MODEL`. Merged conservatively — it can add warning signs, never remove them.

## 11. Demo scenarios

| # | Persona | Says | WISP does | Result |
|---|---|---|---|---|
| 1 | Mdm Tan, 78 | "I've felt weak for two days." (+ eating less) | Screen passes → "A short movement check could help" → **chooses** 5xSTS → clearly slower than her usual, needed arms | **T2 Please be seen today** · impact: Primary care soon → Same-day care |
| 2 | Mr Lim, 72 | "This morning I suddenly felt dizzy and my left hand feels clumsy." | Red flag → **SENSING NOT REQUESTED**, sensing locked | **T1 Call 995** |
| 3 | Mdm Siti, 80 | "I'm tired and don't feel like myself." → next day: "My daughter said I seemed confused last night." | Day 1: 5xSTS within range, re-check scheduled. Day 2: red flag | **T4 → T1**; yesterday's normal result is context only |
| 4 | Mdm Tan | (someone walks through during the check) | Measurement rejected: "I couldn't get a reliable reading, so I won't use that result." | **ABSTAIN** — speak to your doctor today |

Script: [docs/demo.md](docs/demo.md). All four run end-to-end in `services/tests/test_scenarios.py` and were exercised through the browser UI.

### Running the demo with the built-in agent

1. `./scripts/demo.sh`, then open http://localhost:3000/dev and tick **Demo mode**.
2. Under **Agent**, keep the built-in agent selected.
3. Press **Start as …** on Demo 1 or Demo 2. The patient app opens the Check flow; answer on screen. When the movement check appears, press **I'm seated — start**.
4. For Scenario 3 day 2 and Scenario 4, follow [docs/demo.md](docs/demo.md).

### Running the demo with WorkBuddy

One-time setup (details in [docs/workbuddy/README.md](docs/workbuddy/README.md)):

1. Add WISP to WorkBuddy's MCP config. On WorkBuddy AI desktop (macOS) this is `~/.workbuddy-ai/mcp.json`:
   ```json
   { "mcpServers": { "wisp": { "type": "http", "url": "http://127.0.0.1:8765/mcp", "alwaysLoad": true } } }
   ```
2. Install the skill: copy the body of [docs/workbuddy/SKILL.md](docs/workbuddy/SKILL.md) to `~/.workbuddy-ai/skills/wisp-triage/SKILL.md`, with front matter giving `name` and `description`.
3. Quit WorkBuddy completely (⌘Q) and reopen it. Under **My MCP**, `wisp` should be enabled with 13 tools.

Each demo:

1. `./scripts/demo.sh --mcp`. This starts the API on :8787, the MCP server on :8765 and the web app on :3000. If WorkBuddy was opened before the MCP server started, switch `wisp` off and on again under **My MCP** so it reconnects.
2. Open http://localhost:3000/dev, tick **Demo mode**, and under **Agent** choose **Tencent WorkBuddy via MCP**.
3. Press **Start as Mdm Tan** (Demo 1). The patient screen opens an empty session that says "Waiting for WorkBuddy to join this assessment…". Put this screen next to the chair.
4. In WorkBuddy, start a **new chat** and type as the patient: *"I've felt weak for two days. I've been eating less."* If WorkBuddy doesn't pick up the skill, say "Use the wisp-triage skill" first.
5. Answer WorkBuddy one question at a time: no to every warning sign, it came on gradually, steady enough to stand, nobody else in the room. Allow the `wisp` tools if WorkBuddy asks. Each WorkBuddy message also appears on the WISP screen.
6. When the WISP screen shows the movement check, press **I'm seated — start**. When WorkBuddy asks whether you pushed up with your arms, answer yes.
7. Expected: **T2 "Please be seen today"**, explained in WorkBuddy and shown on the WISP screen. The Technical view and the Engineering view's audit log (filter "WorkBuddy tool calls") show every tool call.
8. Scenario 2: press **Start as Mr Lim** (Demo 2), start a **new chat** in WorkBuddy and type *"This morning I suddenly felt dizzy and my left hand feels clumsy."* Expected: **T1, call 995**, sensing locked, and no movement check offered.

WorkBuddy attaches to the newest unfinished WorkBuddy session, so start each scenario's session on the WISP screen before its WorkBuddy chat. No WorkBuddy? `scripts/workbuddy_simulator.py` makes the same tool calls (it is labelled as a simulator, not WorkBuddy).

> The bundled sensor recordings are **synthetic** (generated by `sensing/synth.py`) and are labelled **RECORDED SENSOR SESSION · SYNTHETIC CSI** in the UI. Live demos should use the ESP32 provider or real recorded captures.

## 12. Safety architecture

- Red-flag screen runs on every update, before any physical assessment, in deterministic code.
- Asymmetric rule (SAFE-1): `final = more_urgent(symptom_floor, functional_tier)`.
- Self-care requires a verified, reliable, within-range measurement; no baseline / declined / unreliable never yields T4.
- Abstention never routes to self-care.
- The UI renders the `CareDisposition` object; it never invents its own interpretation.
- Decision Trace is a structured audit record (what was reported, what was measured, which rule fired, whether AI or rule made each step) — not model chain-of-thought.

Full rule tables and tests: [docs/safety.md](docs/safety.md).

## 13. Privacy architecture

Raw physical sensing stays local. WorkBuddy receives only the functional summary, baseline label and confidence (plus the conversation). Baselines are encrypted at rest; raw CSI debug files are optional and deletable; caregiver sharing needs explicit consent each time. Sensing is visible at all times: **OFF · ACTIVE · COMPLETE · LOCKED**. See [docs/privacy.md](docs/privacy.md).

## 14. Evaluation

```bash
cd services && uv run pytest                          # 144 tests
cd services && uv run python ../evaluation/run_all.py # → evaluation/results/report.md
```

Latest run (all synthetic — small samples, stated honestly):

| Evaluation | Result |
|---|---|
| End-to-end triage vignettes | 15/15 correct tier *and* correct sense/don't-sense decision |
| Fairness: tier flips when only age band, sex, living arrangement, language preference or phrasing style (incl. Singlish, Malay-/Mandarin-mixed) change | 0/51 |
| Red-flag extraction from free text (rules only; each flag is *also* asked directly) | 14/15 detected, 0 false positives; missed a Malay-only statement |
| 5xSTS timing on synthetic CSI (80 single-person sessions) | MAE 0.21 s (bias −0.21 s), 7 false rejections |
| Passer-by rejection on synthetic CSI (60 sessions) | 30/60 (50 %) |
| Real participants with stopwatch / video ground truth | **0 so far** — collect with `scripts/collect_trials.py`; `real_report.py` reports participants, trials, detections, rejections, MAE, median error and confidence distribution from recorded rows only |

No population-level fairness or real-world sensing accuracy is claimed.

## 15. Limitations

- Rule thresholds are prototype values and have not been clinically validated.
- Sensor results to date are on synthetic CSI; the pipeline must be re-tuned and validated on real ESP32 captures.
- Automatic multi-person detection is **experimental**: a single Wi-Fi link catches a passer-by only about half the time on synthetic data. The primary safeguard is asking "Is anyone else moving around in the room?" before the check.
- The ESP32 has not yet captured a real session. Tencent WorkBuddy has been run live for scenarios 1 and 2 only, with recorded (synthetic) sensor replay.
- With WorkBuddy, the patient converses in the WorkBuddy app and uses the WISP app as a second screen; the WISP app's own Check flow runs on the built-in agent.
- Translations of the safety questions need native-speaker review; recommendation screens are English only.
- Arm use is self-reported.
- English-centric rule extraction; non-English input recovers through follow-up questions, or through LLM extraction if configured.
- Clinic availability is not live; care links open map searches and the profile's usual GP.
- Caregiver delivery is simulated. 995 is never dialled automatically.

## 16. Future work

- Real-participant validation (stopwatch/video ground truth) and threshold tuning; second receiver link for better multi-person rejection.
- Additional providers behind the same `run_functional_assessment` interface: phone accelerometer, camera, mmWave, wearable.
- Clinician review using [docs/clinical_review.md](docs/clinical_review.md); integration with HealthHub / clinic booking.
- Fully multilingual conversation and recommendations (safety questions are already structured in four languages).
- Real caregiver notifications with consent management.
