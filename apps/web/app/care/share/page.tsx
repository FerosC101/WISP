"use client";

import { CareShell } from "@/components/care/CareShell";
import { ShareSummary } from "@/components/care/ShareSummary";
import { useCareSession } from "@/lib/care";

export default function Share() {
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => <ShareSummary sessionId={s.session_id} />}
    </CareShell>
  );
}
