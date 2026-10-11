"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { post } from "@/lib/api";
import type { SensingProgress, Snapshot } from "@/lib/types";
import { Icon } from "../Icon";
import { Illustration } from "../Illustration";
import { buttonClass } from "../ui";
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
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ivory text-ink focus:outline-none"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-[1.15rem] font-semibold text-forest">Quick movement check</p>
          {recorded && (
            <span className="rounded-w-sm border border-dashed border-ink-faint/60 bg-slate-bg px-2 py-0.5 text-[0.75rem] font-medium text-ink-soft">
              {snapshot.sensor.mode === "synthetic_recorded" ? "Recorded demo session" : "Recorded session"}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center" aria-live="assertive">
          {waiting ? (
            <>
              <Illustration scene="rise" className="w-full rounded-w-lg" />
              <h1 id="move-title" className="mt-6 text-[1.9rem] leading-[1.15] text-forest">
                Stand up and sit down five times at your normal pace.
              </h1>
              <ul className="mt-4 space-y-1.5 text-left text-[1.06rem] text-ink-soft">
                <li className="flex gap-2.5">
                  <Icon name="chair" className="mt-0.5 h-5 w-5 text-teal" />
                  Sit back first, feet flat on the floor
                </li>
                <li className="flex gap-2.5">
                  <Icon name="you" className="mt-0.5 h-5 w-5 text-teal" />
                  Cross your arms over your chest, if you can
                </li>
              </ul>
            </>
          ) : counting ? (
            <>
              <h1 id="move-title" className="text-[1.5rem] text-ink-soft">
                Sit still…
              </h1>
              <p className="mt-4 font-serif text-[6rem] font-semibold leading-none text-forest">{countdown}</p>
            </>
          ) : (
            <>
              <WispLine variant="breathe" className="h-20 w-full max-w-xs text-sage-mid" strokeWidth={3.5} />
              <h1 id="move-title" className="mt-8 text-[1.9rem] leading-[1.15] text-forest">
                Stand up and sit down five times
              </h1>
              {showCount ? (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div aria-hidden className="flex gap-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-5 w-5 rounded-full transition-colors ${i < rises ? "bg-forest" : "border-2 border-sage-deep bg-card"}`} />
                    ))}
                  </div>
                  <p className="text-[1.1rem] font-semibold text-forest">{rises} of 5</p>
                </div>
              ) : (
                <p className="mt-4 text-[1.15rem] text-ink-soft">Checking your movement… take your time.</p>
              )}
              <p className="mt-6 text-ink-soft">After the fifth time, sit back down and stay seated.</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {waiting && (
            <button type="button" disabled={busy} onClick={() => act("ready")} className={buttonClass("primary", "lg", "min-h-16 w-full text-[1.15rem]")}>
              I&apos;m ready
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => act("stop")}
            className={buttonClass("secondary", "lg", waiting ? "w-full" : "w-full border-red/50 text-red-deep")}
          >
            {waiting ? "Skip the check" : "Stop the check"}
          </button>
          <p className="text-center text-[0.95rem] text-ink-soft">
            {waiting ? "Sensing turns on only when you press start." : "Stop anytime if you feel dizzy, breathless or in pain."}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
