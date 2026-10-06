"use client";

import { useRouter } from "next/navigation";
import { CareShell } from "@/components/care/CareShell";
import { Recommendation } from "@/components/Recommendation";
import { useCareSession } from "@/lib/care";

export default function CareRecommendation() {
  const router = useRouter();
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => <Recommendation snapshot={s} onShowConversation={() => router.push(`/session/${s.session_id}`)} />}
    </CareShell>
  );
}
