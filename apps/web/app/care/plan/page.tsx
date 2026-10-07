"use client";

import Link from "next/link";
import { useState } from "react";
import { CareShell } from "@/components/care/CareShell";
import { useStartCheck } from "@/components/StartCheck";
import { useCareSession } from "@/lib/care";
import { type PlanAction, type PlanStep, buildPlan } from "@/lib/carePlan";
import type { Persona } from "@/lib/types";

// Ticks are a per-device convenience, so they live in this browser only.
function loadDone(sid: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(`wisp-plan-${sid}`) ?? "{}");
  } catch {
    return {};
  }
}
function saveDone(sid: string, done: Record<string, boolean>) {
  try {
    localStorage.setItem(`wisp-plan-${sid}`, JSON.stringify(done));
  } catch {
    /* storage unavailable: ticks last for this visit only */
  }
}

function ActionButton({ a, onFollowUp, busy }: { a: PlanAction; onFollowUp: (sid: string) => void; busy: boolean }) {
  const cls = `mt-3 inline-flex min-h-12 items-center justify-center rounded-2xl px-5 font-bold ${
    a.emphasis === "emergency"
      ? "w-full bg-red text-[1.2rem] text-white min-h-16"
      : a.emphasis === "primary"
        ? "bg-forest text-white hover:bg-forest-deep"
        : "border-2 border-line bg-card text-ink hover:border-forest/50"
  }`;
  if (a.kind === "followup")
    return (
      <button type="button" className={cls} disabled={busy} onClick={() => onFollowUp(a.href)}>
        {a.label}
      </button>
    );
  if (a.kind === "link")
    return (
      <Link href={a.href} className={cls}>
        {a.label}
      </Link>
    );
  return (
    <a href={a.href} className={cls} {...(a.kind === "external" ? { target: "_blank", rel: "noreferrer" } : {})}>
      {a.label}
    </a>
  );
}

function Step({
  step,
  done,
  onToggle,
  onFollowUp,
  busy,
}: {
  step: PlanStep;
  done: boolean;
  onToggle: () => void;
  onFollowUp: (sid: string) => void;
  busy: boolean;
}) {
  return (
    <li className={`rounded-2xl border border-line bg-card p-4 ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        {step.checkable ? (
          <label className="-m-2.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
            <input type="checkbox" checked={done} onChange={onToggle} aria-label={`Done: ${step.text}`} className="h-6 w-6 accent-forest" />
          </label>
        ) : (
          <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-ink-faint" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[1.08rem] font-bold ${done ? "line-through" : ""}`}>{step.text}</p>
          {step.detail && <p className="mt-0.5 text-[0.95rem] text-ink-soft">{step.detail}</p>}
          {step.action && <ActionButton a={step.action} onFollowUp={onFollowUp} busy={busy} />}
        </div>
      </div>
    </li>
  );
}

function Phase({ title, tone, children }: { title: string; tone: "now" | "later" | "worse"; children: React.ReactNode }) {
  const dot = tone === "now" ? "bg-forest" : tone === "worse" ? "bg-red" : "bg-teal";
  return (
    <section aria-label={title} className="relative pl-7">
      <span aria-hidden className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ${dot}`} />
      <span aria-hidden className="absolute bottom-0 left-[6px] top-6 w-0.5 bg-line" />
      <h2 className={`text-[0.78rem] font-bold uppercase tracking-[0.16em] ${tone === "worse" ? "text-red" : "text-ink-faint"}`}>{title}</h2>
      <div className="mt-2 pb-6">{children}</div>
    </section>
  );
}

function PlanBody({ snapshot, me }: { snapshot: NonNullable<ReturnType<typeof useCareSession>["snapshot"]>; me: Persona | null }) {
  const plan = buildPlan(snapshot);
  const sid = snapshot.session_id;
  const [done, setDone] = useState<Record<string, boolean>>(() => loadDone(sid));
  const check = useStartCheck(me);
  const toggle = (id: string) =>
    setDone((x) => {
      const next = { ...x, [id]: !x[id] };
      saveDone(sid, next);
      return next;
    });
  const steps = (xs: PlanStep[]) => (
    <ul className="space-y-2.5">
      {xs.map((st) => (
        <Step key={st.id} step={st} done={!!done[st.id]} onToggle={() => toggle(st.id)} onFollowUp={check.startFollowUp} busy={check.busy} />
      ))}
    </ul>
  );
  const d = snapshot.disposition!;

  return (
    <>
      <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Your care plan</h1>
      <p className="mt-1 text-ink-soft">{d.title}</p>
      <div className="mt-6">
        {plan.now.length > 0 && <Phase title="Now" tone="now">{steps(plan.now)}</Phase>}
        {plan.today.length > 0 && <Phase title="Today" tone="later">{steps(plan.today)}</Phase>}
        {plan.next.length > 0 && <Phase title="Next" tone="later">{steps(plan.next)}</Phase>}
        <Phase title="If symptoms get worse" tone="worse">
          <div className="rounded-2xl border border-red/30 bg-card p-4">
            {plan.worse.advice.map((a) => (
              <p key={a} className="mb-3 font-bold">
                {a}
              </p>
            ))}
            <p className="text-[0.95rem] text-ink-soft">Call 995 straight away if you notice:</p>
            <ul className="mt-2 space-y-1.5">
              {plan.worse.signs.map((w) => (
                <li key={w} className="flex gap-2.5">
                  <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
                  {w}
                </li>
              ))}
            </ul>
            <a href="tel:995" className="mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-red text-[1.1rem] font-bold text-white">
              Call 995
            </a>
          </div>
        </Phase>
      </div>
      {check.error && (
        <p role="alert" className="rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {check.error}
        </p>
      )}
    </>
  );
}

export default function CarePlanPage() {
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => <PlanBody key={s.session_id} snapshot={s} me={c.me} />}
    </CareShell>
  );
}
