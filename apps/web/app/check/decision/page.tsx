"use client";

import { useEffect, useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { StickyActions } from "@/components/StickyActions";
import { Icon } from "@/components/Icon";
import { Illustration } from "@/components/Illustration";
import { Button, Disclosure } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import type { Snapshot } from "@/lib/types";

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

  const why =
    offer?.data.why ??
    "Right now your answers fall between monitoring at home and seeing a doctor. Comparing today’s movement with your usual pattern may help clarify the next step.";

  return (
    <CheckFrame stage="decision" loading={!f.ready || !s} error={f.error}>
      {s && (
        <section aria-labelledby="decision-title" aria-live="polite">
          {!revealed ? (
            <div className="flex min-h-[46vh] flex-col items-center justify-center text-center">
              <WispLine variant="flow" className="h-14 w-full max-w-xs text-sage-mid" strokeWidth={3} />
              <h1 id="decision-title" className="mt-8 text-[1.75rem] text-forest">
                Checking what would help next…
              </h1>
              <p className="mt-2 text-ink-soft">Looking at everything you&apos;ve told me.</p>
            </div>
          ) : isOffer && offer ? (
            <div className="wisp-fade-in">
              <Illustration scene="rise" decorative className="mb-6 max-w-[17rem] rounded-w-lg sm:max-w-none" />
              <h1 id="decision-title" className="text-[2rem] leading-[1.15] text-forest sm:text-[2.3rem]">
                A quick movement check could help.
              </h1>
              <WispLine variant="draw" className="mt-3 h-4 w-28 text-sage-mid" />
              <p className="mt-4 text-[1.1rem]">
                Your answers are not showing an emergency, but I&apos;m still not sure whether your movement has changed from your usual.
              </p>
              <p className="mt-2 text-[1.06rem] text-ink-soft">A short check can give us another piece of information.</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-3.5 py-1.5 text-[0.98rem] font-medium text-forest">
                <Icon name="clock" className="h-5 w-5" />
                Takes about 30 seconds · you sit and stand five times
              </p>
              <Disclosure summary="Why this check?" className="mt-4">
                <p className="rounded-w-md bg-card px-4 py-3 text-ink-soft">{why}</p>
              </Disclosure>
              <StickyActions>
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
              </StickyActions>
            </div>
          ) : s.disposition ? (
            <div className="wisp-fade-in">
              <WispLine variant="draw" className="mb-4 h-4 w-28 text-sage-mid" />
              <h1 id="decision-title" className="text-[2rem] leading-[1.15] text-forest">
                I already have enough information to guide the next step.
              </h1>
              <p className="mt-4 text-[1.1rem]">{noCheckReason(s)}</p>
              <StickyActions>
                <Button size="lg" className="w-full" onClick={() => f.ack("decision")}>
                  See my next step
                </Button>
              </StickyActions>
            </div>
          ) : null}
        </section>
      )}
    </CheckFrame>
  );
}
