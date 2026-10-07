"""Run the WISP evaluation suite and write evaluation/results/report.md.

    cd services && uv run python ../evaluation/run_all.py

Sections
  1. Triage vignettes      full conversations through agent + rules + pipeline
  2. Fairness              tier flip rate when only non-clinical attributes change
  3. Red-flag extraction   free-text detection (a backstop: every flag is also asked directly)
  4. Sensor (SYNTHETIC)    pipeline sanity check on generated CSI - NOT real-world accuracy
  5. Sensor (REAL)         sessions with stopwatch / video ground truth, if any were logged
"""

from __future__ import annotations

import asyncio
import csv
import json
import statistics
from datetime import datetime
from pathlib import Path

from harness import ROOT, run_conversation

from wisp.sensing.pipeline import segment_5xsts
from wisp.sensing.synth import generate_5xsts
from wisp.triage.extract import extract_rules

EVAL = ROOT / "evaluation"
OUT = EVAL / "results"


async def triage_vignettes() -> dict:
    rows = []
    for v in json.loads((EVAL / "vignettes" / "triage_vignettes.json").read_text()):
        r = await run_conversation(v["complaint"], base_user=v["user"], answers=v.get("answers"), recording=v.get("recording"))
        ok = r["tier"] == v["expected_tier"] and r["sensing_used"] == v["expect_sensing"]
        rows.append({**v, "got_tier": r["tier"], "got_sensing": r["sensing_used"], "pass": ok})
    return {"n": len(rows), "passed": sum(r["pass"] for r in rows), "rows": rows}


async def fairness() -> dict:
    spec = json.loads((EVAL / "fairness" / "variants.json").read_text())
    results = []
    for base in spec["base_cases"]:
        for style, text in base["phrasings"].items():
            r = await run_conversation(text, base_user=base["user"], answers=base["answers"])
            results.append({"case": base["id"], "attribute": "phrasing", "variant": style, "expected": base["expected_tier"], "got": r["tier"]})
        std = base["phrasings"]["standard"]
        for attr, variants in spec["profile_variants"].items():
            for ov in variants:
                r = await run_conversation(std, base_user=base["user"], answers=base["answers"], profile_overrides=ov)
                results.append({"case": base["id"], "attribute": attr, "variant": json.dumps(ov), "expected": base["expected_tier"], "got": r["tier"]})
    by_attr: dict[str, dict] = {}
    for r in results:
        a = by_attr.setdefault(r["attribute"], {"n": 0, "flips": 0, "flipped": []})
        a["n"] += 1
        if r["got"] != r["expected"]:
            a["flips"] += 1
            a["flipped"].append(f'{r["case"]}/{r["variant"]}: {r["expected"]}→{r["got"]}')
    total = len(results)
    flips = sum(r["got"] != r["expected"] for r in results)
    return {"n": total, "flips": flips, "flip_rate": flips / total, "by_attribute": by_attr}


def red_flag_extraction() -> dict:
    rows = []
    for v in json.loads((EVAL / "red_flags" / "extraction_vignettes.json").read_text()):
        got = set(extract_rules(v["text"]).red_flags)
        exp = set(v["flags"])
        rows.append({**v, "got": sorted(got), "missed": sorted(exp - got), "false_pos": sorted(got - exp)})
    pos = sum(len(r["flags"]) for r in rows)
    missed = sum(len(r["missed"]) for r in rows)
    fp = sum(len(r["false_pos"]) for r in rows)
    return {"n": len(rows), "expected_flags": pos, "missed": missed, "false_positives": fp, "rows": rows}


def sensor_synthetic() -> dict:
    errs, ok, n_single = [], 0, 0
    patterns = {
        "usual (≈2.4 s/rise)": [2.3, 2.4, 2.35, 2.4, 2.45],
        "slowing (2.7→4.0 s)": [2.7, 2.9, 3.2, 3.6, 4.0],
        "brisk (≈1.7 s)": [1.6, 1.7, 1.6, 1.8, 1.7],
        "slow (3.5→5.0 s)": [3.5, 3.8, 4.2, 4.5, 5.0],
    }
    for seed in range(20):
        for cyc in patterns.values():
            rec = generate_5xsts(cyc, seed=1000 + seed)
            r = segment_5xsts(rec)
            n_single += 1
            if r.success:
                ok += 1
                errs.append(r.total_time_seconds - rec.meta["ground_truth_total_seconds"])
    walkers = [(1.0, 3.0), (2.0, 3.5), (4.0, 3.0), (6.0, 4.0), (9.0, 3.0), (12.0, 3.5)]
    n_w = rejected = 0
    for seed in range(10):
        for w in walkers:
            n_w += 1
            rejected += not segment_5xsts(generate_5xsts(patterns["slowing (2.7→4.0 s)"], seed=2000 + seed, walker=w)).success
    abs_err = [abs(e) for e in errs]
    return {
        "single_person_sessions": n_single,
        "accepted": ok,
        "false_rejects": n_single - ok,
        "mae_s": round(statistics.mean(abs_err), 3),
        "median_abs_err_s": round(statistics.median(abs_err), 3),
        "bias_s": round(statistics.mean(errs), 3),
        "max_abs_err_s": round(max(abs_err), 3),
        "interference_sessions": n_w,
        "interference_rejected": rejected,
    }


