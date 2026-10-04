"""On-disk format for CSI recordings (local only, used for replay and debugging).

A recording is a `.npz` file with:
  csi   complex64 (T, S)   per-packet channel state, S subcarriers
  t     float64   (T,)     seconds since capture start
  meta  str               JSON metadata (source, persona, ground truth if known)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np


@dataclass
class CSIRecording:
    csi: np.ndarray
    t: np.ndarray
    meta: dict = field(default_factory=dict)

    @property
    def fs(self) -> float:
        if len(self.t) < 2:
            return 100.0
        return float(1.0 / np.median(np.diff(self.t)))

    @property
    def duration(self) -> float:
        return float(self.t[-1] - self.t[0]) if len(self.t) else 0.0

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(path, csi=self.csi.astype(np.complex64), t=self.t, meta=json.dumps(self.meta))

    @classmethod
    def load(cls, path: Path) -> "CSIRecording":
        with np.load(path, allow_pickle=False) as z:
            return cls(csi=z["csi"], t=z["t"], meta=json.loads(str(z["meta"])))

    def slice(self, end_s: float) -> "CSIRecording":
        n = int(np.searchsorted(self.t, self.t[0] + end_s))
        return CSIRecording(self.csi[:n], self.t[:n], self.meta)
