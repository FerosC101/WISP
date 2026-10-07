"use client";

import { useEffect, useState } from "react";
import { post } from "@/lib/api";
import type { SensingProgress, Snapshot } from "@/lib/types";
import { Button, RecordedBadge } from "./ui";
import { WispLine } from "./WispLine";

const SETUP = ["Sturdy chair without wheels, against a wall.", "Sit back, feet flat on the floor.", "If you can, cross your arms over your chest."];

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

  async function act(path: "ready" | "stop") {
    setBusy(true);
    try {
      await post(`/api/sessions/${sid}/check/${path}`);
    } finally {
      setBusy(false);
    }
  }

  const step = status === "awaiting_patient" ? 1 : 2;
  const counting = status === "measuring" && countdown > 0;
  const rises = Math.min(progress?.rises_so_far ?? 0, 5);

  return (
    <section aria-labelledby="check-title" className="mx-auto max-w-xl">
      <div className="rounded-[2rem] border border-line bg-card px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-teal">Step {step} of 2</p>
          <RecordedBadge mode={snapshot.sensor.mode === "live" ? "live" : "recorded"} />
        </div>
        <h1 id="check-title" className="mt-2 text-[2rem] font-bold leading-tight text-forest">
          Quick movement check
        </h1>
        <p className="mt-1 text-[1.1rem] text-ink-soft">Sit and stand five times at your normal pace.</p>

        {step === 1 && (
          <>
            <ul className="mt-6 space-y-3">
              {SETUP.map((s) => (
                <li key={s} className="flex gap-3 text-[1.05rem]">
                  <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl bg-amber-bg px-5 py-4 text-[1.02rem]">
              <strong className="text-amber">Stop</strong> if you feel dizzy, breathless, or in pain.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" onClick={() => act("ready")} disabled={busy} className="w-full">
                I&apos;m seated — start
              </Button>
              <Button size="lg" variant="secondary" onClick={() => act("stop")} disabled={busy} className="w-full">
                Skip
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <div aria-live="assertive" className="mt-8 text-center">
            {counting ? (
              <>
                <p className="text-[1.2rem] text-ink-soft">Sit still…</p>
                <p className="my-3 text-[5rem] font-bold leading-none text-forest">{countdown}</p>
              </>
            ) : (
              <>
                <p className="text-[1.4rem] font-bold leading-snug text-ink">Stand up and sit down five times.</p>
                <WispLine variant="flow" className="mx-auto my-6 h-10 w-full max-w-sm text-teal" />
                {snapshot.sensor.live_counts ? (
                  <p className="text-[3rem] font-bold text-forest" aria-label={`${rises} of 5`}>
                    {rises} / 5
                  </p>
                ) : (
                  <p className="text-[1.25rem] font-bold text-teal">Checking your movement…</p>
                )}
                <p className="mt-3 text-ink-soft">Sit back down after the fifth time and stay seated.</p>
              </>
            )}
            <Button size="lg" variant="secondary" onClick={() => act("stop")} disabled={busy} className="mt-8 w-full border-red/60 text-red">
              Stop
            </Button>
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-ink-faint">Sensing is on only during this check. The raw signal stays on this device.</p>
    </section>
  );
}
