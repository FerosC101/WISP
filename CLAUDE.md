# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WISP is a self-triage and care-navigation agent for older adults with vague complaints. An agent (Tencent WorkBuddy over MCP, or the offline built-in agent) gathers facts, decides whether a contactless Five-Times Sit-to-Stand (5xSTS) check via ESP32 Wi-Fi CSI is worth doing, compares the result with the patient's personal baseline, and lands on one of five dispositions: T1 Emergency · T2 Same-day · T3 Primary care soon · T4 Self-care · ABSTAIN. It is not a diagnostic system, and its rule thresholds are prototype values.

## Commands

Python services use `uv` (Python ≥3.12) and run from `services/`. The web app uses npm (Node 20+) and runs from `apps/web/`.

```bash
# Setup
cd services && uv sync && uv run python -m wisp.demo.seed     # seeds data/ (SQLite, key, synthetic CSI recordings)
cd apps/web && npm install

# Full demo: API :8787 + web :3000 (+ MCP :8765 with --mcp)
./scripts/demo.sh [--mcp]

# Run pieces individually
cd services && uv run uvicorn wisp.api.main:app --port 8787
cd services && uv run python -m wisp.mcp.server --http --port 8765   # stdio if --http omitted
cd apps/web && npm run dev | npm run build | npm run lint

# Tests (pytest, asyncio_mode=auto)
cd services && uv run pytest
cd services && uv run pytest tests/test_service_order.py::test_red_flag_locks_sensor

# Evaluation suite → evaluation/results/report.md
cd services && uv run python ../evaluation/run_all.py
```

Key env vars (see `services/src/wisp/config.py`): `WISP_SENSOR_MODE` (`replay` | `esp32`), `WISP_SERIAL_PORT`, `WISP_REPLAY_SPEED`, `WISP_DATA_DIR`, `WISP_MCP_TOKEN`, and the optional `WISP_LLM_BASE_URL` / `WISP_LLM_API_KEY` / `WISP_LLM_MODEL` for an OpenAI-compatible extractor such as Hunyuan. The web app reads `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:8787`). Runtime data lives in `data/` at the repo root, which is git-ignored.

## Architecture

The flow is: agent → MCP server (`mcp/server.py`, a thin validated bridge that sends a token) → FastAPI (`api/main.py`) → `WispService` (`service.py`) → rules, sensing and store. The API process is the **single owner of state**. The web UI, the built-in agent (`triage/agent.py`) and WorkBuddy all go through the same `WispService`, so they all see the same session and the same constraints. The UI gets session snapshots over a WebSocket (chat, check steps, recommendation, decision trace).

- **`service.py`** is where tool ordering and safety are enforced: the red-flag screen runs on every `record_case_facts`, and any red flag locks sensing for the session. `run_functional_assessment` needs a single-use, session-bound eligibility grant and waits for the patient to press start on their own screen (`patient_ready`). Measurements come only from the sensing provider. They are HMAC-signed and bound to the session in `store.py`. `decide_care_tier` reads verified evidence from the store and never takes it from the caller. Agents never see raw CSI. They only see the summary from `_agent_view`.
- **`rules/`** holds the pure, deterministic urgency logic: `red_flags.py`, `ranges.py` (symptom floor/ceiling), `eligibility.py` and `care_tier.py`. The LLM or agent only turns language into structured fields (`triage/extract.py`; LLM output is merged conservatively, so it can add flags but never remove them). It never decides urgency.
- **`sensing/`**: `AssessmentProvider` is the interface (`ReplayCSIProvider`, `ESP32CSIProvider`). `pipeline.py` runs the signal-processing chain (Hampel → low-pass → normalize → subcarrier selection → PCA → peaks), with no deep learning. `synth.py` generates the synthetic CSI used by the demo and tests. A new sensor means implementing `AssessmentProvider.run()` and returning a `SegmentationResult`; rules, agent and UI stay unchanged.
- **`schemas.py`** holds all Pydantic models (CaseState, CareDisposition, DecisionTrace, …). `Strict` models reject unknown keys.
- **`audit/trace.py`** builds the Decision Trace. It is a structured audit record of what was reported, what was measured and which rule fired, not model chain-of-thought.
- **`apps/web`** renders the `CareDisposition` from the backend as-is and must never compute its own interpretation of urgency.

