"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStartCheck } from "@/components/StartCheck";
import { api } from "@/lib/api";
import { movementPhrase } from "@/lib/movementWords";
import { usePrefs } from "@/lib/prefs";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel, timeLabel } from "@/lib/tiers";
import type { HistoryItem } from "@/lib/types";
import { useMe } from "@/lib/useMe";

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
  | { kind: "check"; at: string; item: HistoryItem; recheck?: Recheck; followUps: HistoryItem[]; parent?: HistoryItem }
  | { kind: "baseline"; at: string; id: string; n: number }
  | { kind: "planned"; at: string; recheck: Recheck };

type Filter = "all" | "checks" | "usual";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "checks", label: "Checks" },
  { id: "usual", label: "Healthy days" },
];

export default function History() {
  const { userId } = usePrefs();
  const { me } = useMe();
  const check = useStartCheck(me);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    Promise.all([
      api<HistoryItem[]>(`/api/history?user_id=${userId}`),
      api<Recheck[]>(`/api/rechecks?user_id=${userId}`),
      api<BaselineResp>(`/api/baselines/${userId}`),
    ])
      .then(([hist, rechecks, base]) => {
        const byId = new Map(hist.map((h) => [h.session_id, h]));
        const out: Entry[] = hist.map((item) => ({
          kind: "check",
          at: item.created_at,
          item,
          recheck: rechecks.find((r) => r.session_id === item.session_id),
          followUps: hist.filter((h) => h.previous_session_id === item.session_id),
          parent: item.previous_session_id ? byId.get(item.previous_session_id) : undefined,
        }));
        for (const r of rechecks) if (r.status === "scheduled") out.push({ kind: "planned", at: r.due_at, recheck: r });
        (base.baseline?.sessions ?? []).forEach((s, i) => out.push({ kind: "baseline", at: s.date, id: s.measurement_id, n: i + 1 }));
        out.sort((a, b) => b.at.localeCompare(a.at));
        setEntries(out);
      })
      .catch(() => setEntries([]));
  }, [userId]);

  const shown = (entries ?? []).filter((e) => filter === "all" || (filter === "checks" ? e.kind !== "baseline" : e.kind === "baseline"));
  const groups: { label: string; items: Entry[] }[] = [];
  for (const e of shown) {
    const label = dayLabel(e.at);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <h1 className="text-[2rem] font-bold text-forest">History</h1>
      <p className="mt-1 text-ink-soft">Your checks, what WISP advised, and your healthy-day checks.</p>

      <div role="radiogroup" aria-label="Show" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-11 rounded-full px-4 font-bold ${filter === f.id ? "bg-forest text-white" : "border border-line bg-card text-ink-soft"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {entries !== null && shown.length === 0 && (
        <p className="mt-8 text-ink-soft">{filter === "usual" ? "No healthy-day checks yet." : "No checks yet."}</p>
      )}

      <div className="mt-6 space-y-7">
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="mb-2 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{g.label}</h2>
            <ol className="space-y-2.5 border-l-2 border-sage-deep pl-4">
              {g.items.map((e, i) => (
                <li key={i} className="relative">
                  <span aria-hidden className={`absolute -left-[1.42rem] top-5 h-3 w-3 rounded-full border-2 border-ivory ${dotFor(e)}`} />
                  <EntryCard e={e} onCheckIn={check.startFollowUp} busy={check.busy} />
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
  if (e.kind === "check" && e.item.tier) return TIER_STYLE[e.item.tier].dot;
  if (e.kind === "baseline") return "bg-teal";
  return "bg-ink-faint";
}

function EntryCard({ e, onCheckIn, busy }: { e: Entry; onCheckIn: (sid: string) => void; busy: boolean }) {
  if (e.kind === "planned") {
    return (
      <div className="rounded-2xl border border-dashed border-forest/40 bg-sage/50 px-4 py-3">
        <p className="font-bold">Planned check-in · {timeLabel(e.at)}</p>
        <p className="text-[0.92rem] text-ink-soft">WISP will ask how you&apos;re doing.</p>
        <button type="button" disabled={busy} onClick={() => onCheckIn(e.recheck.session_id)} className="mt-1 min-h-11 font-bold text-forest underline underline-offset-4">
          Check in now
        </button>
      </div>
    );
  }
  if (e.kind === "baseline") {
    return (
      <Link href="/you/baseline" className="block rounded-2xl border border-line bg-card px-4 py-3 hover:border-forest/40">
        <p className="font-bold">
          Healthy-day check <span className="ml-1 text-[0.85rem] font-normal text-ink-faint">{timeLabel(e.at)}</span>
        </p>
        <p className="text-[0.92rem] text-ink-soft">Added to your usual pattern</p>
      </Link>
    );
  }

  const h = e.item;
  const move = movementPhrase(h.functional_status, h.comparison_status, h.comparison_severity);
  const finished = !!h.tier;
  const href = finished ? `/history/${h.session_id}` : h.agent === "workbuddy" ? `/session/${h.session_id}` : `/check/concern?s=${h.session_id}`;
  const followUp = e.followUps.find((f) => f.tier);

  return (
    <Link href={href} className="block rounded-2xl border border-line bg-card px-4 py-3 hover:border-forest/40">
      <p className="text-[0.8rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
        {e.parent ? `Follow-up of ${dayLabel(e.parent.created_at).toLowerCase()}` : "Check"} · {timeLabel(h.created_at)}
      </p>
      <p className="mt-0.5 text-[1.05rem] font-bold">{h.complaint ? `“${h.complaint}”` : "Check-in"}</p>
      <p className={`mt-0.5 font-bold ${h.tier ? TIER_STYLE[h.tier].fg : "text-ink-faint"}`}>→ {h.tier ? PATIENT_OUTCOME[h.tier] : "Not finished"}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[0.82rem]">
        {finished && <span className={`rounded-full px-2.5 py-0.5 ${move.used ? "bg-teal-bg text-teal" : "bg-slate-bg text-ink-soft"}`}>{move.text}</span>}
        {e.recheck?.status === "scheduled" && <span className="rounded-full bg-sage px-2.5 py-0.5 text-forest">Check-in planned</span>}
        {followUp?.tier && (
          <span className="rounded-full bg-sage px-2.5 py-0.5 text-forest">
            Followed up: {PATIENT_OUTCOME[followUp.tier].toLowerCase()}
          </span>
        )}
      </div>
      {!finished && <p className="mt-2 text-[0.95rem] font-bold text-forest underline underline-offset-4">Continue this check</p>}
    </Link>
  );
}
