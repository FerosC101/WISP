"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel, timeLabel } from "@/lib/tiers";
import type { HistoryItem, Persona } from "@/lib/types";

export function NextCheckCard({ recheck, busy, onStart }: { recheck: Persona["rechecks"][number]; busy: boolean; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-(--radius-card) bg-sage p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-forest">Next check</p>
        <p className="mt-0.5 text-[1.1rem] font-bold">
          {dayLabel(recheck.due_at)} · {timeLabel(recheck.due_at)}
        </p>
      </div>
      <Button onClick={onStart} disabled={busy}>
        Start check-in
      </Button>
    </div>
  );
}

export function RecentRecommendationCard({ item }: { item: HistoryItem }) {
  if (!item.tier) return null;
  return (
    <Link href={`/session/${item.session_id}`} className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Recent recommendation · {dayLabel(item.created_at)}</p>
        <p className="mt-1 flex items-center gap-2 text-[1.1rem] font-bold">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${TIER_STYLE[item.tier].dot}`} />
          {PATIENT_OUTCOME[item.tier]}
        </p>
      </div>
      <span aria-hidden className="text-2xl text-ink-faint">›</span>
    </Link>
  );
}