## Safety invariants (must not regress)

`docs/safety.md` is the source of truth for the rule tables. Each invariant has named tests in `services/tests/test_safety_rules.py` / `test_service_order.py`:

- SAFE-1: `final = more_urgent(symptom_floor, functional_tier)`. Sensing can raise urgency but never lower it.
- Any red flag → T1, whatever any measurement says. A reported red flag can't be withdrawn within the session.
- An unreliable or rejected measurement is never used. T4 requires a verified, reliable, within-baseline measurement. ABSTAIN never routes to self-care. An unknown red flag left unresolved at the end → ABSTAIN.

- ORD-5: patient corrections on the summary screen are accepted only while the agent waits at `confirm`, and they re-run the red-flag screen.
- FU-1: structured follow-ups re-ask every safety question, and the previous result is context only.

The four end-to-end demo scenarios (`docs/demo.md`) run in `tests/test_scenarios.py`. If you change rules, update `docs/safety.md` and rerun the evaluation suite.

## Patient app (v3, branch `v3/patient-app`)

Progress and per-task notes are in `V3_PROGRESS.md`.

The app has five tabs: Today · Check · Care · History · You. A tab's route prefixes are listed in `NAV[].match` in `components/Shell.tsx`.

- **Check flow** (`app/check/*`, `lib/checkFlow.ts`). The screens sit on top of the same built-in agent the chat view (`/session/[id]`) uses. Each agent question key (the `question` on its latest message) belongs to one screen. `stageOf()` maps the session to a screen, and `useCheckFlow` redirects there, so a red flag always lands on `/check/complete`. The session id travels in `?s=`, so each route group's `layout.tsx` provides the Suspense boundary that `useSearchParams` needs. Answers are posted as the agent's language-independent `value`s.
- **Opt-in agent behaviour.** Sessions started from the Check flow send `confirm_summary: true`, which makes the agent pause at `confirm` and lets `POST /api/sessions/{id}/corrections` work. Follow-ups send `trend`/`text` to `/followup`, which calls `LocalAgent.follow_up()`. Without these fields the agent behaves as before, so the chat view, WorkBuddy, `tests/test_scenarios.py` and the evaluation harness are unaffected. Keep them opt-in.
- **Care section** (`app/care/*`, `lib/care.ts`). Pages default to the latest check that has a recommendation, or take `?s=`. The care plan (`lib/carePlan.ts`) only rearranges disposition content and never sets urgency. Find Care never claims opening hours or availability.
- **What leaves the device.** The agent's profile view (`_public_profile`) excludes medications and clinic location. The patient's own screens use `GET /api/profile/{user}`. Caregiver summaries are minimal by default, and the reasons are opt-in.
- **Mobile.** On mobile, `components/StickyActions.tsx` pins a screen's primary actions above the bottom nav. Use it for any screen whose main button could fall below 390×844.

## Gotchas

- `npm install` (including the one in `scripts/demo.sh`) rewrites `apps/web/package-lock.json` with npm-version noise. Revert it before committing.
- Restarting the API while the web app has a session open can leave the old uvicorn instance alive (it waits for WebSockets). Afterwards, check `lsof -nP -iTCP:8787 -sTCP:LISTEN` and make sure exactly one instance remains.
- The demo personas and clinics are fictional. Recorded sensor sessions are synthetic and must stay labelled as such in any patient-, clinician- or evaluation-facing output.

## Web app note

`apps/web` uses Next.js 16 / React 19 / Tailwind v4, and its own `apps/web/AGENTS.md` applies: this Next.js version has breaking changes, so read the relevant guide in `apps/web/node_modules/next/dist/docs/` before writing Next.js code.
