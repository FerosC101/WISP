from __future__ import annotations

import re

import pytest

from wisp import config


def test_public_deployment_refuses_the_published_token(monkeypatch):
    monkeypatch.setattr(config, "PUBLIC_DEPLOYMENT", True)
    monkeypatch.setattr(config, "MCP_TOKEN", config.DEFAULT_MCP_TOKEN)
    with pytest.raises(RuntimeError, match="WISP_MCP_TOKEN"):
        config.check_deployment()
    monkeypatch.setattr(config, "MCP_TOKEN", "short")
    with pytest.raises(RuntimeError):
        config.check_deployment()


def test_public_deployment_accepts_a_private_token(monkeypatch):
    monkeypatch.setattr(config, "PUBLIC_DEPLOYMENT", True)
    monkeypatch.setattr(config, "MCP_TOKEN", "a" * 48)
    config.check_deployment()


def test_local_development_keeps_working_with_the_default_token(monkeypatch):
    monkeypatch.setattr(config, "PUBLIC_DEPLOYMENT", False)
    monkeypatch.setattr(config, "MCP_TOKEN", config.DEFAULT_MCP_TOKEN)
    config.check_deployment()


def test_example_vercel_preview_pattern():
    # The pattern suggested in DEPLOY.md: previews of the "wisp" project only, never any *.vercel.app site.
    pattern = r"^https://wisp-[a-z0-9-]+\.vercel\.app$"
    assert re.fullmatch(pattern, "https://wisp-git-main-ferosc101.vercel.app")
    assert not re.fullmatch(pattern, "https://evil.vercel.app")
    assert not re.fullmatch(pattern, "https://wisp-x.vercel.app.evil.com")
