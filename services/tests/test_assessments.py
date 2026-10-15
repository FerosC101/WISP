from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from wisp.api import main as api_main
from wisp.schemas import FunctionalAssessment
from wisp.sensing.assessments import ASSESSMENTS
from wisp.service import ToolError

from test_service_order import run_check, setup_case


def test_only_implemented_modules_are_registered():
    # Planned capabilities (gait, breathing, falls…) must not appear until they are built and tested.
    assert list(ASSESSMENTS) == ["5xSTS"]
    for m in ASSESSMENTS.values():
        assert m.limitations and m.quality_checks and m.eligibility and m.validation_status


def test_registry_matches_the_measurement_schema():
    allowed = FunctionalAssessment.model_fields["assessment"].annotation.__args__
    assert set(ASSESSMENTS) == set(allowed)


async def test_unknown_assessment_is_refused_without_spending_the_grant(service):
    sid = setup_case(service)
    grant = service.check_assessment_eligibility(sid, "workbuddy").grant_id
    with pytest.raises(ToolError) as e:
        await service.run_functional_assessment(sid, "workbuddy", assessment="gait", grant_id=grant)
    assert e.value.code == "invalid_input"
    # The refusal came before the grant check, so the real check can still run.
    result = await run_check(service, sid, grant)
    assert result["success"]


def test_engineering_api_lists_modules(store, provider):
    api_main.init_state(store, provider)
    with TestClient(api_main.app) as c:
        mods = c.get("/api/dev/assessments").json()
    api_main.state.clear()
    assert [m["id"] for m in mods] == ["5xSTS"]
    assert "not clinically validated" in mods[0]["validation_status"]
