#!/usr/bin/env bash
# One-command WISP demo: installs dependencies, seeds demo data, starts the API
# (and optionally the MCP server for WorkBuddy) and the web app.
#
#   ./scripts/demo.sh            # built-in agent, recorded (synthetic) sensor replay
#   ./scripts/demo.sh --mcp      # also serve MCP on http://127.0.0.1:8765/mcp for WorkBuddy
#   WISP_SENSOR_MODE=esp32 WISP_SERIAL_PORT=/dev/cu.usbserial-XXXX ./scripts/demo.sh   # live ESP32
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WITH_MCP=0
[[ "${1:-}" == "--mcp" ]] && WITH_MCP=1

command -v uv >/dev/null || { echo "Please install uv: https://docs.astral.sh/uv/"; exit 1; }
command -v npm >/dev/null || { echo "Please install Node.js 20+"; exit 1; }

echo "▸ Installing Python services"
(cd "$ROOT/services" && uv sync --quiet)
echo "▸ Installing web app"
(cd "$ROOT/apps/web" && npm install --silent)

if [[ ! -f "$ROOT/data/wisp.sqlite3" ]]; then
  echo "▸ Seeding demo personas, synthetic CSI recordings and baselines"
  (cd "$ROOT/services" && uv run python -m wisp.demo.seed)
fi

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

echo "▸ API on http://127.0.0.1:8787  (sensor: ${WISP_SENSOR_MODE:-replay})"
(cd "$ROOT/services" && uv run uvicorn wisp.api.main:app --host 127.0.0.1 --port 8787 --log-level warning) &
pids+=($!)

if [[ $WITH_MCP == 1 ]]; then
  echo "▸ MCP server for WorkBuddy on http://127.0.0.1:8765/mcp"
  (cd "$ROOT/services" && uv run python -m wisp.mcp.server --http --port 8765) &
  pids+=($!)
fi

echo "▸ Web app on http://localhost:3000"
(cd "$ROOT/apps/web" && npm run dev -- --port 3000) &
pids+=($!)

wait
