"""WISP MCP server for Tencent WorkBuddy (or any MCP client).

It is a thin, validated bridge: every call is forwarded to the local WISP API,
which owns state and enforces ordering. WorkBuddy cannot reach the sensor,
raw CSI, or the rules except through these tools.

Run (stdio, for desktop MCP clients):
    uv run python -m wisp.mcp.server
Run (streamable HTTP on http://127.0.0.1:8765/mcp):
    uv run python -m wisp.mcp.server --http
"""

from __future__ import annotations

import argparse
import os
from typing import Annotated, Any, Literal

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from pydantic import Field

from .. import config

API = os.environ.get("WISP_API_URL", "http://127.0.0.1:8787")
SessionId = Annotated[str, Field(pattern=r"^s_[0-9a-f]{12}$", description="Session id from get_active_session")]

INSTRUCTIONS = """WISP is a self-triage and care-navigation toolset for older adults with vague complaints
("I feel weak", "I'm tired", "I don't feel like myself"). You hold the conversation; WISP's deterministic tools
make every safety decision.

Required order:
 1. get_active_session -> get_health_profile (and get_previous_assessments for follow-ups).
 2. Ask ONE short question at a time. After each answer call record_case_facts with structured fields.
    Ask about: onset (sudden/gradual), duration, chest pain, severe breathlessness, one-sided weakness/numbness,
    speech difficulty, confusion/drowsiness, fainting, sudden vision change, falls (and injury), eating/drinking.
 3. If record_case_facts returns red_flag_screen.status == "triggered": STOP. Do not offer a physical check.
    log_decision("Escalate now", ...), call decide_care_tier, and tell the patient to call 995.
 4. When the screen has passed, decide whether a physical check could change the care tier
    (red_flag_screen.care_floor != care_ceiling). Log your choice with log_decision either way.
 5. If useful: explain the chair-rise check, ask if they feel steady enough (record feels_safe_to_stand) and whether
    anyone else is moving nearby (record others_present). Then check_assessment_eligibility; only if allowed,
    run_functional_assessment with the returned grant_id. Never pressure someone who does not feel steady.
 6. After a successful check ask "Did you need to push up with your arms?" (record arms_used), then compare_to_baseline.
    If the measurement failed, say: "I couldn't get a clear reading, so I won't use that result."
 7. decide_care_tier. Explain its title, action, reasons and warning signs in plain, calm language.
    Do not change the tier, add diagnoses, or quote percentages. If tier is T4, call schedule_recheck.
 8. Offer share_summary only with the patient's explicit consent.
You must never invent measurements, and never tell the patient an emergency sign is fine."""

mcp = MCPServer("wisp", instructions=INSTRUCTIONS, version="0.1.0")


async def _call(tool: str, payload: dict[str, Any], timeout: float = 30) -> Any:
    async with httpx.AsyncClient(base_url=API, timeout=timeout) as client:
        r = await client.post(f"/api/tools/{tool}", json=payload, headers={"X-WISP-Token": config.MCP_TOKEN})
    if r.status_code >= 400:
        try:
            detail = r.json()
            msg = detail.get("message") or detail.get("detail") or r.text
        except ValueError:
            msg = r.text
        raise ToolError(f"{tool} refused: {msg}")
    return r.json()


@mcp.tool(description="Find the assessment the patient started on the WISP screen. Sensing is only possible inside a patient-started assessment.")
async def get_active_session(user_id: Annotated[str | None, Field(max_length=40)] = None) -> dict:
    return await _call("get_active_session", {"user_id": user_id})


@mcp.tool(description="Minimal patient profile for personalisation (name, age, living situation, usual GP, whether they normally stand unaided, caregiver).")
async def get_health_profile(session_id: SessionId) -> dict:
    return await _call("get_health_profile", {"session_id": session_id})


@mcp.tool(description="Summaries of the patient's recent WISP assessments (tier, date, functional label). Context only; never lowers urgency.")
async def get_previous_assessments(session_id: SessionId) -> list:
    return await _call("get_previous_assessments", {"session_id": session_id})


