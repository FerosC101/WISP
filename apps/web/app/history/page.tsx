"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel, timeLabel } from "@/lib/tiers";
import type { HistoryItem, Tier } from "@/lib/types";

interface Recheck {
  id: number;
  session_id: string;
  due_at: string;
  status: string;
}
interface BaselineResp {
  baseline: { sessions: { measurement_id: string; date: string }[] } | null;
}

type Entry =
  | { kind: "check"; at: string; item: HistoryItem; recheck?: Recheck }
  | { kind: "baseline"; at: string; id: string }
  | { kind: "planned"; at: string; recheck: Recheck };

export default function History() {
  const { userId } = usePrefs();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    Promise.all([
      api<HistoryItem[]>(`/api/history?user_id=${userId}`),
      api<Recheck[]>(`/api/rechecks?user_id=${userId}`),
      api<BaselineResp>(`/api/baselines/${userId}`),
    ])
      .then(([hist, rechecks, base]) => {
        const out: Entry[] = hist.map((item) => ({ kind: "check", at: item.created_at, item, recheck: rechecks.find((r) => r.session_id === item.session_id) }));
        for (const r of rechecks) if (r.status === "scheduled") out.push({ kind: "planned", at: r.due_at, recheck: r });
        for (const s of base.baseline?.sessions ?? []) out.push({ kind: "baseline", at: s.date, id: s.measurement_id });
        out.sort((a, b) => b.at.localeCompare(a.at));
        setEntries(out);
      })
      .catch(() => setEntries([]));
  }, [userId]);

  const groups: { label: string; items: Entry[] }[] = [];
  for (const e of entries ?? []) {
    const label = dayLabel(e.at);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <div>
      <h1 className="text-[2rem] font-bold text-forest">History</h1>
      <p className="mt-1 text-ink-soft">Your check-ins and what WISP advised.</p>

      {entries?.length === 0 && <p className="mt-8 text-ink-soft">No check-ins yet.</p>}

      <div className="mt-6 space-y-7">
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="mb-2 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{g.label}</h2>
            <ol className="space-y-2.5 border-l-2 border-sage-deep pl-4">
              {g.items.map((e, i) => (
                <li key={i} className="relative">
                  <span aria-hidden className={`absolute -left-[1.42rem] top-5 h-3 w-3 rounded-full border-2 border-ivory ${dotFor(e)}`} />
                  <EntryCard e={e} />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function dotFor(e: Entry) {
  if (e.kind === "check" && e.item.tier) return TIER_STYLE[e.item.tier as Tier].dot;
  if (e.kind === "baseline") return "bg-teal";
  return "bg-ink-faint";
}

function EntryCard({ e }: { e: Entry }) {
  if (e.kind === "planned") {
    return (
      <div className="rounded-2xl border border-dashed border-forest/40 bg-sage/50 px-4 py-3">
        <p className="font-bold">Planned check-in · {timeLabel(e.at)}</p>
        <p className="text-[0.92rem] text-ink-soft">WISP will ask how you&apos;re doing.</p>
      </div>
    );
  }
  if (e.kind === "baseline") {
    return (
      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="font-bold">Healthy-day check</p>
        <p className="text-[0.92rem] text-ink-soft">→ Added to your usual pattern</p>
      </div>
    );
  }
  const h = e.item;
  return (
    <Link href={`/session/${h.session_id}`} className="block rounded-2xl border border-line bg-card px-4 py-3 hover:border-forest/40">
      <p className="font-bold">
        {h.previous_session_id ? "Follow-up" : (h.complaint ?? "Check-in")}
        <span className="ml-2 text-[0.85rem] font-normal text-ink-faint">{timeLabel(h.created_at)}</span>
      </p>
      {h.previous_session_id && h.complaint && <p className="text-[0.95rem] text-ink-soft">“{h.complaint}”</p>}
      <p className={`mt-0.5 font-bold ${h.tier ? TIER_STYLE[h.tier].fg : "text-ink-faint"}`}>→ {h.tier ? PATIENT_OUTCOME[h.tier] : "Not finished"}</p>
      <div className="mt-1.5 flex flex-wrap gap-2 text-[0.8rem]">
        {h.sensing_used && <span className="rounded-full bg-teal-bg px-2.5 py-0.5 text-teal">Movement check used</span>}
        {e.recheck?.status === "scheduled" && <span className="rounded-full bg-sage px-2.5 py-0.5 text-forest">Check-in planned</span>}
        {e.recheck?.status === "completed" && <span className="rounded-full bg-sage px-2.5 py-0.5 text-forest">Followed up</span>}
      </div>
    </Link>
  );
}
