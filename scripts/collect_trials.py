"""Collect real 5xSTS trials with ground truth for sensor evaluation.

For each trial: capture live ESP32 CSI, run the WISP pipeline, ask the operator
for the stopwatch / phone-video time, and append one row to
evaluation/sensor_accuracy/trials.csv. Raw CSI is saved locally for re-analysis.

    cd services
    uv run python ../scripts/collect_trials.py --participant P01 --port /dev/cu.usbserial-XXXX \
        --chair "dining chair, against wall" --distance-m 2.5

Protocol (read to the participant):
  1. Sit back in the chair, arms crossed if you can, feet flat.
  2. When I say "start", stay still for 3 seconds, then stand up fully and sit down
     five times at your normal pace. Stay seated after the fifth.
  3. Stop at any time if you feel dizzy, breathless or in pain.
Operator: start the stopwatch at first movement, stop when seated after the 5th stand.

--dry-run uses synthetic recordings instead of hardware so the tool can be tested.
Dry-run rows go to trials_dryrun.csv and are never mixed with real trials.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import random
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "src"))

from wisp import config  # noqa: E402
from wisp.sensing.pipeline import segment_5xsts  # noqa: E402
from wisp.sensing.providers import ESP32CSIProvider  # noqa: E402
from wisp.sensing.synth import generate_5xsts  # noqa: E402

FIELDS = [
    "timestamp", "participant", "trial", "chair", "distance_m", "arms_folded", "others_present", "condition_notes",
    "provider_mode", "recording_id", "success", "reason", "detected_seconds", "measurement_confidence",
    "single_person_confidence", "ground_truth_seconds", "ground_truth_method", "abs_error_seconds", "operator_notes",
]


def ask(prompt: str, default: str = "") -> str:
    v = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip()
    return v or default


async def capture_live(port: str, baud: int, participant: str):
    provider = ESP32CSIProvider(port, baud)
    if not provider.available():
        raise SystemExit(f"Serial port {port} not found. Is the ESP32 receiver plugged in?")

    async def progress(p: dict) -> None:
        e = p["elapsed"]
        cue = "SIT STILL" if e < 3 else "GO — five stands"
        print(f"\r  {e:5.1f}s  {cue:<18} packets OK", end="", flush=True)

    run = await provider.run("5xSTS", user_id=participant, on_progress=progress)
    print()
    return run.segmentation, "live", run.recording_id


def capture_dry_run(participant: str):
    base = random.uniform(2.0, 3.2)
    cycles = [round(base * random.uniform(0.9, 1.15), 2) for _ in range(5)]
    walker = (random.uniform(1, 12), 3.5) if random.random() < 0.2 else None
    rec = generate_5xsts(cycles, seed=random.randint(0, 10_000), walker=walker)
    seg = segment_5xsts(rec)
    print(f"  (dry run) synthetic truth {rec.meta['ground_truth_total_seconds']} s{' + walker' if walker else ''}")
    return seg, "synthetic_dry_run", None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--participant", required=True, help="pseudonymous id, e.g. P01 (never a name)")
    ap.add_argument("--port", default=config.SERIAL_PORT)
    ap.add_argument("--baud", type=int, default=config.SERIAL_BAUD)
    ap.add_argument("--chair", default="sturdy chair, against wall")
    ap.add_argument("--distance-m", default="", help="TX–RX distance in metres")
    ap.add_argument("--trials", type=int, default=5)
    ap.add_argument("--dry-run", action="store_true", help="synthetic data, no hardware (separate CSV)")
    args = ap.parse_args()

    out = ROOT / "evaluation" / "sensor_accuracy" / ("trials_dryrun.csv" if args.dry_run else "trials.csv")
    new = not out.exists()
    existing = list(csv.DictReader(out.open())) if out.exists() else []
    start_trial = 1 + sum(1 for r in existing if r["participant"] == args.participant)
    if not args.dry_run and not args.port:
        raise SystemExit("Pass --port (or set WISP_SERIAL_PORT), or use --dry-run.")

    with out.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new:
            w.writeheader()
        for trial in range(start_trial, start_trial + args.trials):
            print(f"\n=== {args.participant} · trial {trial} ===")
            arms = ask("Arms folded? (y/n)", "y")
            others = ask("Anyone else moving in the room? (y/n)", "n")
            cond = ask("Condition notes (e.g. 'normal pace', 'slow on purpose')", "normal pace")
            input("Press Enter, then say START. Participant sits still for 3 s, then five stands… ")
            t0 = time.time()
            seg, mode, rid = asyncio.run(capture_live(args.port, args.baud, args.participant)) if not args.dry_run else capture_dry_run(args.participant)
            print(f"  WISP: {'OK' if seg.success else 'REJECTED (' + str(seg.reason) + ')'}"
                  f"{f' · {seg.total_time_seconds:.2f} s' if seg.total_time_seconds else ''}"
                  f" · conf {seg.measurement_confidence:.2f} · single-person {seg.single_person_confidence:.2f}")
            gt = ask("Stopwatch / video time in seconds (blank = trial invalid)")
            method = ask("Ground-truth method (stopwatch/video)", "stopwatch") if gt else ""
            notes = ask("Operator notes", "")
            gt_f = float(gt) if gt else None
            err = abs(seg.total_time_seconds - gt_f) if (gt_f is not None and seg.success and seg.total_time_seconds) else None
            w.writerow({
                "timestamp": datetime.fromtimestamp(t0).isoformat(timespec="seconds"), "participant": args.participant, "trial": trial,
                "chair": args.chair, "distance_m": args.distance_m, "arms_folded": arms, "others_present": others, "condition_notes": cond,
                "provider_mode": mode, "recording_id": rid or "", "success": seg.success, "reason": seg.reason or "",
                "detected_seconds": seg.total_time_seconds or "", "measurement_confidence": seg.measurement_confidence,
                "single_person_confidence": seg.single_person_confidence, "ground_truth_seconds": gt_f if gt_f is not None else "",
                "ground_truth_method": method, "abs_error_seconds": round(err, 3) if err is not None else "", "operator_notes": notes,
            })
            f.flush()
            if err is not None:
                print(f"  error {err:.2f} s")
            if ask("Another trial? (y/n)", "y").lower() != "y":
                break
    print(f"\nSaved to {out}. Summarise with: uv run python ../evaluation/sensor_accuracy/real_report.py")


if __name__ == "__main__":
    main()
