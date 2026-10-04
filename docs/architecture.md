# Architecture

```
PATIENT
  │  speaks / taps
  ▼
WORKBUDDY (Tencent) ── or ── built-in agent (offline stand-in, same tools)
  │  structured case understanding, next-step choice, explanation
  │  MCP (stdio or streamable HTTP)
  ▼
wisp MCP server  ──token──▶  WISP local API (FastAPI)
                               │
            ┌──────────────────┼──────────────────────────┬─────────────────────┐
            ▼                  ▼                          ▼                     ▼
      rules/ (deterministic)  service.py (ordering,     sensing/ (provider     store.py (SQLite,
      red flags, ranges,      grants, locks, audit)     interface)             encrypted baseline,
      eligibility, tiers                                 ├ ReplayCSIProvider    signed measurements,
                                                         └ ESP32CSIProvider     audit log)
                                                              │
                                                     pipeline.py: amplitude → Hampel → low-pass →
                                                     normalise → subcarrier selection → PCA →
                                                     motion energy → posture signal → 5 peaks →
                                                     timing + confidence + single-person checks
  ▲
  └── Web app (Next.js) ◀── WebSocket snapshots: chat, check screen, recommendation, decision trace
```

## Components

| Path | Responsibility |
|---|---|
| `services/src/wisp/schemas.py` | Pydantic models: CaseState, RedFlagResult, AssessmentEligibility, FunctionalAssessment, Baseline, BaselineComparison, CareDisposition, DecisionTrace, AuditEvent, ReassessmentPlan, CaregiverShareConsent |
| `rules/red_flags.py` | `screen_red_flags(case)` |
| `rules/ranges.py` | Symptom floor/ceiling |
| `rules/eligibility.py` | `check_assessment_eligibility(case, profile, …)` |
| `rules/care_tier.py` | `decide_care_tier(case, profile, comparison)` |
| `baseline/compare.py` | `compare_to_baseline(result, baseline)` |
| `sensing/` | Provider interface, replay + ESP32 providers, signal pipeline, synthetic generator |
| `service.py` | Tool implementations shared by MCP, REST and the built-in agent |
| `triage/agent.py`, `triage/extract.py` | Built-in agent; rule-based (+ optional LLM) field extraction |
| `audit/trace.py` | Decision Trace builder (structured record, not chain-of-thought) |
| `mcp/server.py` | MCP tools for WorkBuddy |
| `api/main.py` | REST + WebSocket; developer/evaluation endpoints |
| `apps/web` | Patient app (home, conversation, movement check, recommendation, history, my usual, privacy); `/explain/[id]` technical view (structured decision record); `/dev` engineering view |
| `triage/i18n.py` | Structured safety questions in English, Mandarin, Malay, Tamil |

## Three audiences, three views

| View | Route | Shows |
|---|---|---|
| Patient (default) | `/`, `/session/[id]`, `/history`, `/baseline`, `/privacy` | Conversation, plain safety questions, movement check, recommendation, reasons, warning signs, "How WISP decided" in plain language |
| Technical / explain | `/explain/[id]` (demo mode) | Concern, safety screen, care range, missing info, options considered, selected action + why, tool called, sensor result, baseline result, care-tier change, final disposition with rule IDs, tool-call timeline by actor |
| Engineering | `/dev` (not linked from patient navigation) | Sensor source, replay vs live, synthetic vs real, measurement table, CSI-derived plots, features, ground truth, audit log, WorkBuddy tool calls, demo launchers |

## Sensor independence

The agent only ever calls `run_functional_assessment(type="5xSTS")`. The environment
chooses a permitted provider. Adding a phone accelerometer, camera, mmWave or wearable
provider means implementing `AssessmentProvider.run()` and returning the same
`SegmentationResult`; nothing in the rules, agent, or UI changes.

## Why a separate MCP process

The MCP server is a thin validated bridge that forwards to the API with a local token.
The API is the single owner of state, so the web UI, the built-in agent, and WorkBuddy all
see — and are constrained by — the same session.
