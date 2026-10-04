from __future__ import annotations

import pytest

from wisp import config
from wisp.demo import seed as demo_seed
from wisp.schemas import CaseState, RedFlags, UserProfile
from wisp.sensing.providers import ReplayCSIProvider
from wisp.service import EventBus, WispService
from wisp.store import Store
from wisp.triage.agent import LocalAgent


@pytest.fixture(scope="session")
def demo_data(tmp_path_factory):
    root = tmp_path_factory.mktemp("wispdata")
    mp = pytest.MonkeyPatch()
    mp.setattr(config, "RECORDINGS_DIR", root / "recorded_csi")
    mp.setattr(config, "DEMO_DIR", root / "demo")
    manifest = demo_seed.generate_recordings()
    yield root, manifest
    mp.undo()


@pytest.fixture
def store(tmp_path, demo_data):
    _, manifest = demo_data
    s = Store(tmp_path / "t.sqlite3", tmp_path / "k.key")
    for p in demo_seed.PERSONAS:
        s.put_profile(p)
        if p.user_id in demo_seed.PRE_ENROLLED:
            demo_seed.enrol_from_recordings(s, p.user_id, manifest[p.user_id]["baseline"])
    return s


@pytest.fixture
def provider(demo_data):
    p = ReplayCSIProvider(demo_data[0] / "demo" / "recordings.json")
    p.speed = 200.0
    return p


@pytest.fixture
def service(store, provider):
    return WispService(store, provider, EventBus())


@pytest.fixture
def agent(service):
    return LocalAgent(service)


def all_denied(**overrides) -> RedFlags:
    base = {f: False for f in RedFlags.model_fields}
    base.update(overrides)
    return RedFlags(**base)


def make_case(**kw) -> CaseState:
    defaults = dict(
        session_id="s_test",
        user_id="mdm_tan",
        complaint_text="I feel weak",
        complaint_summary="weaker than usual",
        complaint_category="functional",
        onset="gradual",
        duration_days=2,
        red_flags=all_denied(),
        feels_safe_to_stand=True,
        others_present=False,
    )
    defaults.update(kw)
    return CaseState(**defaults)


@pytest.fixture
def profile() -> UserProfile:
    return demo_seed.PERSONAS[0]
