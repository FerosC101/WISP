"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { useUserId } from "./prefs";
import type { HistoryItem, Persona } from "./types";

/** The selected demo persona plus their most recent check that reached a recommendation. */
export function useMe() {
  const userId = useUserId();
  const [me, setMe] = useState<Persona | null>(null);
  const [recent, setRecent] = useState<HistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let current = true; // ignore responses for a persona that is no longer selected
    api<Persona[]>("/api/personas")
      .then((ps) => current && setMe(ps.find((p) => p.user_id === userId) ?? ps[0] ?? null))
      .catch(() => current && setError("WISP can't reach its local service right now."));
    api<HistoryItem[]>(`/api/history?user_id=${userId}`)
      .then((h) => current && setRecent(h.find((x) => x.tier) ?? null))
      .catch(() => current && setRecent(null))
      .finally(() => current && setLoaded(true));
    return () => {
      current = false;
    };
  }, [userId]);

  // Only expose the persona that matches the current selection.
  return { me: me && me.user_id === userId ? me : null, recent, error, loaded };
}
