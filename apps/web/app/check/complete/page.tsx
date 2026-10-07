"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckFrame } from "@/components/check/CheckFrame";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { Recommendation } from "@/components/Recommendation";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel } from "@/lib/tiers";
import type { Snapshot } from "@/lib/types";

/** For a follow-up: last time vs today. Last time is background only; today's answers decide. */
function SinceLastTime({ s }: { s: Snapshot }) {
  const p = s.trace.previous;
  const d = s.disposition;
  if (!p || !p.tier || !d) return null;
  const row = (label: string, tier: NonNullable<typeof p.tier>, extra?: string | null) => (
    <div className="flex items-start gap-2.5">
      <span aria-hidden className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TIER_STYLE[tier].dot}`} />
      <p>
        <span className="text-ink-soft">{label}: </span>
        <span className="font-bold">{PATIENT_OUTCOME[tier]}</span>
        {extra && <span className="text-ink-soft"> · movement {extra.toLowerCase()}</span>}
      </p>
    </div>
  );
  return (
    <section aria-labelledby="since-title" className="mb-5 rounded-(--radius-card) border border-line bg-card p-5">
      <h2 id="since-title" className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-ink-faint">
        Compared with your last check
      </h2>
      <div className="mt-2 space-y-1.5">
        {row(`Last time (${dayLabel(p.created_at).toLowerCase()})`, p.tier, p.functional_label)}
        {row("Today", d.tier, s.case.comparison?.label)}
      </div>
      <p className="mt-2 text-[0.92rem] text-ink-soft">Today&apos;s answers decide your advice. Last time&apos;s result is only background.</p>
    </section>
  );
}

export default function Complete() {
  const router = useRouter();
  const f = useCheckFlow("complete");
  const s = f.snapshot;
  const share = s && pendingQuestion(s)?.data.question === "share";

  return (
    <CheckFrame stage="complete" loading={!f.ready || !s?.disposition} error={f.error}>
      {s && (
        <>
          <SinceLastTime s={s} />
          <Recommendation snapshot={s} onShowConversation={() => router.push(`/session/${s.session_id}`)} />
          <Link
            href={`/care?s=${s.session_id}`}
            className="mt-5 flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40"
          >
            <span>
              <span className="block text-[1.1rem] font-bold">Your care plan, where to go, and a summary for your doctor</span>
              <span className="block text-[0.95rem] text-ink-soft">Saved in Care</span>
            </span>
            <span aria-hidden className="text-2xl text-ink-faint">›</span>
          </Link>
          {share && (
            <div className="mt-6 rounded-(--radius-card) border border-line bg-card p-5">
              <QuestionScreen snapshot={s} sending={f.sending} onAnswer={f.answer} allowText={false} showContext={false} />
            </div>
          )}
        </>
      )}
    </CheckFrame>
  );
}
