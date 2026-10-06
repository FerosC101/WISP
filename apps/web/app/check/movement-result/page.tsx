"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { isMovementQuestion, pendingQuestion, useCheckFlow } from "@/lib/checkFlow";

export default function MovementResult() {
  const f = useCheckFlow("movement-result");
  const s = f.snapshot;
  const asking = s ? isMovementQuestion(pendingQuestion(s)?.data.question) : false;
  const comparison = s?.case.comparison;

  return (
    <CheckFrame stage="movement-result" loading={!f.ready || !s} error={f.error}>
      {s && asking ? (
        <QuestionScreen snapshot={s} sending={f.sending} onAnswer={f.answer} allowText={false} />
      ) : s && s.disposition ? (
        <section aria-labelledby="result-title">
          <h1 id="result-title" className="text-[1.8rem] font-bold leading-tight text-forest">
            {comparison?.label ?? "The movement check is finished"}
          </h1>
          {comparison?.explanation && <p className="mt-3 text-[1.1rem]">{comparison.explanation}</p>}
          <p className="mt-4 text-ink-soft">This compares today with your usual. It doesn&apos;t tell us what is causing how you feel.</p>
          <Button size="lg" className="mt-6 w-full" onClick={() => f.ack("result")}>
            See my next step
          </Button>
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
