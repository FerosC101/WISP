"""Runtime configuration (environment variables with safe local defaults)."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("WISP_DATA_DIR", REPO_ROOT / "data"))
DB_PATH = Path(os.environ.get("WISP_DB_PATH", DATA_DIR / "wisp.sqlite3"))
KEY_PATH = Path(os.environ.get("WISP_KEY_PATH", DATA_DIR / ".wisp_local.key"))
RECORDINGS_DIR = DATA_DIR / "recorded_csi"
DEMO_DIR = DATA_DIR / "demo"

# Sensor: "replay" (recorded CSI files) or "esp32" (live serial capture).
SENSOR_MODE = os.environ.get("WISP_SENSOR_MODE", "replay")
SERIAL_PORT = os.environ.get("WISP_SERIAL_PORT")
SERIAL_BAUD = int(os.environ.get("WISP_SERIAL_BAUD", "921600"))
SAVE_RAW_CSI = os.environ.get("WISP_SAVE_RAW_CSI", "1") == "1"
REPLAY_SPEED = float(os.environ.get("WISP_REPLAY_SPEED", "1.0"))

# Optional OpenAI-compatible LLM for natural-language -> structured field extraction
# in the built-in agent (e.g. Tencent Hunyuan's OpenAI-compatible endpoint).
LLM_BASE_URL = os.environ.get("WISP_LLM_BASE_URL")
LLM_API_KEY = os.environ.get("WISP_LLM_API_KEY")
LLM_MODEL = os.environ.get("WISP_LLM_MODEL", "hunyuan-turbos-latest")

# Shared secret between the MCP server process and the API (local only).
MCP_TOKEN = os.environ.get("WISP_MCP_TOKEN", "wisp-local-dev-token")

GRANT_TTL_SECONDS = 600
PATIENT_READY_TIMEOUT_SECONDS = 180
