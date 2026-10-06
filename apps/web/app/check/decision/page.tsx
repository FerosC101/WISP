"use client";

import { useEffect, useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import type { Snapshot } from "@/lib/types";

// The agent's options, in patient words (the trace uses the technical names).
const OPTIONS: { action: string; label: string; detail: string }[] = [
  { action: "Ask another question", label: "Ask you more questions", detail: "If something important is still unclear" },
  { action: "Physical function check", label: "A short movement check", detail: "Compare how you move today with your usual" },
  { action: "Recommend care now", label: "Suggest your next step now", detail: "If WISP already has what it needs" },
];

/**
 * Why no movement check, in plain words. Mirrors the order of the agent's own checks
 * (triage/agent.py `_after_screen`) using the same structured state, not its log text.
 */
function noCheckReason(s: Snapshot): string {
  const c = s.case;
  if (c.functional_status === "declined") return "You chose not to do the movement check. That's fine.";
  if (s.trace.safety_screen.status === "incomplete")
    return "Some warning signs couldn't be ruled out from here, so it's safest to talk to someone who can see you.";
  if (c.complaint_category === "out_of_scope") return "This is outside what WISP is designed to check.";
  if (s.profile && !s.profile.normally_stands_unaided) return "A sit-to-stand check isn't suitable for you, so WISP won't ask you to do one.";
  const range = s.trace.possible_range;
  if (range && range.floor === range.ceiling) return "Your answers already show what you should do next. A movement check wouldn't change it.";
  if (!s.baseline_available) return "WISP doesn't have your usual movement on record yet, so there's nothing to compare a check with.";
  if (!s.sensor.available) return "The movement sensor isn't available right now, so WISP will go by what you've told it.";
  return "WISP has what it needs to suggest your next step.";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    const id = setTimeout(update, 0);
    m.addEventListener("change", update);
    return () => {
      clearTimeout(id);
      m.removeEventListener("change", update);
    };
  }, []);
  return reduced;
}

export default function Decision() {
  const f = useCheckFlow("decision");
  const s = f.snapshot;
  const offer = s ? pendingQuestion(s) : null;
  const isOffer = offer?.data.question === "offer";
  const decided = !!s && (isOffer || !!s.disposition);
  const selected = decided ? (isOffer ? "Physical function check" : "Recommend care now") : null;
  const reduced = usePrefersReducedMotion();

  // A short "checking" moment before revealing the choice: the agent's decision is the point of this screen.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!decided) return;
    const id = setTimeout(() => setRevealed(true), reduced ? 0 : 1400);
    return () => clearTimeout(id);
  }, [decided, reduced]);

  // No check needed: go on to the recommendation without an extra tap.
  const { ack } = f;
  useEffect(() => {
    if (!revealed || isOffer || !s?.disposition) return;
    const id = setTimeout(() => ack("decision"), 4000);
    return () => clearTimeout(id);
  }, [revealed, isOffer, s?.disposition, ack]);

  return (
    <CheckFrame stage="decision" loading={!f.ready || !s} error={f.error}>
      {s && (
        <section aria-labelledby="decision-title" aria-live="polite">
          <WispLine variant={revealed ? "draw" : "flow"} className="mb-4 h-4 w-32 text-teal" />
          <h1 id="decision-title" className="text-[1.8rem] font-bold leading-tight text-forest">
            {revealed ? (isOffer ? "A short movement check could help" : "WISP can suggest your next step now") : "WISP is checking what would help next…"}
          </h1>

          <ul className="mt-5 space-y-2.5" aria-label="What WISP considered">
            {OPTIONS.map((o) => {
              const chosen = revealed && o.action === selected;
              return (
                <li
                  key={o.action}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 transition-all duration-500 ${revealed && !chosen ? "py-2" : "py-3"} ${
                    chosen ? "border-teal bg-teal-bg" : revealed ? "border-line bg-card opacity-50" : "border-line bg-card"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${chosen ? "bg-teal text-white" : "bg-sage text-transparent"}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold">{o.label}</span>
                    {(!revealed || chosen) && <span className="block text-[0.92rem] text-ink-soft">{o.detail}</span>}
                  </span>
                  {chosen && <span className="sr-only">(WISP chose this)</span>}
                </li>
              );
            })}
          </ul>

          {revealed && isOffer && offer && (
            <div className="mt-6 wisp-fade-in">
              <p className="text-[1.1rem]">{offer.data.why ?? offer.text.split("\n").slice(1).join(" ")}</p>
              <p className="mt-2 text-ink-soft">It takes about 30 seconds: you sit and stand five times. It&apos;s your choice.</p>
              <div className="mt-6 flex flex-col gap-3">
                {(offer.data.quick_replies ?? []).map((r) => (
                  <Button
                    key={r.value}
                    size="lg"
                    variant={r.value === "do_check" ? "primary" : "secondary"}
                    disabled={f.sending}
                    className="w-full"
                    onClick={() => {
                      f.ack("decision");
                      f.answer(r.label, r.value);
                    }}
                  >
                    {r.value === "skip" ? "Continue without it" : r.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {revealed && !isOffer && s.disposition && (
            <div className="mt-6 wisp-fade-in">
              <p className="text-[1.1rem]">{noCheckReason(s)}</p>
              <Button size="lg" className="mt-6 w-full" onClick={() => f.ack("decision")}>
                See my next step
              </Button>
            </div>
          )}
        </section>
      )}
    </CheckFrame>
  );
}
