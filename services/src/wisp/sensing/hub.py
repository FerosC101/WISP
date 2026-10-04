"""Shared serial access for ESP32 CSI.

One background reader per port, shared by the live monitor (Engineering view) and
the live assessment provider, so both can use the board at the same time. The
reader is started on first use and stopped when the last user releases it —
the radio is only read while something actually needs it.
"""

from __future__ import annotations

import threading
import time
from collections import deque

import numpy as np

from .esp32 import N_SUBCARRIERS, parse_csi_line


def list_ports() -> list[dict]:
    try:
        from serial.tools import list_ports as lp
    except ImportError:
        return []
    out = []
    for p in lp.comports():
        dev = p.device
        if "Bluetooth" in dev or "debug-console" in dev:
            continue
        out.append({"port": dev, "description": p.description or "", "vid": p.vid, "pid": p.pid, "likely_esp32": _likely_esp32(p)})
    # Prefer callout devices on macOS (/dev/cu.*)
    out.sort(key=lambda d: (not d["likely_esp32"], not d["port"].startswith("/dev/cu."), d["port"]))
    return out


def _likely_esp32(p) -> bool:
    # Espressif native USB (0x303A), CP210x (0x10C4), CH34x (0x1A86), FTDI (0x0403)
    return p.vid in (0x303A, 0x10C4, 0x1A86, 0x0403) or "usbmodem" in p.device or "usbserial" in p.device


def _rssi(line: str) -> int | None:
    parts = line.split(",")
    for idx in (3, 2):  # esp-csi / ESP32-CSI-Tool layouts
        if len(parts) > idx:
            try:
                v = int(parts[idx])
                if -120 < v < 0:
                    return v
            except ValueError:
                pass
    return None


class SerialStream:
    def __init__(self, port: str, baud: int, keep_seconds: float = 90.0):
        self.port = port
        self.baud = baud
        self.packets: deque[tuple[float, np.ndarray]] = deque(maxlen=int(keep_seconds * 400))
        self.text: deque[tuple[float, str]] = deque(maxlen=60)
        self.rssi: deque[int] = deque(maxlen=200)
        self.total_packets = 0
        self.total_text_lines = 0
        self.error: str | None = None
        self.opened_at = time.monotonic()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.users = 0

    def start(self) -> None:
        import serial

        self._serial = serial.Serial(self.port, self.baud, timeout=0.3)
        self._thread = threading.Thread(target=self._run, daemon=True, name=f"csi-{self.port}")
        self._thread.start()

    def _run(self) -> None:
        pending = b""
        try:
            while not self._stop.is_set():
                chunk = self._serial.read(4096)
                if not chunk:
                    continue
                pending += chunk
                *lines, pending = pending.split(b"\n")
                now = time.monotonic()
                for raw in lines:
                    line = raw.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue
                    vec = parse_csi_line(line)
                    if vec is not None:
                        self.packets.append((now, vec))
                        self.total_packets += 1
                        r = _rssi(line)
                        if r is not None:
                            self.rssi.append(r)
                    else:
                        self.text.append((now, line[:240]))
                        self.total_text_lines += 1
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI
            self.error = str(exc)
        finally:
            try:
                self._serial.close()
            except Exception:  # noqa: BLE001
                pass

    def write_line(self, text: str) -> None:
        """Send one command line to the board (never logged: may carry Wi-Fi credentials)."""
        self._serial.write((text.strip() + "\n").encode("utf-8"))
        self._serial.flush()

    def firmware_state(self) -> dict:
        """Interpret WISP firmware status lines (WISP_*) if the board runs it."""
        wisp = [(t, line) for t, line in list(self.text) if line.startswith("WISP_")]
        if not wisp:
            return {"firmware": "unknown"}
        last = wisp[-1][1]
        info: dict = {"firmware": "wisp", "last": last.split(" ")[0]}
        for _, line in reversed(wisp):
            if line.startswith("WISP_READY"):
                for part in line.split(" ")[1:]:
                    if "=" in part:
                        k, v = part.split("=", 1)
                        info[k] = v.strip('"')
                break
        return info

    def reset_board(self) -> None:
        """Pulse RTS (EN) to reboot the board so its boot log becomes visible."""
        self._serial.dtr = False
        self._serial.rts = True
        time.sleep(0.12)
        self._serial.rts = False

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)

    @property
    def alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    # ------------------------------------------------------------------ reads
    def snapshot(self, since: float) -> tuple[np.ndarray, np.ndarray]:
        items = [(t, v) for t, v in list(self.packets) if t >= since]
        if not items:
            return np.zeros((0, N_SUBCARRIERS), np.complex64), np.zeros(0)
        return np.stack([i[1] for i in items]), np.array([i[0] for i in items]) - since

    def status(self, window: float = 2.0) -> dict:
        now = time.monotonic()
        recent = [t for t, _ in list(self.packets) if t >= now - window]
        recent_text = [t for t, _ in list(self.text) if t >= now - window]
        rate = len(recent) / window
        fw = self.firmware_state()
        if self.error:
            state = "error"
        elif rate > 5:
            state = "streaming_csi"
        elif fw.get("last") == "WISP_NEED_WIFI":
            state = "needs_wifi"
        elif fw.get("last") in ("WISP_CONNECTING", "WISP_WIFI_TIMEOUT", "WISP_WIFI_DISCONNECTED", "WISP_WIFI_SAVED"):
            state = "connecting"
        elif recent_text or self.total_text_lines and not self.total_packets:
            state = "text_only"
        else:
            state = "silent"
        return {
            "port": self.port,
            "baud": self.baud,
            "state": state,
            "packets_per_second": round(rate, 1),
            "total_packets": self.total_packets,
            "total_text_lines": self.total_text_lines,
            "rssi": round(float(np.mean(list(self.rssi)[-20:])), 1) if self.rssi else None,
            "uptime_s": round(now - self.opened_at, 1),
            "error": self.error,
            "device": fw,
        }

    def live_frame(self, seconds: float = 0.25) -> dict:
        """Recent amplitude summary for the monitor: one heatmap column + motion energy."""
        now = time.monotonic()
        recent = [v for t, v in list(self.packets) if t >= now - seconds]
        if not recent:
            return {"amplitude": None, "energy": None}
        amp = np.abs(np.stack(recent))
        col = amp.mean(axis=0)
        # Motion energy: mean temporal std across subcarriers over the last 0.5 s.
        longer = [v for t, v in list(self.packets) if t >= now - 0.5]
        energy = float(np.abs(np.stack(longer)).std(axis=0).mean()) if len(longer) > 3 else 0.0
        return {"amplitude": np.round(col, 2).tolist(), "energy": round(energy, 4)}

    def recent_text(self, n: int = 12) -> list[str]:
        return [line for _, line in list(self.text)[-n:]]


class SerialHub:
    def __init__(self) -> None:
        self._streams: dict[str, SerialStream] = {}
        self._lock = threading.Lock()

    def acquire(self, port: str, baud: int) -> SerialStream:
        with self._lock:
            s = self._streams.get(port)
            if s is None or not s.alive:
                s = SerialStream(port, baud)
                s.start()
                self._streams[port] = s
            s.users += 1
            return s

    def release(self, port: str) -> None:
        with self._lock:
            s = self._streams.get(port)
            if not s:
                return
            s.users -= 1
            if s.users <= 0:
                s.stop()
                del self._streams[port]

    def get(self, port: str) -> SerialStream | None:
        return self._streams.get(port)

    def active(self) -> list[dict]:
        with self._lock:
            return [{**s.status(), "users": s.users} for s in self._streams.values()]


HUB = SerialHub()
