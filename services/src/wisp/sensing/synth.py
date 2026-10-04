"""Synthetic CSI generator for 5xSTS sessions.

THIS IS NOT REAL SENSOR DATA. It exists so the full pipeline can be developed,
tested and demonstrated before (or without) ESP32 hardware. Every recording it
produces is tagged `"synthetic": true` and the UI labels it as such.

Model: each subcarrier k sees a static multipath sum plus a reflection from the
participant's torso whose path length depends on posture height h(t) in [0, 1]
(0 = seated, 1 = standing), plus breathing micro-motion and receiver noise. An
optional second person walks through the room, adding an independent moving path
with gait bobbing.
"""

from __future__ import annotations

import numpy as np

from .recording import CSIRecording

C = 3e8
F0 = 2.437e9  # Wi-Fi channel 6
DF = 312.5e3  # subcarrier spacing
N_SUB = 64
NULL_SUBCARRIERS = {0, 1, 2, 3, 4, 5, 32, 59, 60, 61, 62, 63}


def _smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return 0.5 - 0.5 * np.cos(np.pi * x)


def posture_trajectory(t: np.ndarray, start: float, cycles: list[float], rng: np.random.Generator) -> tuple[np.ndarray, float]:
    """Return h(t) and the end time (seated after the final rise)."""
    h = np.zeros_like(t)
    cursor = start
    end = start
    for c in cycles:
        up = c * rng.uniform(0.38, 0.46)
        hold = c * rng.uniform(0.06, 0.12)
        sit = c * rng.uniform(0.06, 0.12)  # brief seated pause before the next rise
        down = c - up - hold - sit
        seg = (t >= cursor) & (t < cursor + c)
        tt = t[seg] - cursor
        h[seg] = np.where(
            tt < up,
            _smoothstep(tt / up),
            np.where(tt < up + hold, 1.0, 1.0 - _smoothstep((tt - up - hold) / down)),
        )
        end = cursor + c - sit  # seated again after this rise
        cursor += c
    return h, end


def generate_5xsts(
    cycles: list[float],
    *,
    seed: int = 0,
    fs: float = 100.0,
    pre_roll: float = 3.0,
    post_roll: float = 3.0,
    walker: tuple[float, float] | None = None,
    noise: float = 0.02,
    meta: dict | None = None,
) -> CSIRecording:
    """Generate a synthetic 5xSTS capture.

    cycles  per-rise durations in seconds (sit -> stand -> sit)
    walker  (start_s, duration_s) of a second person crossing the room
    """
    rng = np.random.default_rng(seed)
    total = pre_roll + sum(cycles) + post_roll
    t = np.arange(0, total, 1.0 / fs)
    t = t + rng.normal(0, 0.0015, t.size)  # packet timing jitter
    t.sort()
    k = np.arange(N_SUB)
    f = F0 + (k - N_SUB / 2) * DF

    los = 1.0 * np.exp(-2j * np.pi * f * rng.uniform(3, 5) / C)
    static = np.zeros(N_SUB, dtype=complex)
    for _ in range(5):
        static += rng.uniform(0.2, 0.8) * np.exp(-2j * np.pi * f * rng.uniform(5, 60) / C)

    h, end = posture_trajectory(t, pre_roll, cycles, rng)

    # Torso reflection: path length changes ~0.55 m between seated and standing.
    path0 = rng.uniform(4.0, 7.0)
    body_len = path0 + 0.55 * h + 0.004 * np.sin(2 * np.pi * 0.25 * t)  # + breathing
    body_amp = 0.35 + 0.2 * h
    shadow = np.ones_like(t)
    if walker is not None:
        w0, wd = walker
        mid = w0 + wd / 2
        shadow -= 0.45 * np.exp(-0.5 * ((t - mid) / (0.12 * wd)) ** 2)  # walker blocks line of sight
    H = (shadow[:, None] * los[None, :]) + static[None, :] + (body_amp[:, None] * np.exp(-2j * np.pi * f[None, :] * body_len[:, None] / C))

    if walker is not None:
        w0, wd = walker
        wt = np.clip((t - w0) / wd, 0, 1)
        active = ((t >= w0) & (t <= w0 + wd)).astype(float)
        envelope = active * np.sin(np.pi * wt) ** 0.5
        wlen = rng.uniform(5, 8) + 2.5 * wt + 0.03 * np.sin(2 * np.pi * 1.8 * t)
        wamp = 0.5 * envelope * (1 + 0.25 * np.sin(2 * np.pi * 1.8 * t))
        H = H + wamp[:, None] * np.exp(-2j * np.pi * f[None, :] * wlen[:, None] / C)

    H = H * (1 + rng.normal(0, 0.01, (t.size, 1)))  # AGC jitter
    H = H + noise * (rng.normal(size=H.shape) + 1j * rng.normal(size=H.shape))
    H[:, sorted(NULL_SUBCARRIERS)] = 0

    md = {
        "synthetic": True,
        "source": "wisp-synthetic-csi",
        "fs": fs,
        "ground_truth_total_seconds": round(end - pre_roll, 2),
        "ground_truth_per_rise_seconds": [round(c, 2) for c in cycles],
        "ground_truth_start_s": pre_roll,
        "start_cue_s": pre_roll,
        "walker": list(walker) if walker else None,
    }
    md.update(meta or {})
    return CSIRecording(H.astype(np.complex64), t, md)
