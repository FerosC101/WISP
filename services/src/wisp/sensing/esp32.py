"""ESP32 CSI serial acquisition.

Supports the line formats printed by Espressif's `esp-csi` examples
(`csi_recv`) and by ESP32-CSI-Tool: a `CSI_DATA,...` line whose last field is a
bracketed list of signed bytes, interleaved as [imag, real] per subcarrier.

Hardware setup is described in hardware/esp32/README.md.
"""

from __future__ import annotations

import re
import threading
import time
from collections import deque

import numpy as np

N_SUBCARRIERS = 64  # HT20 legacy LTF
_BRACKET = re.compile(r"\[([^\]]*)\]")


def parse_csi_line(line: str) -> np.ndarray | None:
    """Parse one serial line into a complex vector of length N_SUBCARRIERS."""
    if not line.startswith("CSI_DATA"):
        return None
    m = _BRACKET.search(line)
    if not m:
        return None
    try:
        raw = [int(v) for v in m.group(1).replace(",", " ").split()]
    except ValueError:
        return None
    if len(raw) < 2 * N_SUBCARRIERS:
        return None
    arr = np.asarray(raw[: 2 * N_SUBCARRIERS], dtype=np.float32)
    imag, real = arr[0::2], arr[1::2]
    return (real + 1j * imag).astype(np.complex64)


class SerialCSIReader:
    """Background reader that buffers parsed CSI packets with host timestamps."""

    def __init__(self, port: str, baud: int = 921600, max_seconds: float = 90.0):
        self.port = port
        self.baud = baud
        self._buf: deque[tuple[float, np.ndarray]] = deque(maxlen=int(max_seconds * 1000))
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.error: str | None = None
        self.packets = 0

    def start(self) -> None:
        import serial  # pyserial; imported lazily so the app runs without hardware

        self._serial = serial.Serial(self.port, self.baud, timeout=0.5)
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        try:
            while not self._stop.is_set():
                line = self._serial.readline().decode("ascii", errors="ignore").strip()
                vec = parse_csi_line(line)
                if vec is not None:
                    self._buf.append((time.monotonic(), vec))
                    self.packets += 1
        except Exception as exc:  # noqa: BLE001 - report any serial failure to the caller
            self.error = str(exc)
        finally:
            try:
                self._serial.close()
            except Exception:  # noqa: BLE001
                pass

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)

    def snapshot(self, since: float) -> tuple[np.ndarray, np.ndarray]:
        items = [(t, v) for t, v in list(self._buf) if t >= since]
        if not items:
            return np.zeros((0, N_SUBCARRIERS), np.complex64), np.zeros(0)
        t = np.array([i[0] for i in items]) - since
        csi = np.stack([i[1] for i in items])
        return csi, t


def probe_port(port: str | None) -> bool:
    if not port:
        return False
    try:
        import serial  # noqa: F401
        from pathlib import Path

        return Path(port).exists()
    except ImportError:
        return False
