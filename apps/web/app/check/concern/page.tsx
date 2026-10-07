"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { useCheckFlow } from "@/lib/checkFlow";

/** Open-ended concern (follow-up check-ins) or clarifying whether it is in scope. */
export default function Concern() {
  const f = useCheckFlow("concern");
  return (
    <CheckFrame stage="concern" loading={!f.ready || !f.snapshot} error={f.error}>
      {f.snapshot && <QuestionScreen snapshot={f.snapshot} sending={f.sending} onAnswer={f.answer} />}
    </CheckFrame>
  );
}
