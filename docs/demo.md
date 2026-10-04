# Demo script (≈6 minutes)

Setup: `./scripts/demo.sh` (add `--mcp` for WorkBuddy). Open http://localhost:3000.
Open http://localhost:3000/dev once and tick **Developer mode** (adds the DEMO banner and demo controls).
Replay speed 1× for judges; 2–4× for rehearsal.

> If replaying recordings, the check screen shows **RECORDED SENSOR SESSION**. Say so out loud.
> The bundled recordings are synthetic; replace them with your own ESP32 captures before the event if you can.

## 1 · The agent chooses to sense (Mdm Tan, 78)

1. Select **Mdm Tan** → **Start assessment**.
2. Type: *"I've felt weak for two days."*
3. Answer: Gradually → No to every warning sign → No fall → **No** (not eating normally) → Yes (keeps fluids down).
4. Point at the trace: *Safety screen passed · range Primary care soon ↕ Same-day care · Selected: Physical function check · Why: could distinguish…*
5. Yes, I feel steady → No, I'm alone → **I'm seated and ready**. (Live: do five chair rises.)
6. "Did you need to push up with your arms?" → **Yes**.
7. Result: **Please be seen today**. Trace: *Decision impact: Primary care soon → Same-day care.*

> "The AI knew it needed more evidence, safely asked for a physical check, the environment measured it, and the evidence changed what she should do."

## 2 · The agent refuses to sense (Mr Lim, 72)

1. Select **Mr Lim** → Start.
2. Type: *"This morning I suddenly felt dizzy and my left hand feels clumsy."*
3. Immediate **This needs help now** — Call 995. Trace: **SENSING NOT REQUESTED**; sensing indicator **LOCKED**.

> "Having a sensor doesn't mean using it. An emergency sign already decides this."

## 3 · Dynamic reassessment (Mdm Siti, 80)

1. Select **Mdm Siti** → Start. *"I'm tired and don't feel like myself."* → Gradually → Since yesterday → No… → Yes (eating normally) → steady → alone → check → arms: No.
2. Result: **You can continue monitoring at home for now**, next check-in tomorrow 10 AM.
3. **Simulate next day** (demo control) or Home → **Start follow-up check**.
4. Type: *"My daughter said I seemed confused last night."* → **T1**. Trace shows yesterday's normal result as context only.

> "Yesterday's normal measurement never overrides a new warning sign."

## 4 · (Optional) Someone walks through

1. Dev page → **Queue "someone walks through" (Mdm Tan)** (or have a teammate walk between the boards live).
2. Run scenario 1 again with gradual onset, eating normally.
3. WISP: *"I couldn't get a clear reading, so I won't use that result."* → **I can't safely judge this from here** (abstain → speak to your doctor today).

## With WorkBuddy

Select Agent → WorkBuddy in Dev, press Start on the WISP screen, then talk to WorkBuddy.
Fallback: `uv run python ../scripts/workbuddy_simulator.py --scenario 1` drives the same MCP tools.
