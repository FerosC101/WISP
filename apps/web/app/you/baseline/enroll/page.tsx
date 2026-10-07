"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StickyActions } from "@/components/StickyActions";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { post } from "@/lib/api";
import { type Baseline, STATUS_WORDS, baselineStatus } from "@/lib/baseline";
import { unreliableWhy } from "@/lib/movementWords";
import { usePrefs } from "@/lib/prefs";

type Step = "feeling" | "not-today" | "setup" | "arms" | "measuring" | "result";

const SAME = [
  { id: "chair", label: "The same sturdy chair, against the same wall" },
  { id: "spot", label: "The same spot in the room" },
  { id: "arms", label: "Arms crossed the same way each time, if you can" },
  { id: "alone", label: "No one else moving nearby" },
];

interface EnrolResult {
  accepted: boolean;
  reason?: string | null;
  baseline: Baseline | null;
}

/** Full-screen healthy-day check. Stop discards the reading on the server. */
function Measuring({ onStop, stopping }: { onStop: () => void; stopping: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearInterval(id);
      document.body.style.overflow = prev;
    };
  }, []);
  const countdown = Math.max(0, 3 - Math.floor((now - startedAt) / 1000));
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="enrol-move" className="fixed inset-0 z-50 flex flex-col bg-forest-deep text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6 pt-8">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">Healthy-day check</p>
        <div className="flex flex-1 flex-col items-center justify-center text-center" aria-live="assertive">
          {countdown > 0 ? (
            <>
              <h1 id="enrol-move" className="text-[1.5rem] text-white/85">
                Sit still…
              </h1>
              <p className="mt-4 text-[6rem] font-bold leading-none">{countdown}</p>
            </>
          ) : (
            <>
              <h1 id="enrol-move" className="text-[2rem] font-bold leading-tight">
                Stand up and sit down five times
              </h1>
              <WispLine variant="flow" className="my-10 h-14 w-full max-w-xs text-teal-bg" />
              <p className="text-white/80">At your normal pace. Sit back down after the fifth time.</p>
            </>
          )}
        </div>
        <button
          type="button"
          disabled={stopping}
          onClick={onStop}
          className="min-h-14 rounded-2xl border-2 border-white/60 text-[1.1rem] font-bold text-white hover:bg-white/10 disabled:opacity-60"
        >
          {stopping ? "Stopping…" : "Stop"}
        </button>
        <p className="mt-3 text-center text-[0.9rem] text-white/70">Stop if you feel dizzy, breathless, or in pain.</p>
      </div>
    </div>,
    document.body,
  );
}

