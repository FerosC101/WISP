"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chat } from "@/components/Chat";
import { CheckScreen } from "@/components/CheckScreen";
import { DecisionTrace } from "@/components/DecisionTrace";
import { Recommendation } from "@/components/Recommendation";
import { Button, RecordedBadge, SensingIndicator } from "@/components/ui";
import { post } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/useSession";
import type { Snapshot } from "@/lib/types";

type View = "chat" | "result";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { snapshot, setSnapshot, progress, error } = useSession(id);
  const { devMode } = usePrefs();
  const [view, setView] = useState<View>("chat");
  const [traceOpen, setTraceOpen] = useState(false);
  const seenDisposition = useRef<string | null>(null);
  const traceRef = useRef<HTMLDivElement>(null);

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
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg">We couldn&apos;t open this check.</p>
        <p className="mt-2 text-ink-soft">{error}</p>
        <Link href="/" className="mt-6 inline-block font-bold text-blue underline">
          Back to start
        </Link>
      </div>
    );
  }
  if (!snapshot) return <p className="py-16 text-center text-ink-soft">Loading…</p>;

  const checking = ["awaiting_patient", "measuring"].includes(snapshot.case.functional_status);
  const measurementMode = snapshot.trace.functional_result?.provider_mode;
  const showResult = view === "result" && snapshot.disposition && !checking;

  const showWhy = () => {
    setTraceOpen(true);
    setTimeout(() => traceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold text-ink-soft">
            {snapshot.case.previous_session_id ? "Follow-up check" : "Assessment"}
            {snapshot.profile && <span className="font-normal"> · {snapshot.profile.display_name}</span>}
          </h1>
          {devMode && (
            <span className="rounded bg-grey-bg px-2 py-0.5 font-mono text-xs text-ink-soft">
              agent: {snapshot.agent === "workbuddy" ? "WorkBuddy (MCP)" : "built-in"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecordedBadge mode={measurementMode} />
          <SensingIndicator state={snapshot.case.sensing_state} />
        </div>
      </div>

      {checking ? (
        <CheckScreen snapshot={snapshot} progress={progress} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            {snapshot.disposition && (
              <div className="mb-4 inline-flex rounded-full border border-line bg-card p-1" role="tablist" aria-label="View">
                {(["result", "chat"] as View[]).map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={`rounded-full px-4 py-2 text-[0.95rem] font-bold ${view === v ? "bg-navy text-white" : "text-ink-soft"}`}
                  >
                    {v === "result" ? "Recommendation" : "Conversation"}
                  </button>
                ))}
              </div>
            )}
            {showResult ? (
              <Recommendation snapshot={snapshot} onShowWhy={showWhy} />
            ) : (
              <Chat snapshot={snapshot} onSnapshot={(s: Snapshot) => setSnapshot(s)} />
            )}
            {snapshot.disposition && snapshot.disposition.recheck && devMode && (
              <FollowUpDemo sessionId={snapshot.session_id} />
            )}
          </div>

          <aside ref={traceRef} className="lg:sticky lg:top-4 lg:self-start" aria-label="Decision trace panel">
            <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <button
                className="flex w-full items-center justify-between text-left lg:hidden"
                aria-expanded={traceOpen}
                onClick={() => setTraceOpen((v) => !v)}
              >
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-navy">Why WISP is asking / deciding</span>
                <span aria-hidden>{traceOpen ? "−" : "+"}</span>
              </button>
              <div className={`${traceOpen ? "mt-4 block" : "hidden"} lg:mt-0 lg:block`}>
                <DecisionTrace snapshot={snapshot} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function FollowUpDemo({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const { agentMode } = usePrefs();
  const router = useRouter();
  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-ink-faint px-5 py-4">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-faint">Demo control</p>
      <p className="mt-1 text-ink-soft">Skip ahead to tomorrow&apos;s scheduled re-check.</p>
      <Button
        className="mt-3"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const snap = await post<Snapshot>(`/api/sessions/${sessionId}/followup`, { agent: agentMode });
          router.push(`/session/${snap.session_id}`);
        }}
      >
        Simulate next day
      </Button>
    </div>
  );
}
