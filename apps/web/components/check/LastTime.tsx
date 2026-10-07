"use client";

import { PATIENT_OUTCOME, TIER_STYLE, dayLabel } from "@/lib/tiers";
import type { Snapshot } from "@/lib/types";

/** What happened at the previous check, in patient words. */
export function LastTime({ prev }: { prev: Snapshot }) {
  const d = prev.disposition;
  const when = dayLabel(prev.case.created_at);
  return (
    <div className="rounded-(--radius-card) border border-line bg-card p-5">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Last time · {when}</p>
      {prev.case.complaint_text && <p className="mt-1 text-[1.05rem]">You said: “{prev.case.complaint_text}”</p>}
      {d && (
        <p className="mt-2 flex items-center gap-2 font-bold">
          <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${TIER_STYLE[d.tier].dot}`} />
          {PATIENT_OUTCOME[d.tier]}
        </p>
      )}
      {prev.case.comparison && <p className="text-[0.95rem] text-ink-soft">Movement check: {prev.case.comparison.label.toLowerCase()}</p>}
    </div>
  );
}
