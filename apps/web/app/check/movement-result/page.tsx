"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { StickyActions } from "@/components/StickyActions";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { isMovementQuestion, pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import { unreliableWhy } from "@/lib/movementWords";
import type { BaselineComparison, Snapshot } from "@/lib/types";

type Outcome = "within" | "mild" | "clear" | "unable" | "unreliable" | "stopped";

// Patient wording. The backend's explanation is written for the decision record, not for patients.
const COPY: Record<Outcome, { title: string; body: string }> = {
  within: { title: "Within your usual range", body: "Today's movement check was similar to your healthy-day checks." },
  mild: { title: "A little slower than usual", body: "Today you were a little slower than on your healthy-day checks." },
  clear: { title: "Slower than your usual pattern", body: "Today you were clearly slower than on your healthy-day checks." },
  unable: { title: "Unable to compare", body: "WISP doesn't have enough healthy-day checks yet to know what's usual for you." },
  unreliable: { title: "The reading wasn't reliable", body: "WISP won't use this reading. Your advice will be based on what you've told it." },
  stopped: { title: "You stopped before finishing", body: "That's okay. Not being able to finish is useful information, and WISP has taken it into account." },
};

function outcomeOf(s: Snapshot, c: BaselineComparison | null): Outcome {
  if (s.case.functional_status === "stopped_early") return "stopped";
  if (!c || c.status === "measurement_unreliable") return "unreliable";
  if (c.status === "unable_to_compare") return "unable";
  if (c.status === "slower_than_usual") return c.severity === "clear" ? "clear" : "mild";
  return "within";
}

/** Today compared with the person's usual: a band and a marker, no numbers. */
function ComparisonPicture({ outcome }: { outcome: "within" | "mild" | "clear" }) {
  const x = outcome === "within" ? 50 : outcome === "mild" ? 74 : 90; // marker position, % of track
  return (
    <figure className="mt-6" aria-hidden>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-9 h-1.5 rounded-full bg-sage-deep" />
        <div className="absolute top-7 h-5 rounded-full bg-forest/25" style={{ left: "30%", width: "40%" }} />
        <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${x}%` }}>
          <span className="text-[0.8rem] font-bold text-ink">Today</span>
          <span className={`mt-1 h-5 w-5 rounded-full border-4 border-card ${outcome === "within" ? "bg-forest" : "bg-amber"}`} />
        </div>
      </div>
      <div className="relative h-5 text-[0.8rem] text-ink-soft">
        <span className="absolute -translate-x-1/2" style={{ left: "50%" }}>
          Your usual
        </span>
        <span className="absolute right-0">Slower →</span>
      </div>
    </figure>
  );
}

export default function MovementResult() {
  const f = useCheckFlow("movement-result");
  const s = f.snapshot;
  const asking = s ? isMovementQuestion(pendingQuestion(s)?.data.question) : false;
  const comparison = s?.case.comparison ?? s?.trace.comparison ?? null;
  const outcome = s ? outcomeOf(s, comparison) : "within";
  const copy = COPY[outcome];
  const compared = outcome === "within" || outcome === "mild" || outcome === "clear";

  return (
    <CheckFrame stage="movement-result" loading={!f.ready || !s} error={f.error}>
      {s && asking ? (
        <QuestionScreen snapshot={s} sending={f.sending} onAnswer={f.answer} allowText={false} />
      ) : s && s.disposition ? (
        <section aria-labelledby="result-title">
          <h1 id="result-title" className="text-[1.9rem] font-bold leading-tight text-forest">
            {copy.title}
          </h1>
          {compared && <ComparisonPicture outcome={outcome as "within" | "mild" | "clear"} />}
          {outcome === "unreliable" && <p className="mt-4 text-[1.1rem] font-bold">{unreliableWhy(s.trace.functional_result?.reason)}</p>}
          <p className="mt-4 text-[1.1rem]">{copy.body}</p>
          {comparison?.new_arm_use && <p className="mt-2 text-[1.05rem]">You also needed your arms to stand up, which you don&apos;t usually do.</p>}
          {compared && (
            <p className="mt-5 rounded-2xl bg-sage px-4 py-3 text-[1rem]">
              This only compares today with your usual. It doesn&apos;t tell us what is causing how you feel.
            </p>
          )}
          <StickyActions>
            <Button size="lg" className="w-full" onClick={() => f.ack("result")}>
              See my next step
            </Button>
          </StickyActions>
        </section>
      ) : (
        <section aria-live="polite" className="py-10 text-center">
          <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
          <p className="mt-4 text-[1.2rem] font-bold">Comparing with your usual…</p>
        </section>
      )}
    </CheckFrame>
  );
}
