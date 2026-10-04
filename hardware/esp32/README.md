# ESP32 Wi-Fi CSI setup

> Status: the acquisition code (`services/src/wisp/sensing/esp32.py`) and the live
> provider are implemented and unit-tested against the serial line format, but the
> segmentation thresholds were tuned on **synthetic** recordings. Re-validate on
> real captures (see *Calibration*) before any demo claim about accuracy.

## Hardware

- 2 × ESP32 dev boards (ESP32-S3 or classic ESP32; one antenna each is fine)
- USB cable from the receiver to the laptop running WISP
- 5 V power for the transmitter (USB power bank is fine)
- A sturdy chair without wheels, against a wall

## Firmware

Use Espressif's [esp-csi](https://github.com/espressif/esp-csi) examples:

| Board | Example | Notes |
|---|---|---|
| Transmitter | `examples/get-started/csi_send` | ~100 packets/s on a fixed channel |
| Receiver | `examples/get-started/csi_recv` | prints `CSI_DATA,…,"[i q i q …]"` lines over UART |

Set the receiver UART baud rate to **921600** (or set `WISP_SERIAL_BAUD`). ESP32-CSI-Tool
firmware also works; WISP parses any `CSI_DATA` line whose last field is a bracketed list
of interleaved `[imag, real]` values and uses the first 64 subcarriers.

## Placement

```
   [TX] ·············· line of sight ·············· [RX]──USB──laptop
           2–3 m apart, both ~0.8–1.0 m high
                    │
                  [chair]  ← ~0.5–1 m from the line, back to a wall
```

- Keep TX, RX and the chair in the **same positions** for baseline and assessment sessions.
- Keep the area between TX and RX clear of other people during the check.

## Run live

```bash
ls /dev/cu.usbserial-* /dev/ttyUSB* 2>/dev/null     # find the receiver port
WISP_SENSOR_MODE=esp32 WISP_SERIAL_PORT=/dev/cu.usbserial-XXXX ./scripts/demo.sh
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