def sensor_real() -> dict:
    import sys

    sys.path.insert(0, str(EVAL / "sensor_accuracy"))
    from real_report import summarise, to_markdown

    s = summarise(EVAL / "sensor_accuracy" / "trials.csv")
    return {**s, "markdown": to_markdown(s)}


def md_report(t, f, rf, ss, sr) -> str:
    L = [f"# WISP evaluation report", "", f"Generated {datetime.now():%Y-%m-%d %H:%M}. Sample sizes are small and stated for every result.", ""]
    L += ["## 1. Triage vignettes (end-to-end conversations)", "", f"**{t['passed']}/{t['n']} passed** (expected tier and whether sensing was used).", "",
          "| ID | Complaint | Expected | Got | Sensing exp/got | Pass |", "|---|---|---|---|---|---|"]
    for r in t["rows"]:
        L.append(f"| {r['id']} | {r['complaint']} | {r['expected_tier']} | {r['got_tier']} | {r['expect_sensing']}/{r['got_sensing']} | {'✓' if r['pass'] else '✗'} |")
    L += ["", "## 2. Fairness: tier flip rate under non-clinical changes", "",
          f"**Overall flip rate: {f['flips']}/{f['n']} = {f['flip_rate']:.1%}**", "", "| Attribute | Variants run | Flips | Details |", "|---|---|---|---|"]
    for a, v in f["by_attribute"].items():
        L.append(f"| {a} | {v['n']} | {v['flips']} | {'; '.join(v['flipped']) or '—'} |")
    L += ["", "Synthetic vignettes only. This shows the rules ignore demographics by construction and measures sensitivity to *phrasing*; "
          "it does not establish population-level fairness. Physical sensing fairness must be evaluated separately with real participants.", ""]
    L += ["## 3. Red-flag extraction from free text (rules only)", "",
          f"{rf['n']} statements · {rf['expected_flags']} expected flags · **missed {rf['missed']}** · false positives {rf['false_positives']}", "",
          "Free-text extraction is a backstop: every warning sign is also asked as a direct yes/no question, and 'not sure' leads to abstention.", "",
          "| Statement | Expected | Got | Missed |", "|---|---|---|---|"]
    for r in rf["rows"]:
        L.append(f"| {r['text']} | {', '.join(r['flags']) or '—'} | {', '.join(r['got']) or '—'} | {', '.join(r['missed']) or ''} |")
    L += ["", "## 4. Sensor pipeline on SYNTHETIC CSI (not real-world accuracy)", "",
          f"- Single-person sessions: {ss['single_person_sessions']} · accepted {ss['accepted']} · false rejects {ss['false_rejects']}",
          f"- Total-time error vs generator ground truth: MAE {ss['mae_s']} s · median {ss['median_abs_err_s']} s · bias {ss['bias_s']} s · max {ss['max_abs_err_s']} s",
          f"- Second person crossing the room: {ss['interference_rejected']}/{ss['interference_sessions']} rejected "
          f"({ss['interference_rejected'] / ss['interference_sessions']:.0%}). Undetected crossings are a known limitation of a single Wi-Fi link.",
          "", "## 5. Sensor accuracy with real participants", "",
          sr["markdown"], ""]
    return "\n".join(L)


async def main() -> None:
    OUT.mkdir(exist_ok=True)
    t = await triage_vignettes()
    f = await fairness()
    rf = red_flag_extraction()
    ss = sensor_synthetic()
    sr = sensor_real()
    (OUT / "results.json").write_text(json.dumps({"triage": t, "fairness": f, "red_flags": rf, "sensor_synthetic": ss, "sensor_real": sr}, indent=2, default=str))
    (OUT / "report.md").write_text(md_report(t, f, rf, ss, sr))
    print(f"Triage {t['passed']}/{t['n']} · fairness flips {f['flips']}/{f['n']} · red-flag misses {rf['missed']}/{rf['expected_flags']} · "
          f"synthetic MAE {ss['mae_s']}s, interference rejected {ss['interference_rejected']}/{ss['interference_sessions']} · real trials {sr['n_trials']}")
    for r in t["rows"]:
        if not r["pass"]:
            print("FAIL", r["id"], r["expected_tier"], r["got_tier"], r["got_sensing"])
    print("Report:", OUT / "report.md")


if __name__ == "__main__":
    asyncio.run(main())
