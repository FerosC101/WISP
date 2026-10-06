"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { usePrefs } from "./prefs";
import type { HistoryItem, Persona } from "./types";

/** The selected demo persona plus their most recent check that reached a recommendation. */
export function useMe() {
  const { userId } = usePrefs();
  const [me, setMe] = useState<Persona | null>(null);
  const [recent, setRecent] = useState<HistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<Persona[]>("/api/personas")
      .then((ps) => setMe(ps.find((p) => p.user_id === userId) ?? ps[0] ?? null))
      .catch(() => setError("WISP can't reach its local service right now."));
    api<HistoryItem[]>(`/api/history?user_id=${userId}`)
      .then((h) => setRecent(h.find((x) => x.tier) ?? null))
      .catch(() => setRecent(null))
      .finally(() => setLoaded(true));
  }, [userId]);

  return { me, recent, error, loaded };
}