@mcp.tool(
    description=(
        "Record structured facts extracted from the patient's words. Red flags may only be set from what the patient (or family) "
        "reported; use uncertain_fields for 'not sure'. Returns the deterministic red-flag screen result. "
        "red_flags keys: sudden_onset, chest_pain, severe_breathlessness, one_sided_weakness, speech_difficulty, confusion, "
        "loss_of_consciousness, recent_fall_with_injury, sudden_vision_change. modifiers keys: reduced_intake, "
        "unable_to_keep_fluids, fall_without_injury, fever, getting_worse."
    )
)
async def record_case_facts(
    session_id: SessionId,
    complaint_text: Annotated[str | None, Field(max_length=1000)] = None,
    complaint_summary: Annotated[str | None, Field(max_length=120, description="completes 'You've been feeling ...'")] = None,
    complaint_category: Literal["functional", "out_of_scope", "unknown"] | None = None,
    onset: Literal["sudden", "gradual"] | None = None,
    duration_days: Annotated[float | None, Field(ge=0, le=3650)] = None,
    red_flags: dict[str, bool] | None = None,
    modifiers: dict[str, bool] | None = None,
    uncertain_fields: list[str] | None = None,
    feels_safe_to_stand: bool | None = None,
    others_present: bool | None = None,
    arms_used: bool | None = None,
    functional_status: Literal["declined", "stopped_early"] | None = None,
) -> dict:
    facts = {k: v for k, v in dict(
        complaint_text=complaint_text, complaint_summary=complaint_summary, complaint_category=complaint_category,
        onset=onset, duration_days=duration_days, red_flags=red_flags, modifiers=modifiers, uncertain_fields=uncertain_fields,
        feels_safe_to_stand=feels_safe_to_stand, others_present=others_present, arms_used=arms_used, functional_status=functional_status,
    ).items() if v is not None}
    res = await _call("record_case_facts", {"session_id": session_id, "facts": facts})
    return {"red_flag_screen": res["red_flag_screen"]}


@mcp.tool(description="Run the deterministic emergency red-flag screen. If triggered, the session's physical sensing is locked and the tier is T1.")
async def screen_red_flags(session_id: SessionId) -> dict:
    return await _call("screen_red_flags", {"session_id": session_id})


@mcp.tool(description="Record which next action you chose and a one-sentence reason (shown in the patient's Decision Trace). Not for free-form reasoning.")
async def log_decision(
    session_id: SessionId,
    selected_action: Literal["Ask another question", "Physical function check", "Recommend care now", "Escalate now"],
    why: Annotated[str, Field(max_length=300)],
) -> dict:
    return await _call("log_decision", {"session_id": session_id, "selected_action": selected_action, "why": why,
                                         "available_actions": ["Ask another question", "Physical function check", "Recommend care now"]})


@mcp.tool(description="Deterministic gate before any physical check. Returns allowed + reason, and a single-use grant_id when allowed.")
async def check_assessment_eligibility(session_id: SessionId) -> dict:
    return await _call("check_assessment_eligibility", {"session_id": session_id})


@mcp.tool(
    description=(
        "Ask the home environment to perform a physical-function assessment. Requires a grant_id from check_assessment_eligibility. "
        "The patient's WISP screen shows instructions and they press start; this call waits until the measurement completes "
        "(up to ~4 minutes). Returns a structured summary only (never raw sensor data)."
    )
)
async def run_functional_assessment(session_id: SessionId, grant_id: Annotated[str, Field(pattern=r"^g_[0-9a-f]{12}$")], type: Literal["5xSTS"] = "5xSTS") -> dict:
    return await _call("run_functional_assessment", {"session_id": session_id, "grant_id": grant_id, "type": type}, timeout=300)


@mcp.tool(description="Compare this session's verified measurement with the patient's personal baseline. Returns a semantic label, never a diagnosis.")
async def compare_to_baseline(session_id: SessionId) -> dict:
    return await _call("compare_to_baseline", {"session_id": session_id})


@mcp.tool(description="Deterministic care-tier decision (T1 emergency, T2 same day, T3 primary care soon, T4 self-care, ABSTAIN). Explain the returned object; do not change it.")
async def decide_care_tier(session_id: SessionId) -> dict:
    return await _call("decide_care_tier", {"session_id": session_id})


@mcp.tool(description="Schedule the follow-up check proposed by a T4 recommendation.")
async def schedule_recheck(session_id: SessionId) -> dict:
    return await _call("schedule_recheck", {"session_id": session_id})


@mcp.tool(description="Share a short summary with the patient's caregiver. Only call with patient_consented=true after the patient explicitly agrees.")
async def share_summary(session_id: SessionId, patient_consented: bool) -> dict:
    return await _call("share_summary", {"session_id": session_id, "patient_consented": patient_consented})


@mcp.tool(description="Show a short message in large text on the patient's WISP screen (mirrors what you say).")
async def say_to_patient(session_id: SessionId, text: Annotated[str, Field(max_length=600)]) -> dict:
    return await _call("say_to_patient", {"session_id": session_id, "text": text})


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--http", action="store_true", help="serve streamable HTTP instead of stdio")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    if args.http:
        mcp.run("streamable-http", host="127.0.0.1", port=args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
