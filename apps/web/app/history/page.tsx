"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { TIER_STYLE, formatDate } from "@/lib/tiers";
import type { HistoryItem, Persona } from "@/lib/types";

export default function History() {
  const { userId } = usePrefs();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    api<HistoryItem[]>(`/api/history?user_id=${userId}`).then(setItems).catch(() => setItems([]));
    api<Persona[]>("/api/personas").then((ps) => setPersona(ps.find((p) => p.user_id === userId) ?? null));
  }, [userId]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[2rem] font-bold text-navy">Previous checks</h1>
      <p className="mt-1 text-ink-soft">{persona ? `${persona.display_name}'s recent WISP checks.` : "Your recent WISP checks."}</p>

      {persona && persona.rechecks.length > 0 && (
        <Card className="mt-6 border-teal bg-teal-bg">
          <p className="font-bold text-teal">Planned follow-up</p>
          {persona.rechecks.map((r) => (
            <p key={r.id} className="mt-1">
              {formatDate(r.due_at)} — {r.reason}
            </p>
          ))}
        </Card>
      )}

      <ul className="mt-6 space-y-3">
        {items?.length === 0 && <li className="text-ink-soft">No checks yet.</li>}
        {items?.map((h) => (
          <li key={h.session_id}>
            <Link href={`/session/${h.session_id}`} className="block rounded-2xl border border-line bg-card px-5 py-4 hover:border-ink-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-ink-soft">
                  {formatDate(h.created_at)}
                  {h.previous_session_id && <span className="ml-2 rounded bg-teal-bg px-2 py-0.5 text-sm text-teal">follow-up</span>}
                </span>
                {h.tier ? (
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLE[h.tier].chip}`}>{TIER_STYLE[h.tier].short}</span>
                ) : (
                  <span className="text-sm text-ink-faint">not finished</span>
                )}
              </div>
              <p className="mt-2 text-[1.05rem]">{h.complaint ? `“${h.complaint}”` : "—"}</p>
              {h.title && (
                <p className="mt-1 font-bold">
                  {h.title}
                  {h.sensing_used && <span className="ml-2 text-sm font-normal text-ink-faint">· chair-rise check used</span>}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
