"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { useCheckFlow } from "@/lib/checkFlow";

export default function Safety() {
  const f = useCheckFlow("safety");
  return (
    <CheckFrame stage="safety" loading={!f.ready || !f.snapshot} error={f.error}>
      {f.snapshot && <QuestionScreen snapshot={f.snapshot} sending={f.sending} onAnswer={f.answer} />}
    </CheckFrame>
  );
}
