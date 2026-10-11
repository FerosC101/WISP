"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { WispJourney, WispLine } from "@/components/WispLine";
import type { Stage } from "@/lib/checkFlow";

// Where each screen sits on the WISP journey: understand → check → guide (→ care, in the Care section).
const JOURNEY_STEP: Record<Stage, number> = {
  concern: 0,
  safety: 0,
  summary: 0,
  decision: 1,
  "room-ready": 1,
  movement: 1,
  "movement-result": 1,
  complete: 2,
};
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
  quiet = false,
}: {
  stage: Stage;
  loading: boolean;
  error?: string | null;
  children: ReactNode;
  /** Emergencies: no journey or labels, nothing between the person and the action. */
  quiet?: boolean;
}) {
  if (error && loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg">We lost the connection to this check for a moment.</p>
        <Link href="/check/start" className="mt-6 inline-block min-h-11 font-bold text-forest underline underline-offset-4">
          Start a new check
        </Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-sage-mid" />
        <p className="mt-3 text-center text-ink-soft">One moment…</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl">
      {!quiet && (
        <div className="mb-7">
          <WispJourney current={JOURNEY_STEP[stage]} />
          <p className="label mt-3 text-teal">{LABEL[stage]}</p>
        </div>
      )}
      <div className="wisp-fade-in">{children}</div>
      {error && (
        <p role="alert" className="mt-4 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      )}
    </div>
  );
}
