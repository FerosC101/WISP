"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { CheckScreen } from "@/components/CheckScreen";
import { useCheckFlow } from "@/lib/checkFlow";

export default function Movement() {
  const f = useCheckFlow("movement");
  return (
    <CheckFrame stage="movement" loading={!f.ready || !f.snapshot} error={f.error}>
      {f.snapshot && <CheckScreen snapshot={f.snapshot} progress={f.progress} />}
    </CheckFrame>
  );
}
