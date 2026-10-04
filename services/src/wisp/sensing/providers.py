"""Sensor-agnostic functional-assessment providers.

The agent asks for `run_functional_assessment("5xSTS")`. It never talks to a
radio. The environment decides which permitted instrument fulfils the request:

  ReplayCSIProvider   recorded CSI files run through the real pipeline (labelled)
  ESP32CSIProvider    live ESP32 Wi-Fi CSI over serial

Future providers (phone accelerometer, camera, mmWave, wearable) implement the
same interface.
"""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Literal

import numpy as np

from .. import config
from .esp32 import SerialCSIReader, probe_port
from .pipeline import SegmentationResult, count_rises_so_far, segment_5xsts
from .recording import CSIRecording

Progress = Callable[[dict], Awaitable[None]]


@dataclass
class ProviderRun:
    segmentation: SegmentationResult
    source: str
    mode: Literal["live", "recorded", "synthetic_recorded"]
    recording_id: str | None


class AssessmentProvider:
    name = "base"
    mode: Literal["live", "recorded", "synthetic_recorded"] = "live"

    def available(self) -> bool:
        raise NotImplementedError

    def describe(self) -> dict:
        return {"name": self.name, "mode": self.mode, "available": self.available()}

    async def run(self, assessment: str, *, user_id: str, on_progress: Progress) -> ProviderRun:
        raise NotImplementedError


def _energy_tail(rec: CSIRecording, seconds: float = 4.0) -> list[float]:
    """Coarse amplitude-variance trace for the developer view only."""
    if rec.csi.shape[0] < 10:
        return []
    amp = np.abs(rec.csi[-int(seconds * rec.fs):])
    step = max(1, amp.shape[0] // 40)
    return [round(float(np.std(amp[i:i + step], axis=0).mean()), 4) for i in range(0, amp.shape[0], step)]


class ReplayCSIProvider(AssessmentProvider):
    """Plays a recorded CSI file at real-time pace through the real pipeline."""

    name = "replay"
    mode = "recorded"

    def __init__(self, manifest_path: Path | None = None):
        self.manifest_path = manifest_path or (config.DEMO_DIR / "recordings.json")
        self.next_override: str | None = None  # set from the developer diagnostics page
        self.speed = config.REPLAY_SPEED

    def manifest(self) -> dict:
        if not self.manifest_path.exists():
            return {}
        return json.loads(self.manifest_path.read_text())

    def available(self) -> bool:
        return bool(self.manifest())

    def recordings(self) -> list[str]:
        return sorted(p.stem for p in config.RECORDINGS_DIR.glob("*.npz"))

    def choose(self, user_id: str) -> str | None:
        if self.next_override:
            rid, self.next_override = self.next_override, None
            return rid
        return self.manifest().get(user_id, {}).get("today")

    async def run(self, assessment: str, *, user_id: str, on_progress: Progress, recording_id: str | None = None) -> ProviderRun:
        rid = recording_id or self.choose(user_id)
        if not rid:
            raise RuntimeError("No recording configured for this user")
        rec = CSIRecording.load(config.RECORDINGS_DIR / f"{rid}.npz")
        mode = "synthetic_recorded" if rec.meta.get("synthetic") else "recorded"
        start = time.monotonic()
        elapsed = 0.0
        while elapsed < rec.duration:
            await asyncio.sleep(0.5)
            elapsed = (time.monotonic() - start) * self.speed
            part = rec.slice(min(elapsed, rec.duration))
            await on_progress(
                {
                    "elapsed": round(min(elapsed, rec.duration), 1),
                    "rises_so_far": count_rises_so_far(part) if part.duration > 3 else 0,
                    "energy_tail": _energy_tail(part),
                }
            )
        seg = await asyncio.to_thread(segment_5xsts, rec)
        return ProviderRun(seg, rec.meta.get("source", "wisp-recorded-csi"), mode, rid)


class ESP32CSIProvider(AssessmentProvider):
    """Live capture from an ESP32 receiver over USB serial."""

    name = "esp32"
    mode = "live"
    MAX_SECONDS = 75.0
    QUIET_END_SECONDS = 2.5

    def __init__(self, port: str | None, baud: int):
        self.port = port
        self.baud = baud

    def available(self) -> bool:
        return probe_port(self.port)

    async def run(self, assessment: str, *, user_id: str, on_progress: Progress) -> ProviderRun:
        reader = SerialCSIReader(self.port, self.baud)  # type: ignore[arg-type]
        reader.start()
        t0 = time.monotonic()
        try:
            rec = CSIRecording(np.zeros((0, 64), np.complex64), np.zeros(0))
            while True:
                await asyncio.sleep(0.5)
                if reader.error:
                    raise RuntimeError(f"Sensor error: {reader.error}")
                csi, t = reader.snapshot(t0)
                rec = CSIRecording(csi, t, {"source": "wisp-local-csi", "port": self.port})
                elapsed = time.monotonic() - t0
                if elapsed > 5 and reader.packets < 50:
                    raise RuntimeError("Sensor is not sending data")
                rises = count_rises_so_far(rec) if rec.duration > 3 else 0
                await on_progress({"elapsed": round(elapsed, 1), "rises_so_far": rises, "energy_tail": _energy_tail(rec)})
                if elapsed > self.MAX_SECONDS:
                    break
                if rises >= 5 and elapsed > 6 and _quiet_tail(rec, self.QUIET_END_SECONDS):
                    break
        finally:
            reader.stop()
        rid = None
        if config.SAVE_RAW_CSI and rec.csi.shape[0]:
            rid = f"live_{user_id}_{int(time.time())}"
            rec.save(config.RECORDINGS_DIR / "live" / f"{rid}.npz")  # local debug copy only
        seg = await asyncio.to_thread(segment_5xsts, rec)
        return ProviderRun(seg, "wisp-local-csi", "live", rid)


def _quiet_tail(rec: CSIRecording, seconds: float) -> bool:
    n = int(seconds * rec.fs)
    if rec.csi.shape[0] < 3 * n:
        return False
    amp = np.abs(rec.csi)
    tail = np.std(amp[-n:], axis=0).mean()
    active = np.percentile([np.std(amp[i:i + n], axis=0).mean() for i in range(0, amp.shape[0] - n, n)], 90)
    return bool(tail < 0.3 * active)


def build_provider() -> AssessmentProvider:
    if config.SENSOR_MODE == "esp32":
        return ESP32CSIProvider(config.SERIAL_PORT, config.SERIAL_BAUD)
    return ReplayCSIProvider()
