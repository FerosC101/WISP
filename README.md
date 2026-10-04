# WISP — Wireless Intelligent Sensing for Personalized Self-Triage

> When "I just feel weak" is all you can say, WISP can check whether your physical function is actually different from your usual self, then tell you what to do next and why.

**Tencent Cloud AI CAN DO IT Hackathon 2026 · Healthcare Track · Case Study 1: "AI Grandma Knows Best" — Intelligent Self-Triage and Care Navigation**

---

## 1. Project overview

WISP is a self-triage and care-navigation agent for older adults with vague complaints ("I feel weak", "I'm slower today", "I don't feel like myself"). It is **not** a monitoring dashboard and **not** a diagnostic system.

Technically: WISP is a self-triage agent that decides whether a short contactless functional assessment could materially improve a care recommendation, performs that assessment only when safe and relevant, compares the result against the patient's personal baseline, and incorporates it into an explained, rule-governed disposition.

Every check ends in one of five care decisions — **Emergency (T1) · Same-day care (T2) · Primary care soon (T3) · Self-care with monitoring (T4) · Cannot safely assess (ABSTAIN)** — with what to do, where, when, why, and which warning signs would change the advice.

## 2. Problem statement

Older adults living alone in Singapore often notice something is "off" but can only describe it vaguely. Vague complaints are hard to triage remotely: over-triage overwhelms A&E; under-triage misses real deterioration. The missing piece is usually objective evidence about whether the person's function has actually changed from *their own* normal.

## 3. Challenge alignment

| Case study ask | WISP |
|---|---|
| Intelligent self-triage | Conversational intake + deterministic red-flag screen + rule-governed tiers |
| Care navigation | Singapore-specific actions (995 / A&E / GP or polyclinic today / within days / home monitoring with re-check) |
| "Grandma knows best" | Personal baseline: compared with *her* usual chair-rise, not population averages |
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

Setup, MCP config and the agent skill: [docs/workbuddy/](docs/workbuddy/README.md). An offline built-in agent calls the same tools, so the demo works without network access.

## 7. MCP tools

`get_active_session` · `get_health_profile` · `get_previous_assessments` · `record_case_facts` · `screen_red_flags` · `log_decision` · `check_assessment_eligibility` · `run_functional_assessment` · `compare_to_baseline` · `decide_care_tier` · `schedule_recheck` · `share_summary` · `say_to_patient`

Enforcement: sensing only inside a patient-started session; red flag → sensing locked; single-use session-bound eligibility grants; HMAC-signed, session-bound measurements; strict input schemas; the patient presses start on their own screen.

## 8. Wi-Fi sensing setup

Two ESP32 boards running Espressif `esp-csi` (`csi_send` / `csi_recv`), receiver on USB. Pipeline: amplitude → Hampel outlier suppression → low-pass → per-subcarrier normalisation → motion-sensitive subcarrier selection → PCA → motion energy (test window) + posture signal (distance from seated state) → 5 standing peaks → total time, per-rise timing, confidence, single-person checks. No deep learning.

The agent never sees CSI: it receives `{total_time_seconds, rise_count, per_rise_seconds, confidences, source, timestamp, session_id, verified}`.

See [hardware/esp32/README.md](hardware/esp32/README.md).

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

Open http://localhost:3000. Developer tools (sensor source, "someone walks through", replay speed, CSI plots, audit log, ground-truth entry): http://localhost:3000/dev.

Optional LLM extraction via any OpenAI-compatible endpoint (e.g. Tencent Hunyuan): `WISP_LLM_BASE_URL`, `WISP_LLM_API_KEY`, `WISP_LLM_MODEL`. Merged conservatively — it can add warning signs, never remove them.

## 11. Demo scenarios

| # | Persona | Says | WISP does | Result |
|---|---|---|---|---|
| 1 | Mdm Tan, 78 | "I've felt weak for two days." (+ eating less) | Screen passes → **chooses** 5xSTS → clearly slower than her usual, needed arms | **T2 Please be seen today** · impact: Primary care soon → Same-day care |
| 2 | Mr Lim, 72 | "This morning I suddenly felt dizzy and my left hand feels clumsy." | Red flag → **SENSING NOT REQUESTED**, sensing locked | **T1 Call 995** |
| 3 | Mdm Siti, 80 | "I'm tired and don't feel like myself." → next day: "My daughter said I seemed confused last night." | Day 1: 5xSTS within range, re-check scheduled. Day 2: red flag | **T4 → T1**; yesterday's normal result is context only |
| 4 | Mdm Tan | (someone walks through during the check) | Measurement rejected: "I couldn't get a clear reading, so I won't use that result." | **ABSTAIN** — speak to your doctor today |

Script: [docs/demo.md](docs/demo.md). All four run end-to-end in `services/tests/test_scenarios.py` and were exercised through the browser UI.

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
cd services && uv run pytest                          # 109 tests
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
| Real participants with stopwatch / video ground truth | **0 so far** — log them on the Dev page; MAE/median error/failures/confidence are computed automatically |

No population-level fairness or real-world sensing accuracy is claimed.

## 15. Limitations

- Rule thresholds are prototype values and have not been clinically validated.
- Sensor results to date are on synthetic CSI; the pipeline must be re-tuned and validated on real ESP32 captures.
- A single Wi-Fi link detects a second moving person only about half the time on synthetic data; mitigated by asking the patient and by the start-cue protocol.
- Arm use is self-reported.
- English-centric rule extraction; non-English input recovers through follow-up questions, or through LLM extraction if configured.
- Clinic availability is not live; care links open map searches and the profile's usual GP.
- Caregiver delivery is simulated. 995 is never dialled automatically.

## 16. Future work

- Real-participant validation (stopwatch/video ground truth) and threshold tuning; second receiver link for better multi-person rejection.
- Additional providers behind the same `run_functional_assessment` interface: phone accelerometer, camera, mmWave, wearable.
- Clinician review of the rule tables; integration with HealthHub / clinic booking.
- Multilingual intake (Mandarin, Malay, Tamil) and voice.
- Real caregiver notifications with consent management.
