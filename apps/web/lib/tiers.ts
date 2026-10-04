import type { Tier } from "./types";

// Visual language per tier. Red only for emergencies.
export const TIER_STYLE: Record<Tier, { bg: string; fg: string; border: string; chip: string; short: string }> = {
  T1: { bg: "bg-red-bg", fg: "text-red", border: "border-red", chip: "bg-red text-white", short: "Emergency" },
  T2: { bg: "bg-amber-bg", fg: "text-amber", border: "border-amber", chip: "bg-amber text-white", short: "Same-day care" },
  T3: { bg: "bg-blue-bg", fg: "text-blue", border: "border-blue", chip: "bg-blue text-white", short: "Primary care soon" },
  T4: { bg: "bg-green-bg", fg: "text-green", border: "border-green", chip: "bg-green text-white", short: "Self-care + monitoring" },
  ABSTAIN: { bg: "bg-grey-bg", fg: "text-ink", border: "border-ink-soft", chip: "bg-ink-soft text-white", short: "Cannot safely assess" },
};

export const TIER_NAMES: Record<string, string> = {
  T1: "Emergency",
  T2: "Same-day care",
  T3: "Primary care soon",
  T4: "Self-care",
  ABSTAIN: "Cannot assess",
};

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString("en-SG", opts ?? { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
