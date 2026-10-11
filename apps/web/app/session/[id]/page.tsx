"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chat } from "@/components/Chat";
import { CheckScreen } from "@/components/CheckScreen";
import { Recommendation } from "@/components/Recommendation";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { post } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { dayLabel } from "@/lib/tiers";
import { useSession } from "@/lib/useSession";
import type { Snapshot } from "@/lib/types";

type View = "chat" | "result";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { snapshot, setSnapshot, progress, error } = useSession(id);
  const { devMode } = usePrefs();
  const [view, setView] = useState<View>("chat");
  const seenDisposition = useRef<string | null>(null);

  // Move to the recommendation once the rules engine has decided.
  const tier = snapshot?.disposition?.tier ?? null;
  useEffect(() => {
    if (tier && seenDisposition.current !== tier) {
      seenDisposition.current = tier;
      setView("result");
      window.scrollTo({ top: 0 });
    }
  }, [tier]);

  if (error && !snapshot) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg">We couldn&apos;t open this check.</p>
        <Link href="/today" className="mt-6 inline-block font-bold text-forest underline">
          Back to home
        </Link>
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
        <p className="sr-only">Loading</p>
      </div>
    );
  }

  const checking = ["awaiting_patient", "measuring"].includes(snapshot.case.functional_status);
  const showResult = view === "result" && snapshot.disposition && !checking;

  return (
    <div>
      {!checking && (
        <p className="mb-5 text-[0.95rem] text-ink-soft">
          {snapshot.case.previous_session_id ? "Follow-up check-in" : "Check-in"} · {dayLabel(snapshot.case.created_at)}
        </p>
      )}
      {checking ? (
        <CheckScreen snapshot={snapshot} progress={progress} />
      ) : showResult ? (
        <Recommendation snapshot={snapshot} onShowConversation={() => setView("chat")} />
      ) : (
        <>
          {snapshot.disposition && (
            <button onClick={() => setView("result")} className="mb-4 min-h-11 font-bold text-forest underline underline-offset-4">
              ← Back to my recommendation
            </button>
          )}
          <Chat snapshot={snapshot} onSnapshot={(s: Snapshot) => setSnapshot(s)} />
        </>
      )}
      {devMode && snapshot.disposition?.recheck && showResult && <FollowUpDemo sessionId={snapshot.session_id} />}
    </div>
  );
}

function FollowUpDemo({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const { agentMode, language } = usePrefs();
  const router = useRouter();
  return (
    <div className="mt-8 rounded-w-md border-2 border-dashed border-ink-faint px-5 py-4">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-faint">Demo control</p>
      <p className="mt-1 text-ink-soft">Skip ahead to tomorrow&apos;s check-in.</p>
      <Button
        className="mt-3"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const snap = await post<Snapshot>(`/api/sessions/${sessionId}/followup`, { agent: agentMode, language });
          router.push(`/session/${snap.session_id}`);
        }}
      >
        Simulate next day
      </Button>
    </div>
  );
}