export default function Enroll() {
  const { userId } = usePrefs();
  const [step, setStep] = useState<Step>("feeling");
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [armsUsed, setArmsUsed] = useState(false);
  const [result, setResult] = useState<EnrolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  async function measure(arms: boolean) {
    setArmsUsed(arms);
    setStep("measuring");
    setError(null);
    try {
      setResult(await post<EnrolResult>(`/api/baselines/${userId}/sessions`, { arms_used: arms }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStopping(false);
      setStep("result");
    }
  }

  async function stop() {
    setStopping(true);
    try {
      await post(`/api/baselines/${userId}/stop`);
    } catch {
      /* already finished: the result will show */
    }
  }

  const n = result?.baseline?.sessions.length ?? 0;
  const status = baselineStatus(result ? { baseline: result.baseline, required_sessions: 3 } : null);

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <Link href="/you/baseline" className="inline-flex min-h-11 items-center font-bold text-forest">
        ‹ My usual
      </Link>
      <p className="mt-1 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-teal">Healthy-day check</p>

      {step === "feeling" && (
        <section aria-labelledby="t">
          <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
            Are you feeling like your usual self today?
          </h1>
          <p className="mt-2 text-ink-soft">WISP learns your usual from days when you feel well.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" onClick={() => setStep("setup")}>
              Yes, I feel like myself
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setStep("not-today")}>
              Not really
            </Button>
          </div>
        </section>
      )}

      {step === "not-today" && (
        <section aria-labelledby="t">
          <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
            Let&apos;s do this another day
          </h1>
          <p className="mt-2">A healthy-day check only works on a day you feel well. If something feels different today, a check can help you decide what to do.</p>
          <Link href="/check/start" className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-forest px-6 text-[1.08rem] font-bold text-white">
            Start a check
          </Link>
          <Link href="/you/baseline" className="mt-3 flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-card px-6 font-bold">
            Back to My usual
          </Link>
        </section>
      )}

      {step === "setup" && (
        <section aria-labelledby="t">
          <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
            Keep it the same each time
          </h1>
          <p className="mt-2 text-ink-soft">That way WISP compares like with like.</p>
          <ul className="mt-4 space-y-2.5">
            {SAME.map((x) => (
              <li key={x.id}>
                <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 ${ticked[x.id] ? "border-forest bg-sage" : "border-line bg-card"}`}>
                  <input
                    type="checkbox"
                    checked={!!ticked[x.id]}
                    onChange={(e) => setTicked((t) => ({ ...t, [x.id]: e.target.checked }))}
                    className="h-6 w-6 shrink-0 accent-forest"
                  />
                  <span className="text-[1.05rem] font-bold">{x.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <StickyActions>
            <Button size="lg" className="w-full" disabled={!SAME.every((x) => ticked[x.id])} onClick={() => setStep("arms")}>
              {SAME.every((x) => ticked[x.id]) ? "I'm ready" : "Tick each item to continue"}
            </Button>
          </StickyActions>
        </section>
      )}

      {step === "arms" && (
        <section aria-labelledby="t">
          <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
            Do you usually push up with your arms to stand?
          </h1>
          <p className="mt-2 text-ink-soft">Answer for a normal day. When you press an answer, the check starts: sit still for 3 seconds first.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" variant="secondary" onClick={() => measure(false)}>
              No, I stand up without my arms
            </Button>
            <Button size="lg" variant="secondary" onClick={() => measure(true)}>
              Yes, I usually need my arms
            </Button>
          </div>
          <p className="mt-4 text-[0.95rem] text-ink-soft">Sensing turns on only for this check.</p>
        </section>
      )}

      {step === "measuring" && <Measuring onStop={stop} stopping={stopping} />}

      {step === "result" && (
        <section aria-labelledby="t" aria-live="polite">
          {error ? (
            <>
              <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
                That didn&apos;t work
              </h1>
              <p className="mt-2">{error}</p>
            </>
          ) : result?.accepted ? (
            <>
              <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
                Thank you. That check has been added.
              </h1>
              <p className="mt-2 text-[1.1rem] font-bold">
                {Math.min(n, 3)} of 3 healthy-day checks{n > 3 ? ` · ${n} in total` : ""}
              </p>
              <p className="mt-1 text-ink-soft">{n >= 3 ? `WISP now knows your usual. Status: ${STATUS_WORDS[status].title.toLowerCase()}.` : "Try to do the next one on another good day."}</p>
              {armsUsed && <p className="mt-2 text-ink-soft">WISP noted that you usually use your arms.</p>}
            </>
          ) : result?.reason === "stopped" ? (
            <>
              <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
                You stopped the check
              </h1>
              <p className="mt-2">Nothing was saved. Please rest. You can try again on another good day.</p>
            </>
          ) : (
            <>
              <h1 id="t" className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
                That reading wasn&apos;t clear enough
              </h1>
              <p className="mt-2">{unreliableWhy(result?.reason)} It wasn&apos;t added. You can try again.</p>
            </>
          )}
          <Link href="/you/baseline" className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-forest px-6 text-[1.08rem] font-bold text-white">
            Back to My usual
          </Link>
        </section>
      )}
    </div>
  );
}
