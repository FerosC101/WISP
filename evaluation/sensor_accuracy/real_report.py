"""Summarise REAL 5xSTS trials (evaluation/sensor_accuracy/trials.csv).

    cd services && uv run python ../evaluation/sensor_accuracy/real_report.py [--file trials_dryrun.csv]

Reports only what was recorded. Nothing is estimated or filled in.
"""

from __future__ import annotations

import argparse
import csv
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent


def summarise(path: Path) -> dict:
    rows = list(csv.DictReader(path.open())) if path.exists() else []
    if not rows:
        return {"file": path.name, "n_trials": 0}
    ok = [r for r in rows if r["success"] == "True"]
    rejected = [r for r in rows if r["success"] != "True"]
    with_gt = [r for r in ok if r["abs_error_seconds"]]
    errs = [float(r["abs_error_seconds"]) for r in with_gt]
    signed = [float(r["detected_seconds"]) - float(r["ground_truth_seconds"]) for r in with_gt]
    confs = [float(r["measurement_confidence"]) for r in rows]
    bins = {"<0.6": 0, "0.6–0.8": 0, "0.8–0.9": 0, "≥0.9": 0}
    for c in confs:
        bins["<0.6" if c < 0.6 else "0.6–0.8" if c < 0.8 else "0.8–0.9" if c < 0.9 else "≥0.9"] += 1
    reasons: dict[str, int] = {}
    for r in rejected:
        reasons[r["reason"] or "unknown"] = reasons.get(r["reason"] or "unknown", 0) + 1
    per_participant = {}
    for p in sorted({r["participant"] for r in rows}):
        pr = [r for r in rows if r["participant"] == p]
        pe = [float(r["abs_error_seconds"]) for r in pr if r["abs_error_seconds"]]
        per_participant[p] = {"trials": len(pr), "accepted": sum(r["success"] == "True" for r in pr), "mae_s": round(statistics.mean(pe), 2) if pe else None}
    return {
        "file": path.name,
        "provider_modes": sorted({r["provider_mode"] for r in rows}),
        "n_participants": len(per_participant),
        "n_trials": len(rows),
        "successful_detections": len(ok),
        "rejected": len(rejected),
        "rejection_reasons": reasons,
        "trials_with_ground_truth": len(with_gt),
        "mae_s": round(statistics.mean(errs), 3) if errs else None,
        "median_abs_error_s": round(statistics.median(errs), 3) if errs else None,
        "bias_s": round(statistics.mean(signed), 3) if signed else None,
        "max_abs_error_s": round(max(errs), 3) if errs else None,
        "confidence_distribution": bins,
        "per_participant": per_participant,
    }


def to_markdown(s: dict) -> str:
    if not s["n_trials"]:
        return f"No trials recorded in `{s['file']}` yet. Collect them with `scripts/collect_trials.py`."
    lines = [
        f"Source: `{s['file']}` · provider: {', '.join(s['provider_modes'])}",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Participants | {s['n_participants']} |",
        f"| Trials | {s['n_trials']} |",
        f"| Successful detections | {s['successful_detections']} |",
        f"| Rejected readings | {s['rejected']} ({', '.join(f'{k}: {v}' for k, v in s['rejection_reasons'].items()) or '—'}) |",
        f"| Trials with ground truth | {s['trials_with_ground_truth']} |",
        f"| Mean absolute timing error | {s['mae_s']} s |",
        f"| Median absolute error | {s['median_abs_error_s']} s |",
        f"| Bias (WISP − truth) | {s['bias_s']} s |",
        f"| Max absolute error | {s['max_abs_error_s']} s |",
        f"| Confidence distribution | {', '.join(f'{k}: {v}' for k, v in s['confidence_distribution'].items())} |",
        "",
        "| Participant | Trials | Accepted | MAE (s) |",
        "|---|---|---|---|",
    ]
    for p, v in s["per_participant"].items():
        lines.append(f"| {p} | {v['trials']} | {v['accepted']} | {v['mae_s'] if v['mae_s'] is not None else '—'} |")
    lines += ["", "Technical timing accuracy only. Not a measure of clinical validity."]
    return "\n".join(lines)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default="trials.csv")
    a = ap.parse_args()
    print(to_markdown(summarise(HERE / a.file)))
