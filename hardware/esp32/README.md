# ESP32 Wi-Fi CSI setup

> Status: WISP firmware builds in CI and has been flashed to an ESP32-S3; it boots and waits for Wi-Fi.
> Real CSI streaming and 5xSTS segmentation on real captures still need to be verified — the pipeline's
> thresholds were tuned on **synthetic** recordings. Re-validate (see *Calibration*) before any accuracy claim.

## Hardware (single-board router mode — recommended)

- 1 × ESP32-S3 with native USB (tested target: ESP32-S3 QFN56 rev v0.2, 16 MB flash)
- Your home **2.4 GHz** Wi-Fi router acts as the transmitter: the board pings it ~100 times per second
  and measures the channel of each reply.
- A sturdy chair without wheels, against a wall, between the board and the router if possible.

(A two-board TX/RX setup with Espressif's `csi_send` / `csi_recv` also works; WISP parses the same `CSI_DATA` lines.)

## Firmware: `hardware/esp32/wisp_csi_router`

Based on Espressif esp-csi `csi_recv_router`, with three changes: output over the native USB port, Wi-Fi
credentials provisioned at runtime over USB (stored in the board's NVS, never compiled in or committed), and
Wi-Fi power-save off for steady 100 Hz pings.

**Build** — GitHub Actions (`.github/workflows/esp32-firmware.yml`) builds it with ESP-IDF v5.4 on every change;
no local toolchain needed. Or locally with ESP-IDF ≥ 5.3: `idf.py set-target esp32s3 build`.

**Flash** (back up first — see below):

```bash
gh run download --repo <owner>/WISP --name wisp_csi_router-esp32s3 --dir /tmp/wisp_fw   # latest build artifact
uvx --from esptool esptool --port /dev/cu.usbmodemXXXX --chip esp32s3 erase-flash
uvx --from esptool esptool --port /dev/cu.usbmodemXXXX --chip esp32s3 --baud 921600 \
    write-flash 0x0 /tmp/wisp_fw/wisp_csi_router_merged.bin
```

**Connect it to Wi-Fi** — in WISP open the Engineering view (`/dev`) → **Live sensor** → Connect → **Sensor Wi-Fi**,
enter the 2.4 GHz network name and password, **Send to sensor**. The board restarts, joins, and the status changes to
**Streaming CSI** (~100 pkt/s). Then press **Use this sensor for checks**.

Serial protocol (for reference): `WISP_WIFI <ssid hex> <password hex>`, `WISP_STATUS`, `WISP_FORGET`. Status lines:
`WISP_NEED_WIFI`, `WISP_CONNECTING`, `WISP_WIFI_TIMEOUT`, `WISP_READY …`.

**Back up / restore the previous firmware**

```bash
# backup (16 MB board) — done for the original HARVESTGUARD POD firmware into data/firmware_backup/ (git-ignored)
uvx --from esptool esptool --port /dev/cu.usbmodemXXXX read-flash 0 0x1000000 backup.bin
# restore
uvx --from esptool esptool --port /dev/cu.usbmodemXXXX --chip esp32s3 write-flash 0x0 backup.bin
```

## Run live

```bash
ls /dev/cu.usbmodem* /dev/cu.usbserial-* /dev/ttyUSB* 2>/dev/null     # find the board
WISP_SENSOR_MODE=esp32 WISP_SERIAL_PORT=/dev/cu.usbmodemXXXX ./scripts/demo.sh
# …or start normally and switch at runtime: Engineering view → Live sensor → "Use this sensor for checks"
```

The Dev page shows `LIVE SENSOR`. Raw captures are saved to `data/recorded_csi/live/`
for debugging only (set `WISP_SAVE_RAW_CSI=0` to disable). They never leave the machine.

## Capture protocol (matches the pipeline)

1. Patient sits still. They press **I'm seated — start**.
2. Screen counts down 3 s ("Sit still… 3, 2, 1"). Movement in this window is treated as interference.
3. Five full stands, sitting back down after the fifth. Capture ends after ~2.5 s of stillness.

## Collecting real trials (participants + ground truth)

```bash
cd services
uv run python ../scripts/collect_trials.py --participant P01 --port /dev/cu.usbserial-XXXX \
    --chair "dining chair, against wall" --distance-m 2.5 --trials 8
uv run python ../evaluation/sensor_accuracy/real_report.py     # participants, trials, MAE, median, rejections, confidence
```

Use pseudonymous IDs only (P01, P02…), get consent, and keep raw CSI local. Aim for 3–5 participants × 5–10 trials.
Include a few deliberate "someone walks past" trials (noted in the condition field) to measure rejection honestly.
`--dry-run` exercises the tool with synthetic data (written to a separate `trials_dryrun.csv`).

## Calibration and validation

1. For every live session, time it with a stopwatch or phone video (start = first movement, stop = seated after the 5th stand).
2. Enter the ground truth with `scripts/collect_trials.py` (preferred) or on the Engineering view next to the measurement.
3. `real_report.py` (and the Engineering view) report MAE, median error, failure count and mean confidence for logged sessions.
4. If timing is biased, adjust boundary handling in `pipeline.py`; if real single-person sessions are rejected, re-tune the single-person heuristics against your recordings. Record what you changed.
