import type { Tier } from "./types";

// Visual language per tier. Red only for emergencies; amber for same-day.
export const TIER_STYLE: Record<Tier, { bg: string; fg: string; border: string; chip: string; dot: string }> = {
  T1: { bg: "bg-red-bg", fg: "text-red", border: "border-red", chip: "bg-red text-white", dot: "bg-red" },
  T2: { bg: "bg-amber-bg", fg: "text-amber", border: "border-amber", chip: "bg-amber text-white", dot: "bg-amber" },
  T3: { bg: "bg-teal-bg", fg: "text-teal", border: "border-teal", chip: "bg-teal text-white", dot: "bg-teal" },
  T4: { bg: "bg-sage", fg: "text-forest", border: "border-forest", chip: "bg-forest text-white", dot: "bg-forest" },
  ABSTAIN: { bg: "bg-slate-bg", fg: "text-ink", border: "border-slate", chip: "bg-slate text-white", dot: "bg-slate" },
};

/** Short patient-facing names for each outcome (history, home, explanations). */
export const PATIENT_OUTCOME: Record<Tier, string> = {
  T1: "Emergency help",
  T2: "Be seen today",
  T3: "See your doctor soon",
  T4: "Home monitoring",
  ABSTAIN: "Speak to a professional",
};

/** Technical names (explain / engineering views only). */
export const TIER_NAMES: Record<string, string> = {
  T1: "T1 · Emergency",
  T2: "T2 · Same-day care",
  T3: "T3 · Primary care soon",
  T4: "T4 · Self-care + monitoring",
  ABSTAIN: "Abstain · cannot safely assess",
};

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString("en-SG", opts ?? { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" });
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
