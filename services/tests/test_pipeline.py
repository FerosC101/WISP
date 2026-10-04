"""5xSTS segmentation on SYNTHETIC CSI. These check the pipeline logic, not real-world accuracy."""

from __future__ import annotations

import numpy as np
import pytest

from wisp.sensing.esp32 import parse_csi_line
from wisp.sensing.pipeline import segment_5xsts
from wisp.sensing.synth import generate_5xsts


@pytest.mark.parametrize("seed", range(6))
@pytest.mark.parametrize("cycles", [[2.3, 2.4, 2.35, 2.4, 2.45], [2.7, 2.9, 3.2, 3.6, 4.0], [1.6, 1.7, 1.6, 1.8, 1.7]])
def test_single_person_sessions_segment(seed, cycles):
    rec = generate_5xsts(cycles, seed=seed)
    r = segment_5xsts(rec)
    assert r.success, r.reason
    assert r.rise_count == 5 and len(r.per_rise_seconds) == 5
    assert abs(r.total_time_seconds - rec.meta["ground_truth_total_seconds"]) < 0.8
    assert r.single_person_confidence >= 0.8


def test_second_person_detection_rate_regression_guard():
    """Single-link passer-by detection is imperfect (documented limitation).

    This guards against regressions; the measured rate is reported by
    evaluation/sensor_accuracy/synthetic_benchmark.py, not claimed as real-world.
    """
    walkers = [(1.0, 3.0), (2.0, 3.5), (4.0, 3.0), (6.0, 4.0), (9.0, 3.0), (12.0, 3.5)]
    rejected = sum(
        not segment_5xsts(generate_5xsts([2.7, 2.9, 3.2, 3.6, 4.0], seed=s, walker=w)).success
        for s in range(5) for w in walkers
    )
    assert rejected / (5 * len(walkers)) >= 0.5


@pytest.mark.parametrize("rid", ["tan_interference", "siti_interference"])
def test_demo_interference_recordings_rejected(demo_data, rid):
    from wisp.sensing.recording import CSIRecording

    r = segment_5xsts(CSIRecording.load(demo_data[0] / "recorded_csi" / f"{rid}.npz"))
    assert not r.success and r.reason == "multiple_people_detected"


def test_no_movement_fails_cleanly():
    rec = generate_5xsts([2.0] * 5, seed=1)
    still = rec.slice(2.5)
    still.csi = np.tile(still.csi, (6, 1))
    still.t = np.arange(still.csi.shape[0]) / 100.0
    r = segment_5xsts(still)
    assert not r.success


def test_parse_esp32_line():
    vals = " ".join(str(v) for v in ([3, 4] * 64))
    v = parse_csi_line(f'CSI_DATA,1,aa:bb:cc:dd:ee:ff,-40,11,1,0,0,0,0,0,0,0,0,-92,0,6,0,123456,0,128,0,0,0,128,0,"[{vals}]"')
    assert v is not None and v.shape == (64,) and abs(v[0] - (4 + 3j)) < 1e-6
    assert parse_csi_line("garbage") is None
