"""Seed demo data: personas, labelled synthetic CSI recordings, and baselines.

Usage:  uv run python -m wisp.demo.seed [--reset]

Baselines are produced by running the *real* segmentation pipeline over the
baseline recordings, exactly as live enrolment would.
"""

from __future__ import annotations

import argparse
import json
import uuid

from .. import config
from ..baseline.compare import summarise_baseline
from ..schemas import FunctionalAssessment, utcnow
from ..sensing.pipeline import segment_5xsts
from ..sensing.recording import CSIRecording
from ..sensing.synth import generate_5xsts
from ..store import Store
from .personas import PERSONAS, PRE_ENROLLED, SESSIONS


def generate_recordings() -> dict:
    manifest: dict = {}
    for user_id, sessions in SESSIONS.items():
        entry: dict = {"baseline": []}
        for rid, spec in sessions.items():
            rec = generate_5xsts(
                spec["cycles"], seed=spec["seed"], walker=spec.get("walker"),
                meta={"recording_id": rid, "user_id": user_id},
            )
            rec.save(config.RECORDINGS_DIR / f"{rid}.npz")
            kind = rid.split("_", 1)[1]
            if kind.startswith("baseline"):
                entry["baseline"].append(rid)
            else:
                entry[kind] = rid
        manifest[user_id] = entry
    config.DEMO_DIR.mkdir(parents=True, exist_ok=True)
    (config.DEMO_DIR / "recordings.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def enrol_from_recordings(store: Store, user_id: str, recording_ids: list[str]) -> None:
    sessions = []
    for rid in recording_ids:
        rec = CSIRecording.load(config.RECORDINGS_DIR / f"{rid}.npz")
        seg = segment_5xsts(rec)
        if not seg.success:
            raise SystemExit(f"Baseline recording {rid} failed segmentation: {seg.reason}")
        m = FunctionalAssessment(
            measurement_id="m_" + uuid.uuid4().hex[:12],
            session_id=f"enrol_{user_id}",
            success=True,
            total_time_seconds=seg.total_time_seconds,
            rise_count=seg.rise_count,
            per_rise_seconds=seg.per_rise_seconds,
            arms_used=False,
            arms_used_source="self_report",
            single_person_confidence=seg.single_person_confidence,
            measurement_confidence=seg.measurement_confidence,
            source=rec.meta.get("source", "wisp-recorded-csi"),
            provider_mode="synthetic_recorded" if rec.meta.get("synthetic") else "recorded",
            recording_id=rid,
            timestamp=utcnow(),
        )
        store.save_measurement(m, user_id=user_id, purpose="baseline")
        sessions.append(
            {"measurement_id": m.measurement_id, "recording_id": rid, "total_time_seconds": seg.total_time_seconds,
             "per_rise_seconds": seg.per_rise_seconds, "arms_used": False, "date": utcnow().isoformat(),
             "chair": "sturdy dining chair, against wall", "provider_mode": m.provider_mode}
        )
    now = utcnow()
    store.put_baseline(summarise_baseline(user_id, sessions, False, now, now))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="delete the local database first")
    args = ap.parse_args()
    if args.reset and config.DB_PATH.exists():
        config.DB_PATH.unlink()
    manifest = generate_recordings()
    store = Store()
    for p in PERSONAS:
        store.put_profile(p)
        if p.user_id in PRE_ENROLLED and store.get_baseline(p.user_id) is None:
            enrol_from_recordings(store, p.user_id, manifest[p.user_id]["baseline"])
    for p in PERSONAS:
        b = store.get_baseline(p.user_id)
        print(f"{p.display_name:10s} baseline: " + (f"median {b.median_time}s, usual {b.usual_min}–{b.usual_max}s" if b else "not enrolled"))
    print(f"Recordings: {config.RECORDINGS_DIR}  (synthetic — labelled as such in the UI)")


if __name__ == "__main__":
    main()
