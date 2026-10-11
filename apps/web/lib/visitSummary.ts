import { formatDate } from "./tiers";
import type { Snapshot } from "./types";

export interface BaselineInfo {
  median_time: number;
  usual_min: number;
  usual_max: number;
  arms_used_normally: boolean;
  last_updated: string;
  sessions: unknown[];
}

export interface SummarySection {
  title: string;
  lines: string[];
}

export interface VisitSummary {
  name: string;
  when: string;
  sections: SummarySection[];
  /** Shown prominently when the movement data did not come from a live sensor. */
  dataNotice: string | null;
  disclaimer: string;
}

export const FLAG_LABEL: Record<string, string> = {
  sudden_onset: "Sudden onset",
  chest_pain: "Chest pain",
  severe_breathlessness: "Severe breathlessness",
  one_sided_weakness: "One-sided weakness or numbness",
  speech_difficulty: "Speech difficulty",
  confusion: "New confusion or drowsiness",
  loss_of_consciousness: "Fainting or blackout",
  recent_fall_with_injury: "Fall with injury",
  sudden_vision_change: "Sudden vision change",
};

const MODIFIER_LABEL: Record<string, string> = {
  reduced_intake: "Eating or drinking less than usual",
  unable_to_keep_fluids: "Unable to keep fluids down",
  fall_without_injury: "Fall without injury",
  fever: "Fever",
  getting_worse: "Getting worse",
};

function duration(days: number | null) {
  if (days === null) return "Not stated";
  if (days < 1) return "Since today";
  if (days < 2) return "Since yesterday";
  if (days === 2.5) return "2–3 days";
  if (days < 14) return `${Math.round(days)} days`;
  return `About ${Math.round(days / 7)} weeks or more`;
}

const s1 = (n: number) => `${n.toFixed(1)} s`;

/**
 * A summary for the person's doctor. Unlike the patient screens it includes the 5xSTS
 * timings, because a clinician can interpret them, and it says plainly where the data
 * came from and what WISP is not.
 */
export function buildVisitSummary(s: Snapshot, baseline: BaselineInfo | null): VisitSummary {
  const c = s.case;
  const d = s.disposition!;
  const m = s.trace.functional_result;

  const reported = Object.entries(c.red_flags)
    .filter(([, v]) => v === true)
    .map(([k]) => FLAG_LABEL[k] ?? k);
  const denied = Object.entries(c.red_flags)
    .filter(([k, v]) => v === false && k !== "sudden_onset")
    .map(([k]) => FLAG_LABEL[k] ?? k);
  const unsure = c.uncertain_fields.map((k) => FLAG_LABEL[k] ?? k);
  const changes = Object.entries(c.modifiers)
    .filter(([, v]) => v === true)
    .map(([k]) => MODIFIER_LABEL[k] ?? k);

  const symptoms: string[] = [];
  if (reported.length) symptoms.push(`Warning signs reported: ${reported.join(", ")}`);
  if (changes.length) symptoms.push(`Also reported: ${changes.join(", ")}`);
  if (unsure.length) symptoms.push(`Unsure about: ${unsure.join(", ")}`);
  if (denied.length) symptoms.push(`Denied: ${denied.join(", ")}`);

  const movement: string[] = [];
  if (!m) {
    const why: Record<string, string> = {
      declined: "Not done (patient chose not to)",
      not_needed: "Not done (could not change the recommendation)",
      no_baseline: "Not done (no personal baseline)",
    };
    movement.push(c.sensing_locked ? "Not done (emergency warning sign reported)" : (why[c.functional_status] ?? "Not done"));
  } else if (!m.success) {
    movement.push(`Five-times sit-to-stand attempted; reading not usable (${(m.reason ?? "low confidence").replaceAll("_", " ")})`);
  } else {
    movement.push(`Five-times sit-to-stand: ${s1(m.total_time_seconds ?? 0)} for ${m.rise_count} rises`);
    if (m.per_rise_seconds.length) movement.push(`Per rise: ${m.per_rise_seconds.map((x) => x.toFixed(1)).join(", ")} s`);
    if (c.arms_used !== null) movement.push(`Used arms to stand: ${c.arms_used ? "yes" : "no"}`);
  }
  if (c.functional_status === "stopped_early") movement.push("Stopped before finishing");

  const comparison: string[] = [];
  if (c.comparison) comparison.push(c.comparison.label);
  if (baseline && m?.success) {
    comparison.push(
      `Usual range ${s1(baseline.usual_min)}–${s1(baseline.usual_max)} (median ${s1(baseline.median_time)}) from ${baseline.sessions.length} healthy-day checks, last updated ${formatDate(baseline.last_updated, { day: "numeric", month: "short", year: "numeric" })}`,
    );
    if (baseline.arms_used_normally === false && c.arms_used) comparison.push("New arm use compared with usual");
  }

  const sections: SummarySection[] = [
    { title: "Main concern", lines: [c.complaint_text ?? c.complaint_summary ?? "Not stated"] },
    { title: "Duration and onset", lines: [`${duration(c.duration_days)}; ${c.onset === "sudden" ? "sudden onset" : c.onset === "gradual" ? "gradual onset" : "onset not stated"}`] },
    { title: "Important symptoms", lines: symptoms.length ? symptoms : ["None reported"] },
    { title: "Movement check", lines: movement },
  ];
  if (comparison.length) sections.push({ title: "Compared with their usual", lines: comparison });
  if (s.profile?.conditions.length) sections.push({ title: "Known conditions", lines: [s.profile.conditions.join(", ")] });
  sections.push({ title: "WISP's recommendation", lines: [`${d.title}. ${d.action}`, ...d.reasons] });

  return {
    name: s.profile?.display_name ?? "",
    when: formatDate(c.created_at, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }),
    sections,
    dataNotice:
      m && m.provider_mode !== "live"
        ? m.provider_mode === "synthetic_recorded"
          ? "Movement data is from a recorded SYNTHETIC sensor session (demo), not a live measurement."
          : "Movement data is from a recorded sensor session, not a live measurement."
        : null,
    disclaimer:
      "Prototype indicator, not a diagnosis. WISP is a self-triage prototype. Its thresholds have not been clinically validated. Contactless Wi-Fi sensing; arm use is self-reported.",
  };
}

export function summaryText(v: VisitSummary): string {
  return [
    `WISP visit summary — ${v.name}`,
    v.when,
    ...(v.dataNotice ? ["", `NOTE: ${v.dataNotice}`] : []),
    ...v.sections.flatMap((s) => ["", `${s.title.toUpperCase()}`, ...s.lines.map((l) => `- ${l}`)]),
    "",
    v.disclaimer,
  ].join("\n");
}
