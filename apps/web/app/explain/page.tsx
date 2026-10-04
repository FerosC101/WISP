"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TIER_NAMES, TIER_STYLE, formatDate } from "@/lib/tiers";
import type { HistoryItem } from "@/lib/types";

export default function ExplainIndex() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    api<HistoryItem[]>("/api/history").then(setItems);
  }, []);
  return (
    <div>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-teal">Technical view</p>
      <h1 className="mt-1 text-[1.8rem] font-bold text-forest">Choose a check to explain</h1>
      <ul className="mt-6 space-y-2">
        {items.length === 0 && <li className="text-ink-soft">No checks yet.</li>}
        {items.map((h) => (
          <li key={h.session_id}>
            <Link href={`/explain/${h.session_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card px-5 py-3 hover:border-forest/40">
              <span>
                <span className="font-mono text-xs text-ink-faint">{h.user_id}</span> · {h.complaint ?? "—"}
              </span>
              <span className="flex items-center gap-3 text-sm text-ink-soft">
                {formatDate(h.created_at)}
                {h.tier && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_STYLE[h.tier].chip}`}>{TIER_NAMES[h.tier]}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
