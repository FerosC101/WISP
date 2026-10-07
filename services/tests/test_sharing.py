"""Sharing with a trusted person: minimal by default, previewed, consented, removable."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from wisp.api import main as api_main


@pytest.fixture
def client(store, provider):
    api_main.init_state(store, provider)
    with TestClient(api_main.app) as c:
        yield c
    api_main.state.clear()


def finished(client, user="mdm_tan"):
    sid = client.post("/api/sessions", json={"user_id": user, "text": "I feel weak"}).json()["session_id"]
    for v in ["gradual", "d_days"] + ["no"] * 8 + ["yes"]:  # warning signs and fall: no; eating as usual: yes
        client.post(f"/api/sessions/{sid}/messages", json={"text": v, "value": v})
    snap = client.post(f"/api/sessions/{sid}/messages", json={"text": "skip", "value": "skip"}).json()
    assert snap["disposition"] is not None
    return sid


def test_summary_is_minimal_by_default(client):
    sid = finished(client)
    s = client.get(f"/api/sessions/{sid}/caregiver-summary").json()
    assert s["caregiver"]["name"] == "Daniel" and s["include_reasons"] is False
    text = s["summary"]
    assert "WISP's advice" in text and "No sensor data is shared" in text
    assert "weaker" not in text and "eating" not in text  # symptoms stay private unless chosen
    assert "amlodipine" not in text and "hypertension" not in text
    with_reasons = client.get(f"/api/sessions/{sid}/caregiver-summary?include_reasons=true").json()["summary"]
    assert "What WISP told Mdm Tan" in with_reasons and "weaker" in with_reasons


def test_share_sends_exactly_the_preview_and_only_with_consent(client, store):
    sid = finished(client)
    assert client.post(f"/api/sessions/{sid}/share", json={"consent": False}).json() == {"shared": False}
    assert store.shares(sid) == []
    preview = client.get(f"/api/sessions/{sid}/caregiver-summary?include_reasons=true").json()["summary"]
    r = client.post(f"/api/sessions/{sid}/share", json={"consent": True, "include_reasons": True}).json()
    assert r["shared"] is True and r["summary"] == preview
    assert store.shares(sid)[0]["summary"] == preview
    assert client.get(f"/api/sessions/{sid}/caregiver-summary").json()["shared"][0]["to"] == "Daniel"
    # consent must be literally true
    assert client.post(f"/api/sessions/{sid}/share", json={"consent": "yes"}).json() == {"shared": False}


def test_removed_trusted_person_cannot_be_shared_with(client, store):
    sid = finished(client)
    assert client.delete("/api/profile/mdm_tan/caregiver").status_code == 200
    assert store.get_profile("mdm_tan").caregiver is None
    assert client.get(f"/api/sessions/{sid}/caregiver-summary").json()["caregiver"] is None
    assert client.post(f"/api/sessions/{sid}/share", json={"consent": True}).status_code == 409
    assert client.delete("/api/profile/nobody/caregiver").status_code == 404
    # The built-in agent no longer offers to share at the end of a check.
    sid2 = finished(client)
    msgs = client.get(f"/api/sessions/{sid2}").json()["messages"]
    assert not any(m["data"].get("question") == "share" for m in msgs)
