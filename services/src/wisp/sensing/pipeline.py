"""5xSTS signal processing on Wi-Fi CSI amplitude.

No deep learning. Steps:

  1. amplitude |H|, drop null/guard subcarriers
  2. Hampel-style outlier suppression + low-pass smoothing
  3. per-subcarrier normalisation, select the most motion-sensitive subcarriers
  4. PCA -> a few principal components
  5. motion energy (moving std of band-passed PCs) -> active window
  6. posture signal = distance from the seated rest state in PC space
  7. peak detection on the posture signal -> standing phases -> five cycles
  8. confidence + single-person heuristics

Thresholds were tuned on synthetic recordings and MUST be re-checked against real
captures with stopwatch ground truth (see evaluation/sensor_accuracy).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy import signal

from .recording import CSIRecording

EXPECTED_RISES = 5
TOP_SUBCARRIERS = 24
N_PCS = 4


@dataclass
class SegmentationResult:
    success: bool
    reason: str | None
    total_time_seconds: float | None
    rise_count: int
    per_rise_seconds: list[float]
    measurement_confidence: float
    single_person_confidence: float
    onset_s: float | None = None
    offset_s: float | None = None
    stand_peaks_s: list[float] = field(default_factory=list)
    features: dict = field(default_factory=dict)
    # Downsampled traces for developer diagnostics only (never sent to the agent).
    debug: dict = field(default_factory=dict)


def _resample_uniform(rec: CSIRecording, fs: float) -> tuple[np.ndarray, np.ndarray]:
    amp = np.abs(rec.csi).astype(np.float64)
    t = rec.t - rec.t[0]
    tu = np.arange(0, t[-1], 1.0 / fs)
    out = np.empty((tu.size, amp.shape[1]))
    for j in range(amp.shape[1]):
        out[:, j] = np.interp(tu, t, amp[:, j])
    return tu, out


def _hampel(x: np.ndarray, k: int = 7, n_sigma: float = 3.0) -> np.ndarray:
    med = signal.medfilt(x, kernel_size=k)
    resid = np.abs(x - med)
    mad = signal.medfilt(resid, kernel_size=k) * 1.4826 + 1e-9
    return np.where(resid > n_sigma * mad, med, x)


def _moving_std(x: np.ndarray, win: int) -> np.ndarray:
    kernel = np.ones(win) / win
    m = np.convolve(x, kernel, mode="same")
    m2 = np.convolve(x * x, kernel, mode="same")
    return np.sqrt(np.maximum(m2 - m * m, 0))


def _clip01(x: float) -> float:
    return float(min(1.0, max(0.0, x)))


def preprocess(rec: CSIRecording, fs: float = 50.0) -> tuple[np.ndarray, np.ndarray, dict]:
    t, amp = _resample_uniform(rec, fs)
    live = amp.mean(axis=0) > 1e-3 * max(amp.mean(), 1e-9)
    amp = amp[:, live]
    amp = np.column_stack([_hampel(amp[:, j]) for j in range(amp.shape[1])])
    b, a = signal.butter(4, 6.0 / (fs / 2), btype="low")
    amp = signal.filtfilt(b, a, amp, axis=0)
    # Amplitude normalisation (removes per-subcarrier gain differences).
    amp = (amp - amp.mean(axis=0)) / (amp.std(axis=0) + 1e-9)
    # Subcarrier selection: highest short-term variability = most motion-sensitive.
    diff_var = np.var(np.diff(amp, axis=0), axis=0)
    sel = np.argsort(diff_var)[::-1][: min(TOP_SUBCARRIERS, amp.shape[1])]
    x = amp[:, sel]
    x = x - x.mean(axis=0)
    u, s, vt = np.linalg.svd(x, full_matrices=False)
    pcs = u[:, :N_PCS] * s[:N_PCS]
    explained = (s**2) / np.sum(s**2)
    return t, pcs, {"explained": explained[:N_PCS].tolist(), "n_subcarriers": int(live.sum())}


START_CUE_S = 3.0  # the patient screen counts down "3, 2, 1, begin" while they sit still


def segment_5xsts(rec: CSIRecording, fs: float = 50.0) -> SegmentationResult:
    start_cue = float(rec.meta.get("start_cue_s", START_CUE_S))
    if rec.duration < 6:
        return SegmentationResult(False, "recording_too_short", None, 0, [], 0.0, 0.0)

    t, pcs, info = preprocess(rec, fs)

    # Motion energy: moving std of high-passed PCs (removes slow drift).
    b, a = signal.butter(2, 0.3 / (fs / 2), btype="high")
    hp = signal.filtfilt(b, a, pcs, axis=0)
    win = int(0.5 * fs)
    energy = np.sqrt(np.sum([_moving_std(hp[:, i], win) ** 2 for i in range(pcs.shape[1])], axis=0))
    energy = signal.savgol_filter(energy, int(0.5 * fs) | 1, 2)

    rest_n = int(1.5 * fs)
    rest_level = float(np.median(np.concatenate([energy[:rest_n], energy[-rest_n:]])))
    peak_level = float(np.percentile(energy, 95))
    thr = rest_level + 0.15 * (peak_level - rest_level)
    active = energy > thr
    active[t < start_cue - 0.6] = False  # the participant has not been told to start yet
    idx = np.flatnonzero(active)
    if idx.size == 0 or peak_level < 3 * max(rest_level, 1e-6):
        return SegmentationResult(False, "no_movement_detected", None, 0, [], 0.1, 0.5, debug=_debug(t, energy, None))

    onset_i, offset_i = int(idx[0]), int(idx[-1])
    # Energy is a centred moving window: pull boundaries in by half a window.
    onset_s = float(t[onset_i]) + 0.25
    offset_s = float(t[offset_i]) - 0.25

    # Posture signal: distance from the seated rest state (first 1.5 s) in PC space.
    rest_mean = pcs[:rest_n].mean(axis=0)
    d_raw = np.linalg.norm(pcs - rest_mean, axis=1)
    bl, al = signal.butter(2, 0.9 / (fs / 2), btype="low")
    d = signal.filtfilt(bl, al, d_raw)

    seg = (t >= onset_s) & (t <= offset_s)
    d_seg = d[seg]
    t_seg = t[seg]
    span = float(d_seg.max() - d_seg.min()) if d_seg.size else 0.0
    peaks, props = signal.find_peaks(d_seg, distance=int(0.9 * fs), prominence=0.25 * span if span > 0 else None)
    stand_peaks = t_seg[peaks].tolist()
    prominences = props.get("prominences", np.array([]))

    # Single-person heuristics ------------------------------------------------
    explained = np.array(info["explained"])
    concentration = float(explained[:2].sum())
    f, pxx = signal.welch(hp[(t >= onset_s) & (t <= offset_s), 0], fs=fs, nperseg=min(256, int(seg.sum())))
    low = pxx[(f >= 0.15) & (f < 1.2)].sum()
    gait = pxx[(f >= 1.4) & (f < 2.6)].sum()
    gait_ratio = float(gait / (low + gait + 1e-12))
    # Movement before the start cue cannot be the participant's sit-to-stand.
    pre = (t >= 0.3) & (t <= start_cue - 0.6)
    pre_motion = float(np.percentile(energy[pre], 90) / (peak_level + 1e-9)) if pre.any() else 0.0
    n_peaks = len(stand_peaks)
    extra_peaks = max(0, n_peaks - EXPECTED_RISES)

    # Structural checks: with one person doing 5xSTS the posture signal returns to
    # the seated state between rises and every cycle has a similar shape. A second
    # moving person breaks both.
    trough_residual, shape_corr = 0.0, 1.0
    if n_peaks >= 2:
        bf, af = signal.butter(2, 2.5 / (fs / 2), btype="low")
        d_fine = signal.filtfilt(bf, af, d_raw)
        d_fine_seg = d_fine[seg]
        peak_h = float(np.median(d_fine_seg[peaks]))
        troughs = [float(d_fine_seg[p0:p1].min()) for p0, p1 in zip(peaks[:-1], peaks[1:])]
        troughs.append(float(np.median(d_fine[t > offset_s + 0.5])) if np.any(t > offset_s + 0.5) else 0.0)
        trough_residual = max(troughs) / (peak_h + 1e-9)
        cyc_bounds = [0] + [p0 + int(np.argmin(d_seg[p0:p1])) for p0, p1 in zip(peaks[:-1], peaks[1:])] + [d_seg.size - 1]
        shapes = []
        for c0, c1 in zip(cyc_bounds[:-1], cyc_bounds[1:]):
            if c1 - c0 > 5:
                shapes.append(np.interp(np.linspace(0, 1, 50), np.linspace(0, 1, c1 - c0), d_seg[c0:c1]))
        if len(shapes) >= 2:
            ref = np.median(np.array(shapes), axis=0)
            shape_corr = float(min(np.corrcoef(sh, ref)[0, 1] for sh in shapes))

    # Someone crossing just as the test starts stretches the first cycle; a genuine
    # fatigue pattern makes later cycles slower, not the first.
    first_cycle_ratio = 1.0
    if n_peaks == EXPECTED_RISES and n_peaks >= 3:
        firsts = [float(t_seg[peaks[0]] - onset_s), float(np.median(np.diff(t_seg[peaks])))]
        first_cycle_ratio = firsts[0] / (0.42 * firsts[1] + 1e-9)

    single = 1.0
    single -= _clip01((first_cycle_ratio - 1.25) / 0.3) * 0.35
    single -= _clip01((trough_residual - 0.30) / 0.3) * 0.5
    single -= _clip01((0.80 - shape_corr) / 0.4) * 0.4
    single -= _clip01((pre_motion - 0.2) / 0.2) * 0.5
    single -= min(extra_peaks, 3) * 0.15
    single = _clip01(single)

    # Cycle boundaries: posture minima between standing peaks.
    per_rise: list[float] = []
    if n_peaks == EXPECTED_RISES:
        bounds = [onset_s]
        for p0, p1 in zip(peaks[:-1], peaks[1:]):
            m = p0 + int(np.argmin(d_seg[p0:p1]))
            bounds.append(float(t_seg[m]))
        bounds.append(offset_s)
        per_rise = [round(b1 - b0, 2) for b0, b1 in zip(bounds[:-1], bounds[1:])]

    total = round(offset_s - onset_s, 2)

    # Measurement confidence -------------------------------------------------
    count_score = 1.0 if n_peaks == EXPECTED_RISES else 0.35 if abs(n_peaks - EXPECTED_RISES) == 1 else 0.05
    if per_rise:
        cv = float(np.std(per_rise) / (np.mean(per_rise) + 1e-9))
        reg_score = _clip01(1 - (cv - 0.3) / 0.4)
        plaus = all(0.8 <= r <= 12 for r in per_rise) and 4 <= total <= 60
    else:
        reg_score, plaus = 0.2, False
    noise = float(np.std(np.diff(d[:rest_n]))) + 1e-9
    snr = float(np.median(prominences) / (noise * 50)) if prominences.size else 0.0
    snr_score = _clip01(snr / 3)
    conf = 0.5 * count_score + 0.25 * reg_score + 0.25 * snr_score
    if not plaus:
        conf = min(conf, 0.4)
    conf = round(_clip01(conf) * (0.6 + 0.4 * single), 3)

    features = {
        "pc_concentration": round(concentration, 3),
        "gait_band_ratio": round(gait_ratio, 3),
        "trough_residual": round(trough_residual, 3),
        "cycle_shape_corr": round(shape_corr, 3),
        "first_cycle_ratio": round(first_cycle_ratio, 3),
        "pre_motion": round(pre_motion, 3),
        "stand_peaks": n_peaks,
        "snr": round(snr, 2),
        "rest_energy": round(rest_level, 4),
        "subcarriers_used": info["n_subcarriers"],
    }

    reason = None
    success = True
    if single < 0.8:
        success, reason = False, "multiple_people_detected"
    elif n_peaks != EXPECTED_RISES:
        success, reason = False, f"expected_5_rises_found_{n_peaks}"
    elif conf < 0.6:
        success, reason = False, "low_measurement_confidence"

    return SegmentationResult(
        success=success,
        reason=reason,
        total_time_seconds=total if success else None,
        rise_count=min(n_peaks, EXPECTED_RISES) if success else n_peaks,
        per_rise_seconds=per_rise if success else [],
        measurement_confidence=conf,
        single_person_confidence=round(single, 3),
        onset_s=round(onset_s, 2),
        offset_s=round(offset_s, 2),
        stand_peaks_s=[round(p, 2) for p in stand_peaks],
        features=features,
        debug=_debug(t, energy, d),
    )


def count_rises_so_far(rec: CSIRecording, fs: float = 50.0) -> int:
    """Rough online count for progress display (developer view)."""
    if rec.duration < 3:
        return 0
    t, pcs, _ = preprocess(rec, fs)
    rest_n = int(1.5 * fs)
    d = np.linalg.norm(pcs - pcs[:rest_n].mean(axis=0), axis=1)
    bl, al = signal.butter(2, 0.9 / (fs / 2), btype="low")
    d = signal.filtfilt(bl, al, d)
    span = float(d.max() - d.min())
    if span <= 0:
        return 0
    peaks, _ = signal.find_peaks(d, distance=int(0.9 * fs), prominence=0.3 * span)
    return int(min(len(peaks), EXPECTED_RISES))


def _debug(t: np.ndarray, energy: np.ndarray, posture: np.ndarray | None, step: int = 5) -> dict:
    return {
        "t": np.round(t[::step], 2).tolist(),
        "energy": np.round(energy[::step], 4).tolist(),
        "posture": np.round(posture[::step], 4).tolist() if posture is not None else [],
    }
