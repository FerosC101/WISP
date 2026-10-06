"use client";

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
