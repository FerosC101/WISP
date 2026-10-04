"use client";

import { useEffect, useState } from "react";
import { post } from "@/lib/api";
import type { SensingProgress, Snapshot } from "@/lib/types";
import { Button, RecordedBadge } from "./ui";

const SETUP = [
  "Use a sturdy chair without wheels, placed against a wall.",
  "Sit comfortably, feet flat on the floor.",
  "If you can, fold your arms across your chest.",
  "Keep your phone nearby.",
];

export function CheckScreen({ snapshot, progress }: { snapshot: Snapshot; progress: SensingProgress | null }) {
  const status = snapshot.case.functional_status;
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const sid = snapshot.session_id;

  // "Sit still… 3, 2, 1" matches the sensing pipeline's start cue.
  useEffect(() => {
    if (status !== "measuring") return;
    const id = setInterval(() => {
      const t = Date.now();
      setStartedAt((s) => s ?? t);
      setNow(t);
    }, 200);
    return () => clearInterval(id);
  }, [status]);
  const countdown = startedAt === null ? 3 : Math.max(0, 3 - Math.floor((now - startedAt) / 1000));

  async function ready() {
    setBusy(true);
    try {
      await post(`/api/sessions/${sid}/check/ready`);
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    setBusy(true);
    try {
      await post(`/api/sessions/${sid}/check/stop`);
    } finally {
      setBusy(false);
    }
  }

  const step = status === "awaiting_patient" ? 1 : 2;
  const counting = status === "measuring" && countdown > 0;
  const rises = progress?.rises_so_far ?? 0;

  return (
    <section aria-labelledby="check-title" className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-card px-6 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal">Step {step} of 3</p>
        <RecordedBadge mode={snapshot.sensor.mode === "live" ? "live" : "recorded"} />
      </div>
      <h1 id="check-title" className="mt-2 text-[2.1rem] font-bold leading-tight text-navy">
        5-Times Chair Rise
      </h1>

      {step === 1 && (
        <>
          <p className="mt-4 text-[1.15rem]">Please sit comfortably with the chair against a wall.</p>
          <ul className="mt-5 space-y-3">
            {SETUP.map((s) => (
              <li key={s} className="flex gap-3 text-[1.05rem]">
                <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-2xl bg-amber-bg px-5 py-4 text-[1.05rem] text-ink">
            <strong className="text-amber">Stop immediately</strong> if you feel dizzy, very short of breath, or have any pain.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={ready} disabled={busy} className="flex-1">
              I&apos;m seated and ready
            </Button>
            <Button size="lg" variant="secondary" onClick={stop} disabled={busy}>
              Skip the check
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <div aria-live="assertive" className="mt-6 text-center">
          {counting ? (
            <>
              <p className="text-[1.3rem] text-ink-soft">Sit still…</p>
              <p className="my-4 text-[5rem] font-bold leading-none text-navy">{countdown}</p>
            </>
          ) : (
            <>
              <p className="text-[1.5rem] font-bold leading-snug text-navy">Stand up and sit down five times, at a comfortable, safe pace.</p>
              {snapshot.sensor.live_counts ? (
                <p className="my-6 text-[3.5rem] font-bold text-teal" aria-label={`${rises} of 5`}>
                  {Math.min(rises, 5)} / 5
                </p>
              ) : (
                <p className="my-6 text-[1.6rem] font-bold text-teal wisp-pulse">Measuring…</p>
              )}
              <p className="text-ink-soft">Sit back down after the fifth rise and stay seated.</p>
            </>
          )}
          <Button size="lg" variant="secondary" onClick={stop} disabled={busy} className="mt-8 w-full border-red text-red">
            Stop the check
          </Button>
        </div>
      )}
    </section>
  );
}
