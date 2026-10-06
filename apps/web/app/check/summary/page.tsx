"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { Button, Card } from "@/components/ui";
import { SAFETY_ORDER, pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import type { CaseState, ChatMessage, QuickReply, Snapshot } from "@/lib/types";

const RED_FLAGS = SAFETY_ORDER.filter((k) => !["onset", "duration", "fall", "eating"].includes(k));
const FALL_OPTIONS: QuickReply[] = [
  { value: "no", label: "No fall" },
  { value: "yes_no_injury", label: "I fell, but wasn't hurt" },
  { value: "yes_injury", label: "I fell and was hurt or hit my head" },
];
const DURATION_DAYS: Record<string, number> = { d_today: 0.5, d_yesterday: 1, d_days: 2.5, d_week: 7, d_longer: 14 };

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

/** The agent's own (translated) question and answer labels, from when it asked them. */
function asked(s: Snapshot, key: string): ChatMessage | undefined {
  return [...s.messages].reverse().find((m) => m.role === "agent" && m.data.question === key);
}
const yesNo = (s: Snapshot, key: string) => (asked(s, key)?.data.quick_replies ?? []).filter((r) => r.value === "yes" || r.value === "no");

interface Row {
  field: string;
  label: string;
  value: string;
  options?: QuickReply[];
  current?: string;
}

function rows(s: Snapshot): Row[] {
  const c: CaseState = s.case;
  const durationKey = Object.entries(DURATION_DAYS).find(([, d]) => d === c.duration_days)?.[0];
  const fall = c.red_flags.recent_fall_with_injury === false ? (c.modifiers.fall_without_injury ? "yes_no_injury" : "no") : undefined;
  const out: Row[] = [
    {
      field: "duration",
      label: "How long",
      value: durationLabel(c.duration_days),
      options: asked(s, "duration")?.data.quick_replies ?? Object.keys(DURATION_DAYS).map((k) => ({ value: k, label: durationLabel(DURATION_DAYS[k]) })),
      current: durationKey,
    },
    {
      field: "onset",
      label: "How it started",
      value: c.onset === "sudden" ? "Suddenly" : c.onset === "gradual" ? "Gradually" : "Not sure",
      options: (asked(s, "onset")?.data.quick_replies ?? [
        { value: "sudden", label: "Suddenly" },
        { value: "gradual", label: "Gradually" },
      ]).filter((r) => r.value !== "unsure"),
      current: c.onset ?? undefined,
    },
    {
      field: "eating",
      label: "Eating and drinking",
      value: c.modifiers.reduced_intake ? "Less than usual" : c.modifiers.reduced_intake === false ? "As usual" : "Not asked",
      options: yesNo(s, "eating").map((r) => ({ ...r, label: r.value === "yes" ? "As usual" : "Less than usual" })),
      current: c.modifiers.reduced_intake === true ? "no" : c.modifiers.reduced_intake === false ? "yes" : undefined,
    },
  ];
  if (c.modifiers.reduced_intake) {
    out.push({
      field: "fluids",
      label: "Keeping fluids down",
      value: c.modifiers.unable_to_keep_fluids ? "No, can't keep them down" : "Yes",
      options: yesNo(s, "fluids"),
      current: c.modifiers.unable_to_keep_fluids ? "no" : "yes",
    });
  }
  out.push({
    field: "fall",
    label: "A recent fall",
    value: FALL_OPTIONS.find((o) => o.value === fall)?.label ?? "Not sure",
    options: FALL_OPTIONS,
    current: fall,
  });
  // Shown, not editable here: found in the patient's own words.
  if (c.modifiers.fever) out.push({ field: "", label: "Also mentioned", value: "Fever" });
  if (c.modifiers.getting_worse) out.push({ field: "", label: "Also mentioned", value: "Getting worse" });
  return out;
}

function EditableRow({ row, open, onToggle, onPick, busy }: { row: Row; open: boolean; onToggle: () => void; onPick: (v: string) => void; busy: boolean }) {
  const editable = !!row.field && !!row.options?.length;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{row.label}</dt>
          <dd className="mt-0.5 text-[1.1rem] font-bold">{row.value}</dd>
        </div>
        {editable && (
          <button type="button" onClick={onToggle} aria-expanded={open} className="min-h-11 shrink-0 px-2 font-bold text-forest underline underline-offset-4">
            {open ? "Cancel" : "Change"}
          </button>
        )}
      </div>
      {open && editable && (
        <div className="mt-3 flex flex-col gap-2 wisp-fade-in" role="group" aria-label={`Change: ${row.label}`}>
          {row.options!.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={busy}
              onClick={() => onPick(o.value)}
              aria-pressed={o.value === row.current}
              className={`min-h-14 rounded-2xl border-2 px-4 text-left text-[1.05rem] font-bold ${o.value === row.current ? "border-forest bg-sage" : "border-line bg-card hover:border-forest/50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Summary() {
  const f = useCheckFlow("summary");
  const s = f.snapshot;
  const [open, setOpen] = useState<string | null>(null);
  const confirm = s ? pendingQuestion(s) : null;
  const confirmLabel = confirm?.data.quick_replies?.[0]?.label ?? "That's right";

  async function pick(field: string, value: string) {
    setOpen(null);
    await f.correct(field, value);
  }

  const flagRows: Row[] = s
    ? RED_FLAGS.map((k) => {
        const v = s.case.red_flags[k];
        const unsure = s.case.uncertain_fields.includes(k);
        return {
          field: k,
          label: asked(s, k)?.text ?? k,
          value: unsure ? "Not sure" : v === false ? "No" : "Not asked",
          options: yesNo(s, k),
          current: unsure ? undefined : v === false ? "no" : undefined,
        };
      })
    : [];
  const unsureCount = flagRows.filter((r) => r.value === "Not sure").length + (s?.case.uncertain_fields.includes("recent_fall_with_injury") ? 1 : 0);

  return (
    <CheckFrame stage="summary" loading={!f.ready || !s} error={f.error}>
      {s && (
        <section aria-labelledby="summary-title">
          <h1 id="summary-title" className="text-[1.8rem] font-bold leading-tight text-forest">
            Here&apos;s what WISP understood
          </h1>
          <p className="mt-2 text-ink-soft">Check it&apos;s right. You can change any answer before WISP decides what to do next.</p>

          <Card as="div" className="mt-5">
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Main concern</p>
                <p className="mt-0.5 text-[1.1rem] font-bold">{capitalise(s.case.complaint_summary ?? s.case.complaint_text ?? "—")}</p>
              </div>
              <Link href="/check/start" className="flex min-h-11 shrink-0 items-center px-2 font-bold text-forest underline underline-offset-4">
                Start again
              </Link>
            </div>
            <dl className="divide-y divide-line border-t border-line pt-3">
              {rows(s).map((r, i) => (
                <EditableRow
                  key={`${r.field}-${i}`}
                  row={r}
                  open={open === r.field}
                  onToggle={() => setOpen(open === r.field ? null : r.field)}
                  onPick={(v) => pick(r.field, v)}
                  busy={f.sending}
                />
              ))}
            </dl>
          </Card>

          <Card as="div" className="mt-3">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Safety check</p>
            <p className="mt-0.5 text-[1.1rem] font-bold">
              {unsureCount === 0 ? "No warning signs reported" : `No warning signs reported · ${unsureCount} “not sure”`}
            </p>
            {unsureCount > 0 && (
              <p className="mt-1 text-[0.95rem] text-ink-soft">If a warning sign can&apos;t be ruled out, WISP will suggest speaking to a professional.</p>
            )}
            <details className="mt-2" open={unsureCount > 0}>
              <summary className="min-h-11 cursor-pointer py-2 font-bold text-forest">See or change your answers</summary>
              <dl className="divide-y divide-line">
                {flagRows.map((r) => (
                  <EditableRow
                    key={r.field}
                    row={r}
                    open={open === r.field}
                    onToggle={() => setOpen(open === r.field ? null : r.field)}
                    onPick={(v) => pick(r.field, v)}
                    busy={f.sending}
                  />
                ))}
              </dl>
            </details>
          </Card>

          <Button size="lg" className="mt-6 w-full" disabled={f.sending || !confirm} onClick={() => f.answer(confirmLabel, "confirm")}>
            {confirmLabel} — continue
          </Button>
        </section>
      )}
    </CheckFrame>
  );
}
