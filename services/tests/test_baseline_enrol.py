"""Healthy-day (baseline) checks: a stopped check is discarded, never added."""

from __future__ import annotations

import asyncio

import httpx

from wisp.api import main as api_main


async def test_stopped_healthy_day_check_is_not_added(store, provider):
    api_main.init_state(store, provider)
    provider.speed = 2.0  # slow enough to stop part-way
    before = store.get_baseline("mr_lim")
    transport = httpx.ASGITransport(app=api_main.app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://wisp") as c:
            enrol = asyncio.create_task(c.post("/api/baselines/mr_lim/sessions", json={}))
            for _ in range(100):
                if "mr_lim" in api_main._enrolling:
                    break
                await asyncio.sleep(0.02)
            assert (await c.post("/api/baselines/mr_lim/stop")).status_code == 200
            r = (await enrol).json()
            assert r["accepted"] is False and r["reason"] == "stopped"
            assert store.get_baseline("mr_lim") == before
            assert (await c.post("/api/baselines/mr_lim/stop")).status_code == 409  # nothing running now
    finally:
        api_main.state.clear()


async def test_completed_healthy_day_check_is_added(store, provider):
    api_main.init_state(store, provider)
    transport = httpx.ASGITransport(app=api_main.app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://wisp") as c:
            r = (await c.post("/api/baselines/mr_lim/sessions", json={})).json()
            assert r["accepted"] is True and len(r["baseline"]["sessions"]) == 1
    finally:
        api_main.state.clear()
