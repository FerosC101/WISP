"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { QuestionScreen } from "@/components/check/QuestionScreen";
import { useCheckFlow } from "@/lib/checkFlow";

export default function RoomReady() {
  const f = useCheckFlow("room-ready");
  return (
    <CheckFrame stage="room-ready" loading={!f.ready || !f.snapshot} error={f.error}>
      {f.snapshot && <QuestionScreen snapshot={f.snapshot} sending={f.sending} onAnswer={f.answer} allowText={false} />}
    </CheckFrame>
  );
}
