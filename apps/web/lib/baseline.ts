"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export interface BaselineSession {
  measurement_id: string;
  total_time_seconds: number;
  date: string;
  provider_mode: string;
}

export interface Baseline {
  sessions: BaselineSession[];
  median_time: number;
  usual_min: number;
  usual_max: number;
  arms_used_normally: boolean;
  last_updated: string;
}

export interface BaselineResp {
  baseline: Baseline | null;
  required_sessions: number;
}

export type BaselineStatus = "none" | "building" | "stable" | "varies";

/** Same thresholds as the v2 page: the range is "stable" when it spans at most 15 % of the median. */
export function baselineStatus(r: BaselineResp | null): BaselineStatus {
  const b = r?.baseline;
  const n = b?.sessions.length ?? 0;
  if (!b || n === 0) return "none";
  if (n < (r?.required_sessions ?? 3)) return "building";
  return (b.usual_max - b.usual_min) / b.median_time <= 0.15 ? "stable" : "varies";
}

export const STATUS_WORDS: Record<BaselineStatus, { title: string; detail: string }> = {
  none: { title: "Not set up yet", detail: "WISP needs a few healthy-day checks to learn your usual." },
  building: { title: "Not enough checks yet", detail: "A few more healthy-day checks and WISP can compare with your usual." },
  stable: { title: "Stable", detail: "Your healthy-day checks are consistent, so comparisons are reliable." },
  varies: { title: "Varies a little", detail: "Your healthy-day checks differ a bit. Another one on a good day will help." },
};

export function useBaseline(userId: string | null) {
  const [state, setState] = useState<{ for: string; data: BaselineResp } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!userId) return;
    api<BaselineResp>(`/api/baselines/${userId}`)
      .then((r) => {
        setState({ for: userId, data: r });
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [userId]);
  useEffect(reload, [reload]);
  // Never show another person's baseline while the selection changes.
  return { data: state && state.for === userId ? state.data : null, error, reload };
}
