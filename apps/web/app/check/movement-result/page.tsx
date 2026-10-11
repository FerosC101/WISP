"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { StickyActions } from "@/components/StickyActions";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { isMovementQuestion, pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import { unreliableWhy } from "@/lib/movementWords";
import type { BaselineComparison, Snapshot } from "@/lib/types";

type Outcome = "within" | "mild" | "clear" | "unable" | "unreliable" | "stopped";

// Patient wording. The backend's explanation is written for the decision record, not for patients.
const COPY: Record<Outcome, { title: string; body: string }> = {
  within: { title: "Within your usual range", body: "Today was within your usual movement pattern." },
  mild: { title: "A little slower than usual", body: "Today was a little slower than your usual movement pattern." },
  clear: { title: "Slower than your usual pattern", body: "Today was slower than your usual movement pattern." },
  unable: { title: "Unable to compare yet", body: "We don't have enough healthy-day checks to compare yet." },
  unreliable: { title: "The reading wasn't reliable", body: "I couldn't get a clear reading, so I won't use it. Your next step will be based on what you've told me." },
  stopped: { title: "You stopped before finishing", body: "That's okay. Not being able to finish is useful information, and WISP has taken it into account." },
};

function outcomeOf(s: Snapshot, c: BaselineComparison | null): Outcome {
  if (s.case.functional_status === "stopped_early") return "stopped";
  if (!c || c.status === "measurement_unreliable") return "unreliable";
  if (c.status === "unable_to_compare") return "unable";
  if (c.status === "slower_than_usual") return c.severity === "clear" ? "clear" : "mild";
  return "within";
}

/** Today compared with the person's usual: a soft band and a dot, no numbers. */
function ComparisonPicture({ outcome }: { outcome: "within" | "mild" | "clear" }) {
  const x = outcome === "within" ? 50 : outcome === "mild" ? 76 : 90; // marker position, % of track
  const track = "relative h-2 flex-1 rounded-full bg-sage";
  return (
    <figure className="mt-6 rounded-w-lg bg-card px-5 py-5 shadow-(--shadow-soft)" aria-hidden>
      <div className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-[0.98rem] text-ink-soft">Your usual</span>
        <div className={track}>
          <span className="absolute inset-y-[-5px] rounded-full bg-sage-mid/70" style={{ left: "32%", width: "36%" }} />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <span className="w-24 shrink-0 text-[0.98rem] font-semibold text-ink">Today</span>
        <div className={track}>
          <span
            className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card shadow-(--shadow-soft) ${outcome === "within" ? "bg-forest" : "bg-amber-soft"}`}
            style={{ left: `${x}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-between pl-28 text-[0.92rem] text-ink-faint">
        <span>Quicker</span>
        <span>Slower</span>
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
          <p className="flex items-center gap-2 text-[1rem] font-medium text-teal">
            <Icon name="check-mark" className="h-5 w-5" strokeWidth={2.4} />
            Movement check complete
          </p>
          <h1 id="result-title" className="mt-2 text-[2rem] leading-[1.15] text-forest">
            {copy.title}
          </h1>
          <WispLine variant="draw" className="mt-3 h-4 w-28 text-sage-mid" />
          {compared && <ComparisonPicture outcome={outcome as "within" | "mild" | "clear"} />}
          {outcome === "unreliable" && <p className="mt-4 text-[1.1rem] font-bold">{unreliableWhy(s.trace.functional_result?.reason)}</p>}
          <p className="mt-4 text-[1.1rem]">{copy.body}</p>
          {comparison?.new_arm_use && <p className="mt-2 text-[1.05rem]">You also needed your arms to stand up, which you don&apos;t usually do.</p>}
          {compared && (
            <p className="mt-5 flex gap-3 rounded-w-md bg-sage px-4 py-3.5 text-[1rem]">
              <Icon name="info" className="mt-0.5 h-5 w-5 text-forest" />
              <span>This only compares today with your usual. It doesn&apos;t tell us what is causing how you feel. WISP uses it together with what you told it to guide the next step.</span>
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
          <WispLine variant="flow" className="mx-auto h-10 w-56 text-sage-mid" />
          <p className="mt-4 font-serif text-[1.4rem] font-semibold text-forest">Comparing with your usual…</p>
        </section>
      )}
    </CheckFrame>
  );
}
