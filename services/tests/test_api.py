"""API-level security: tool token, agent/session binding, input validation."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from wisp import config
from wisp.api import main as api_main


@pytest.fixture
def client(store, provider):
    api_main.init_state(store, provider)
    with TestClient(api_main.app) as c:
        yield c
    api_main.state.clear()


H = {"X-WISP-Token": config.MCP_TOKEN}


def test_tools_require_token(client):
    assert client.post("/api/tools/get_active_session", json={}).status_code == 401
    assert client.post("/api/tools/get_active_session", json={}, headers={"X-WISP-Token": "wrong"}).status_code == 401


def test_workbuddy_needs_patient_started_session(client):
    r = client.post("/api/tools/get_active_session", json={"user_id": "mdm_tan"}, headers=H)
    assert r.status_code == 400 and r.json()["error"] == "no_active_session"
    client.post("/api/sessions", json={"user_id": "mdm_tan", "agent": "workbuddy"})
    assert client.post("/api/tools/get_active_session", json={"user_id": "mdm_tan"}, headers=H).status_code == 200


def test_workbuddy_cannot_drive_local_agent_session(client):
    sid = client.post("/api/sessions", json={"user_id": "mdm_tan"}).json()["session_id"]
    r = client.post("/api/tools/decide_care_tier", json={"session_id": sid}, headers=H)
    assert r.status_code == 409


def test_invalid_inputs_rejected(client):
    client.post("/api/sessions", json={"user_id": "mdm_tan", "agent": "workbuddy"})
    sid = client.post("/api/tools/get_active_session", json={"user_id": "mdm_tan"}, headers=H).json()["session_id"]
    bad = client.post("/api/tools/record_case_facts", json={"session_id": sid, "facts": {"red_flags": {"made_up": True}}}, headers=H)
    assert bad.status_code == 400
    fabricated = client.post("/api/tools/record_case_facts", json={"session_id": sid, "facts": {"total_time_seconds": 9}}, headers=H)
    assert fabricated.status_code == 400
    assert client.post("/api/tools/screen_red_flags", json={"session_id": "s_nope"}, headers=H).status_code == 404
    r = client.post("/api/tools/run_functional_assessment", json={"session_id": sid, "grant_id": "g_000000000000"}, headers=H)
    assert r.status_code == 409


def test_patient_chat_flow(client):
    snap = client.post("/api/sessions", json={"user_id": "mr_lim"}).json()
    sid = snap["session_id"]
    snap = client.post(f"/api/sessions/{sid}/messages", json={"text": "I suddenly can't speak properly and my words are slurred"}).json()
    assert snap["disposition"]["tier"] == "T1"
    assert snap["case"]["sensing_locked"] is True
    assert client.post(f"/api/sessions/{sid}/messages", json={"text": ""}).status_code == 422
