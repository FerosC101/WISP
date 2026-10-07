"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { WispLine } from "@/components/WispLine";
import type { Stage } from "@/lib/checkFlow";

// Where each screen sits in the patient's journey (shown as a slim progress bar).
const ORDER: Stage[] = ["concern", "safety", "summary", "decision", "room-ready", "movement", "movement-result", "complete"];
const LABEL: Record<Stage, string> = {
  concern: "Your concern",
  safety: "Safety check",
  summary: "What WISP understood",
  decision: "Next step",
  "room-ready": "Getting ready",
  movement: "Movement check",
  "movement-result": "Movement result",
  complete: "Your recommendation",
};

/** Layout shared by every Check screen: journey progress, one task, loading and error states. */
export function CheckFrame({
  stage,
  loading,
  error,
  children,
}: {
  stage: Stage;
  loading: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  if (error && loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg">We couldn&apos;t open this check.</p>
        <Link href="/check/start" className="mt-6 inline-block min-h-11 font-bold text-forest underline underline-offset-4">
          Start a new check
        </Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
        <p className="sr-only">Loading</p>
      </div>
    );
  }
  const pos = ORDER.indexOf(stage);
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-teal">{LABEL[stage]}</p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {ORDER.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= pos ? "bg-teal" : "bg-sage-deep"}`} />
          ))}
        </div>
      </div>
      <div className="wisp-fade-in">{children}</div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      )}
    </div>
  );
}
