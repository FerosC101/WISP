"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckFrame } from "@/components/check/CheckFrame";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { Recommendation } from "@/components/Recommendation";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";

export default function Complete() {
  const router = useRouter();
  const f = useCheckFlow("complete");
  const s = f.snapshot;
  const share = s && pendingQuestion(s)?.data.question === "share";

  return (
    <CheckFrame stage="complete" loading={!f.ready || !s?.disposition} error={f.error}>
      {s && (
        <>
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
