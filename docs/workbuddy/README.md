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

1. Start an assessment for the patient: Engineering view → Demo → **Start as …**, or on the home screen tap
   a quick prompt (with WorkBuddy selected the session opens empty and waits for WorkBuddy).
2. In WorkBuddy say e.g. *"I've felt weak for two days."*
3. WorkBuddy calls `get_active_session` → asks questions → … → `run_functional_assessment`.
   The patient screen switches to the **Quick movement check**; the patient presses **I'm seated — start**.
4. The recommendation appears on the patient screen; the structured record is at `/explain/<session>`.

## Verifying the live WorkBuddy connection

Status: **not yet run against real WorkBuddy** (no WorkBuddy install was available while building). Use this
checklist on a machine with WorkBuddy and record the result here.

1. `./scripts/demo.sh --mcp`; in the Engineering view (`/dev`) select **Agent → Tencent WorkBuddy via MCP**.
2. Add the MCP server to WorkBuddy (above) and paste `SKILL.md` as its instructions. Confirm WorkBuddy lists 13 `wisp` tools.
3. Engineering view → **Demo 1 → Start as Mdm Tan** (opens an empty WorkBuddy session on the patient screen).
4. In WorkBuddy, type: *"I've felt weak for two days. I've been eating less."*

| # | WorkBuddy must… | Evidence (Engineering view → Audit log → "WorkBuddy tool calls", or Technical view) | ✓ |
|---|---|---|---|
| 1 | understand vague text | `record_case_facts` with `complaint_category=functional`, duration 2 | |
| 2 | populate structured case state | red flags recorded one by one as the patient answers | |
| 3 | call `screen_red_flags` | `screen_red_flags → passed` by actor WorkBuddy | |
| 4 | decide whether sensing is useful | `log_decision → Physical function check` with a reason | |
| 5 | call the physical assessment | `check_assessment_eligibility → allowed`, then `run_functional_assessment` | |
| 6 | receive the structured result | `measurement_complete` + `compare_to_baseline → slower_than_usual` | |
| 7 | call the care-tier engine | `decide_care_tier → T2` | |
| 8 | communicate the output | WorkBuddy explains "Please be seen today" + reasons + warning signs; `say_to_patient` mirrors it | |

Then repeat with Mr Lim: *"This morning I suddenly felt dizzy and my left hand feels clumsy."* Expected: T1, no
`run_functional_assessment` call, Technical view shows **SENSING NOT REQUESTED**.

| Date | WorkBuddy version | Transport (HTTP/stdio) | Scenario 1 | Scenario 2 | Notes |
|---|---|---|---|---|---|
| | | | | | |

## Rehearsing without WorkBuddy

`scripts/workbuddy_simulator.py` is a scripted MCP client that makes the same tool calls
(it is not WorkBuddy, and is labelled as such):

```bash
cd services
uv run python ../scripts/workbuddy_simulator.py --scenario 1   # press "I'm seated — start" on screen
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
