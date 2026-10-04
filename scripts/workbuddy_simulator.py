"""Scripted MCP client that drives WISP the way WorkBuddy would.

It is NOT WorkBuddy. It exists to (1) smoke-test the MCP server end to end and
(2) give a deterministic fallback demo driver. Requires the API to be running.

    cd services && uv run python ../scripts/workbuddy_simulator.py --scenario 1 --auto-ready
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os

import httpx
from mcp import Client

from wisp.mcp.server import mcp

API = os.environ.get("WISP_API_URL", "http://127.0.0.1:8787")
ALL_DENIED = {k: False for k in ("sudden_onset", "chest_pain", "severe_breathlessness", "one_sided_weakness",
                                 "speech_difficulty", "confusion", "loss_of_consciousness", "recent_fall_with_injury",
                                 "sudden_vision_change")}


def data(result):
    if result.is_error:
        raise RuntimeError(result.content[0].text)
    if result.structured_content is not None:
        sc = result.structured_content
        return sc.get("result", sc) if isinstance(sc, dict) else sc
    return json.loads(result.content[0].text)


async def call(client, name, **args):
    out = data(await client.call_tool(name, args))
    print(f"→ {name}({', '.join(f'{k}={v!r}' for k, v in args.items() if k != 'session_id')})\n  {json.dumps(out)[:220]}")
    return out


async def say(client, sid, text):
    print(f"\nWORKBUDDY: {text}")
    await client.call_tool("say_to_patient", {"session_id": sid, "text": text})


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", type=int, choices=[1, 2], default=1)
    ap.add_argument("--auto-ready", action="store_true", help="press 'I'm ready' on the patient's behalf")
    ap.add_argument("--session", help="attach to an existing WorkBuddy session started in the UI")
    args = ap.parse_args()
    user = "mdm_tan" if args.scenario == 1 else "mr_lim"

    async with httpx.AsyncClient(base_url=API) as http:
        if not args.session:
            snap = (await http.post("/api/sessions", json={"user_id": user, "agent": "workbuddy"})).json()
            print(f"Patient started assessment {snap['session_id']} — open http://localhost:3000/session/{snap['session_id']}")
        async with Client(mcp) as client:
            s = await call(client, "get_active_session", user_id=user)
            sid = s["session_id"]
            await call(client, "get_health_profile", session_id=sid)

            if args.scenario == 2:
                complaint = "This morning I suddenly felt dizzy and my left hand feels clumsy."
                print(f"\nPATIENT: {complaint}")
                r = await call(client, "record_case_facts", session_id=sid, complaint_text=complaint,
                               complaint_category="functional", onset="sudden", duration_days=0.5,
                               red_flags={"sudden_onset": True, "one_sided_weakness": True})
                assert r["red_flag_screen"]["status"] == "triggered"
                await call(client, "log_decision", session_id=sid, selected_action="Escalate now",
                           why="Emergency warning sign reported; a physical check cannot change an emergency recommendation.")
                d = await call(client, "decide_care_tier", session_id=sid)
                await say(client, sid, f"{d['reasons'][0]} {d['action']}")
                return

            complaint = "I've felt weak for two days."
            print(f"\nPATIENT: {complaint}")
            await call(client, "record_case_facts", session_id=sid, complaint_text=complaint,
                       complaint_summary="weaker than usual", complaint_category="functional", duration_days=2)
            await say(client, sid, "I can help you work out what to do next. I'll ask a few short questions first.")
            print("PATIENT: (answers no to every warning-sign question; gradual onset; eating less)")
            r = await call(client, "record_case_facts", session_id=sid, onset="gradual", red_flags=ALL_DENIED,
                           modifiers={"reduced_intake": True, "unable_to_keep_fluids": False})
            screen = r["red_flag_screen"]
            assert screen["status"] == "passed"
            if screen["care_floor"] != screen["care_ceiling"]:
                await call(client, "log_decision", session_id=sid, selected_action="Physical function check",
                           why=f"A functional measurement could distinguish {screen['care_floor']} from {screen['care_ceiling']}.")
            await say(client, sid, "A short chair-rise check would help me compare today with your usual. Do you feel steady enough to try?")
            await call(client, "record_case_facts", session_id=sid, feels_safe_to_stand=True, others_present=False)
            el = await call(client, "check_assessment_eligibility", session_id=sid)
            assert el["allowed"], el["reason"]

            async def press_ready():
                for _ in range(50):
                    await asyncio.sleep(0.3)
                    if (await http.post(f"/api/sessions/{sid}/check/ready")).status_code == 200:
                        return

            if args.auto_ready:
                asyncio.create_task(press_ready())
            else:
                print("\n>>> Press “I'm seated and ready” on the WISP screen <<<")
            m = await call(client, "run_functional_assessment", session_id=sid, grant_id=el["grant_id"], type="5xSTS")
            if m.get("success"):
                await call(client, "record_case_facts", session_id=sid, arms_used=True)
            else:
                await say(client, sid, "I couldn't get a clear reading, so I won't use that result.")
            await call(client, "compare_to_baseline", session_id=sid)
            d = await call(client, "decide_care_tier", session_id=sid)
            await say(client, sid, f"{d['title']}. {d['action']}")
            if d.get("recheck"):
                await call(client, "schedule_recheck", session_id=sid)


if __name__ == "__main__":
    asyncio.run(main())
