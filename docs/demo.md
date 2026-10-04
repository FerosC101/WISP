# Demo script (≈7 minutes)

**Story:** *Simple on top, deep underneath.* Show each scenario first as the patient sees it, then switch to the
**Technical view** to show what the agent and the rules did.

## Setup

```bash
./scripts/demo.sh --mcp        # API :8787 · MCP :8765 · web :3000
```

- Open http://localhost:3000/dev (**Engineering view**) → tick **Demo mode**. A thin DEMO bar appears at the top of
  the patient app with a profile switcher, **Technical view** and **Engineering view** links.
- Agent: **Tencent WorkBuddy via MCP** for the official demo (see `docs/workbuddy/README.md`); **Built-in agent** as backup.
- Sensor: live ESP32 if connected (`WISP_SENSOR_MODE=esp32 …`), otherwise recorded replay. Replay is always labelled
  **RECORDED SENSOR SESSION** on the check screen — say so out loud.
- Replay speed 1× for judges. Second screen (optional): keep `/explain/<session>` open; it updates live.

## Demo 1 — the agent uses sensing (Mdm Tan, 78)

1. DEMO bar → profile **Mdm Tan**. Home: *"Good morning, Mdm Tan. How are you feeling today?"*
2. Type **"I've felt weak for two days."** → Continue.
3. WISP: *"You said you've been feeling weaker than usual for 2 days. I need to check for a few warning signs first."*
   Answer: Gradually → No to each warning sign → No fall → **No** (not eating as usual) → Yes (keeps fluids down).
4. WISP: *"I've checked for the emergency warning signs… A short movement check could help."* Tap **Why this check?**
   → *"Your answers currently fall between seeing your doctor in the next few days and being seen today…"*
5. **Do the check** → **Yes, I'm ready** → **No, I'm alone** → **I'm seated — start** → five chair rises.
6. *"Check complete."* → arms? **Yes**.
7. **PLEASE BE SEEN TODAY** — reasons, warning signs. Tap **How WISP decided**.
8. DEMO bar → **Technical view (this check)**: safety screen passed · range Primary care soon ↔ Same-day care ·
   selected action *Physical function check* + why · `run_functional_assessment("5xSTS")` · sensor result ·
   baseline *clearly slower than usual* · **care-tier change Primary care soon → Same-day care** · rules SR-3, FN-3b, ESC-1.

> "The AI knew it needed more evidence, safely asked for a physical check, the environment measured it, and that evidence changed what she should do."

## Demo 2 — the agent refuses to sense (Mr Lim, 72)

1. Profile **Mr Lim**. Type **"This morning I suddenly felt dizzy and my left hand feels clumsy."**
2. Immediately **THIS NEEDS HELP NOW** → Call 995 / nearest emergency department. No questions about a chair.
3. Technical view: safety screen **triggered** (sudden onset, one-sided weakness) · options: *Physical function check* struck through ·
   **SENSING NOT REQUESTED — emergency warning sign already determines the disposition** · sensing LOCKED · no sensor tool call.

> "Having a sensor doesn't mean using it."

## Demo 3 — dynamic reassessment (Mdm Siti, 80)

1. Profile **Mdm Siti**. Type **"I'm tired and don't feel like myself."** → Gradually → Since yesterday → No… → Yes (eating as usual)
   → Do the check → ready → alone → start → arms **No**.
2. **YOU CAN CONTINUE MONITORING AT HOME FOR NOW** · next check tomorrow 10 AM.
3. **Simulate next day** (demo control under the result) — or Home → *Next check* → **Start check-in**.
4. Type **"My daughter said I seemed confused last night."** → **THIS NEEDS HELP NOW**.
5. How WISP decided: *"Your earlier check is only background. It can never make today's advice less urgent."*
   Technical view shows yesterday's *within your usual range* result as context only.

## Optional Demo 4 — someone walks through

1. Engineering view → **Queue "someone walks through" (Mdm Tan)** (or a teammate walks between the boards live).
2. Run Demo 1 again (eating as usual). WISP: *"I couldn't get a reliable reading, so I won't use that result."*
   → **I can't safely judge this from here** (speak to your doctor today) — never home monitoring.
3. Be explicit: automatic second-person detection is **experimental** (≈50 % on synthetic crossings). The main safeguard
   is asking "Is anyone else moving around in the room?" before the check.

## Engineering view (for technical judges)

`/dev`: sensor source (live vs replay, synthetic vs real), measurement table, motion-energy and posture plots with the
detected five-rise window, pipeline features, ground-truth entry and timing error, audit log with a **WorkBuddy tool calls** filter.
