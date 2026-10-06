"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { MovementCheck } from "@/components/check/MovementCheck";
import { useCheckFlow } from "@/lib/checkFlow";

export default function Movement() {
  const f = useCheckFlow("movement");
  return (
    <CheckFrame stage="movement" loading={!f.ready || !f.snapshot} error={f.error}>
      {f.snapshot && <MovementCheck snapshot={f.snapshot} progress={f.progress} />}
    </CheckFrame>
  );
}
