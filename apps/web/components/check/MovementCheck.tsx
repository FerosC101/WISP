"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { post } from "@/lib/api";
import type { SensingProgress, Snapshot } from "@/lib/types";
import { WispLine } from "../WispLine";

/**
 * The movement check, full screen. The patient sees only what they need to do:
 * no signal plots, timings or confidence values. Stop is always on screen.
 */
export function MovementCheck({ snapshot, progress }: { snapshot: Snapshot; progress: SensingProgress | null }) {
  const status = snapshot.case.functional_status;
  const sid = snapshot.session_id;
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);

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

  // Keep the page behind from scrolling while the check fills the screen.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function act(path: "ready" | "stop") {
    setBusy(true);
    try {
      await post(`/api/sessions/${sid}/check/${path}`);
    } finally {
      setBusy(false);
    }
  }

  const waiting = status === "awaiting_patient";
  const countdown = startedAt === null ? 3 : Math.max(0, 3 - Math.floor((now - startedAt) / 1000));
  const counting = status === "measuring" && countdown > 0;
  const showCount = snapshot.sensor.live_counts;
  const rises = Math.min(progress?.rises_so_far ?? 0, 5);
  const recorded = snapshot.sensor.mode !== "live";

  // Rendered on <body>: a transformed ancestor (the screen fade-in) would otherwise trap `position: fixed`.
  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-forest-deep text-white focus:outline-none"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6 pt-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">Quick movement check</p>
          {recorded && (
            <span className="rounded-md border border-dashed border-white/40 px-2 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-wider text-white/70">
              {snapshot.sensor.mode === "synthetic_recorded" ? "Recorded · synthetic" : "Recorded session"}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center" aria-live="assertive">
          {waiting ? (
            <>
              <h1 id="move-title" className="text-[2rem] font-bold leading-tight">
                Sit back in your chair
              </h1>
              <ul className="mt-6 space-y-2 text-left text-[1.15rem] text-white/90">
                <li>· Feet flat on the floor</li>
                <li>· Arms crossed over your chest, if you can</li>
                <li>· Then stand up and sit down five times, at your normal pace</li>
              </ul>
              <WispLine className="mt-10 h-8 w-56 text-white/50" />
            </>
          ) : counting ? (
            <>
              <h1 id="move-title" className="text-[1.5rem] text-white/85">
                Sit still…
              </h1>
              <p className="mt-4 text-[6rem] font-bold leading-none">{countdown}</p>
            </>
          ) : (
            <>
              <h1 id="move-title" className="text-[2rem] font-bold leading-tight">
                Stand up and sit down five times
              </h1>
              <WispLine variant="flow" className="my-10 h-14 w-full max-w-xs text-teal-bg" />
              {showCount ? (
                <div aria-label={`${rises} of 5`} role="img" className="flex gap-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={`h-5 w-5 rounded-full transition-colors ${i < rises ? "bg-white" : "border-2 border-white/40"}`} />
                  ))}
                </div>
              ) : (
                <p className="text-[1.2rem] font-bold text-white/85">Take your time. WISP is following your movement.</p>
              )}
              <p className="mt-6 text-white/75">After the fifth time, sit back down and stay seated.</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {waiting && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act("ready")}
              className="min-h-16 rounded-2xl bg-white text-[1.2rem] font-bold text-forest-deep hover:bg-sage disabled:opacity-60"
            >
              I&apos;m seated — start
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => act("stop")}
            className="min-h-14 rounded-2xl border-2 border-white/60 text-[1.1rem] font-bold text-white hover:bg-white/10 disabled:opacity-60"
          >
            {waiting ? "Skip the check" : "Stop"}
          </button>
          <p className="text-center text-[0.9rem] text-white/70">
            {waiting ? "Sensing turns on when you press start." : "Stop if you feel dizzy, breathless, or in pain."}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
