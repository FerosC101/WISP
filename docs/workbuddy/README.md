# Connecting Tencent WorkBuddy to WISP

WISP exposes its tools through a standard **MCP server** (`services/src/wisp/mcp/server.py`).
WorkBuddy is the agent: it runs the conversation and calls the tools. WISP's local
API owns all state and enforces every safety rule, so WorkBuddy cannot skip steps.

```
Patient ──talks──▶ WorkBuddy ──MCP──▶ wisp MCP server ──HTTP (token)──▶ WISP API ──▶ rules · sensor · store
   ▲                                                                       │
   └──────────── WISP screen (check steps, recommendation, trace) ◀── WebSocket
```

## 1. Start WISP with MCP

```bash
./scripts/demo.sh --mcp
```

In the web app open **Dev** (enable Developer mode at `/dev`) and choose **Agent → Tencent WorkBuddy via MCP**.
New assessments now wait for WorkBuddy to attach.

## 2. Add the MCP server to WorkBuddy

Use whichever transport your WorkBuddy build supports. Both are equivalent.

**Streamable HTTP** (server started by `demo.sh --mcp`):

```json
{
  "mcpServers": {
    "wisp": { "url": "http://127.0.0.1:8765/mcp" }
  }
}
```

**stdio** (WorkBuddy launches the server itself):

```json
{
  "mcpServers": {
    "wisp": {
      "command": "uv",
      "args": ["run", "--directory", "/ABSOLUTE/PATH/TO/WISP/services", "python", "-m", "wisp.mcp.server"],
      "env": { "WISP_API_URL": "http://127.0.0.1:8787" }
    }
  }
}
```

`mcp-config.example.json` contains both. If you change `WISP_MCP_TOKEN`, set the same value for the API and the MCP server.

## 3. Load the skill

Paste [`SKILL.md`](SKILL.md) into WorkBuddy as the agent's instructions (or install it as a skill).

## 4. Run a check

1. On the WISP screen choose the persona and press **Start assessment**.
2. In WorkBuddy say e.g. *"I've felt weak for two days."*
3. WorkBuddy calls `get_active_session` → asks questions → … → `run_functional_assessment`.
   The WISP screen switches to the chair-rise steps; the patient presses **I'm seated and ready**.
4. The recommendation and decision trace appear on the WISP screen.

## Rehearsing without WorkBuddy

`scripts/workbuddy_simulator.py` is a scripted MCP client that makes the same tool calls
(it is not WorkBuddy, and is labelled as such):

```bash
cd services
uv run python ../scripts/workbuddy_simulator.py --scenario 1   # press "I'm seated and ready" on screen
uv run python ../scripts/workbuddy_simulator.py --scenario 2   # emergency: no sensing
```

## Tool reference

| Tool | Purpose | Enforced by WISP |
|---|---|---|
| `get_active_session` | Attach to the assessment the patient started | Sensing only exists inside a patient-started session |
| `get_health_profile` | Minimal profile | No medication list is exposed |
| `get_previous_assessments` | Context for follow-ups | Never used to lower urgency |
| `record_case_facts` | Structured facts from the conversation | Strict schema; red flags cannot be withdrawn; screen re-runs on every update |
| `screen_red_flags` | Deterministic emergency screen | A red flag locks sensing for the session |
| `log_decision` | Record chosen action + one-line reason | Length-limited; shown in the Decision Trace |
| `check_assessment_eligibility` | Gate before sensing | Issues a single-use, session-bound, 10-minute grant |
| `run_functional_assessment` | 5xSTS via the environment's sensor | Requires grant; patient must press start; returns summary only |
| `compare_to_baseline` | Personal-baseline label | Only signed measurements from this session |
| `decide_care_tier` | Final tier | Asymmetric rule: sensing never lowers urgency below the symptom floor |
| `schedule_recheck` | Follow-up for T4 | — |
| `share_summary` | Caregiver summary | Requires `patient_consented=true`; no sensor data |
| `say_to_patient` | Mirror message onto the WISP screen | — |
