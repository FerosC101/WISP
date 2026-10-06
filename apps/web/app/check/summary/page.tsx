"use client";

import { CheckFrame } from "@/components/check/CheckFrame";
import { Button, Card } from "@/components/ui";
import { useCheckFlow } from "@/lib/checkFlow";
import type { CaseState, RedFlagResult } from "@/lib/types";

const MODIFIER_LABEL: Record<string, string> = {
  reduced_intake: "Eating or drinking less than usual",
  unable_to_keep_fluids: "Unable to keep fluids down",
  fall_without_injury: "A fall without injury",
  fever: "Fever",
  getting_worse: "Getting worse",
};

function durationLabel(days: number | null) {
  if (days === null) return "Not sure";
  if (days < 1) return "Since today";
  if (days < 2) return "Since yesterday";
  if (days === 2.5) return "2–3 days"; // the "2–3 days" answer button
  if (days < 7) return `${days} days`;
  if (days < 14) return "About a week";
  return "More than a week";
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function safetyLabel(rf: RedFlagResult) {
  if (rf.status === "passed") return "No warning signs reported";
  if (rf.status === "triggered") return "A warning sign was reported";
  return "Some answers were “not sure”";
}

function rows(c: CaseState, rf: RedFlagResult) {
  const changes = Object.entries(c.modifiers)
    .filter(([, v]) => v === true)
    .map(([k]) => MODIFIER_LABEL[k] ?? k);
  return [
    { label: "Main concern", value: capitalise(c.complaint_summary ?? c.complaint_text ?? "—") },
    { label: "How long", value: durationLabel(c.duration_days) },
    { label: "How it started", value: c.onset === "sudden" ? "Suddenly" : c.onset === "gradual" ? "Gradually" : "Not sure" },
    { label: "Other changes", value: changes.length ? changes.join(" · ") : "None reported" },
    { label: "Safety check", value: safetyLabel(rf) },
  ];
}

export default function Summary() {
  const f = useCheckFlow("summary");
  const s = f.snapshot;
  return (
    <CheckFrame stage="summary" loading={!f.ready || !s} error={f.error}>
      {s && (
        <section aria-labelledby="summary-title">
          <h1 id="summary-title" className="text-[1.8rem] font-bold leading-tight text-forest">
            Here&apos;s what WISP understood
          </h1>
          <Card as="div" className="mt-5">
            <dl className="divide-y divide-line">
              {rows(s.case, s.trace.safety_screen).map((r) => (
                <div key={r.label} className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{r.label}</dt>
                  <dd className="mt-0.5 text-[1.1rem] font-bold">{r.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Button size="lg" className="mt-6 w-full" onClick={() => f.ack("summary")}>
            That&apos;s right — continue
          </Button>
        </section>
      )}
    </CheckFrame>
  );
}
