"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { Button, Disclosure } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";

/** The agent's choice: is a movement check worth doing, or can it recommend now? */
export default function Decision() {
  const f = useCheckFlow("decision");
  const s = f.snapshot;
  const offer = s ? pendingQuestion(s) : null;
  const isOffer = offer?.data.question === "offer";

  return (
    <CheckFrame stage="decision" loading={!f.ready || !s} error={f.error}>
      {s && isOffer && offer ? (
        <section aria-labelledby="decision-title">
          <WispLine className="mb-4 h-3 w-24 text-teal" />
          {offer.text.split("\n").map((line, i) =>
            i === 0 ? (
              <h1 key={line} id="decision-title" className="text-[1.8rem] font-bold leading-tight text-forest">
                {line}
              </h1>
            ) : (
              <p key={line} className="mt-3 text-[1.1rem]">
                {line}
              </p>
            ),
          )}
          {offer.data.why && (
            <Disclosure summary="Why this check?" className="mt-4">
              <p className="rounded-xl bg-card px-4 py-3 text-ink-soft">{offer.data.why}</p>
            </Disclosure>
          )}
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
        </section>
      ) : s?.disposition ? (
        <section aria-labelledby="decision-title">
          <WispLine className="mb-4 h-3 w-24 text-teal" />
          <h1 id="decision-title" className="text-[1.8rem] font-bold leading-tight text-forest">
            WISP has enough to recommend a next step
          </h1>
          <p className="mt-3 text-[1.1rem]">A movement check isn&apos;t needed this time.</p>
          <Button size="lg" className="mt-6 w-full" onClick={() => f.ack("decision")}>
            See my next step
          </Button>
        </section>
      ) : (
        <section aria-live="polite" className="py-10 text-center">
          <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
          <p className="mt-4 text-[1.2rem] font-bold">WISP is checking what would help next…</p>
        </section>
      )}
    </CheckFrame>
  );
}
