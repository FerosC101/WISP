"use client";

import Link from "next/link";
import { useState } from "react";
import { TIER_STYLE, dayLabel, timeLabel } from "@/lib/tiers";
import type { CareDisposition, Snapshot } from "@/lib/types";
import { HowDecided } from "./HowDecided";
import { Button } from "./ui";
import { WispLine } from "./WispLine";

const MAPS = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;

function FindCare({ d, snapshot }: { d: CareDisposition; snapshot: Snapshot }) {
  const gp = snapshot.profile?.usual_gp;
  const caregiver = snapshot.profile?.caregiver;
  const items: { label: string; detail: string; href?: string }[] = [];
  if (d.tier === "T2" || d.tier === "T3") {
    if (gp) items.push({ label: gp, detail: "Your usual clinic. WISP doesn't check opening hours." });
    items.push({ label: "Polyclinic or GP near me", detail: "Opens a map search.", href: MAPS("polyclinic near me") });
    if (d.tier === "T2") items.push({ label: "No one can see you today?", detail: "Go to the nearest A&E.", href: MAPS("hospital emergency department near me") });
  } else if (d.tier === "ABSTAIN") {
    if (gp) items.push({ label: gp, detail: "Call your family doctor and describe how you feel." });
    if (caregiver) items.push({ label: `${caregiver.name} (${caregiver.relationship})`, detail: "Ask them to help you get advice today." });
    items.push({ label: "A nurse or healthcare professional", detail: "Talk it through with someone who can see the full picture." });
  } else {
    items.push({ label: "Stay at home and rest", detail: "WISP will check in with you again." });
    if (gp) items.push({ label: gp, detail: "If you're not improving, book an appointment." });
  }
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="rounded-2xl bg-card/80 px-4 py-3">
          {i.href ? (
            <a href={i.href} target="_blank" rel="noreferrer" className="font-bold text-forest underline underline-offset-4">
              {i.label}
            </a>
          ) : (
            <span className="font-bold">{i.label}</span>
          )}
          <div className="text-[0.95rem] text-ink-soft">{i.detail}</div>
        </li>
      ))}
    </ul>
  );
}

export function Recommendation({ snapshot, onShowConversation }: { snapshot: Snapshot; onShowConversation: () => void }) {
  const d = snapshot.disposition!;
  const s = TIER_STYLE[d.tier];
  const emergency = d.tier === "T1";
  const [showCare, setShowCare] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const caregiver = snapshot.profile?.caregiver;

  return (
    <div className="space-y-5">
      <section aria-labelledby="rec-title" className={`rounded-4xl ${s.bg} px-6 py-7 sm:px-9 sm:py-9`}>
        <WispLine className={`h-3 w-28 ${s.fg}`} variant="draw" />
        <h1 id="rec-title" className={`mt-4 text-[2.3rem] font-bold uppercase leading-[1.08] tracking-[0.01em] sm:text-[2.8rem] ${s.fg}`}>
          {d.title}
        </h1>
        <p className="mt-4 text-[1.3rem] font-bold leading-snug text-ink">{d.action}</p>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">When</span>
          <span className="text-[1.15rem] font-bold">{d.timeframe}</span>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {emergency ? (
            <>
              <a href="tel:995" className="inline-flex min-h-16 items-center justify-center rounded-2xl bg-red px-8 text-[1.3rem] font-bold text-white">
                Call 995
              </a>
              <a
                href={MAPS("hospital emergency department near me")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-red bg-card px-6 text-[1.05rem] font-bold text-red"
              >
                Nearest emergency department
              </a>
            </>
          ) : (
            <Button size="lg" onClick={() => setShowCare((v) => !v)} aria-expanded={showCare} className="w-full sm:w-auto">
              Find care
            </Button>
          )}
          {caregiver && !emergency && (
            <Link
              href={`/caregiver/${snapshot.session_id}`}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-line bg-card px-6 text-[1.05rem] font-bold text-ink hover:border-forest/50 sm:w-auto"
            >
              Share with family
            </Link>
          )}
          <Button size="lg" variant="ghost" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow} className="w-full sm:w-auto">
            How WISP decided
          </Button>
        </div>
        {emergency && <p className="mt-3 text-sm text-ink-soft">WISP never calls by itself. “Call 995” opens your phone&apos;s dialler.</p>}
        {showCare && !emergency && <FindCare d={d} snapshot={snapshot} />}
      </section>

      {showHow && <HowDecided snapshot={snapshot} />}

      <section aria-labelledby="why-title" className="rounded-(--radius-card) border border-line bg-card p-5 sm:p-6">
        <h2 id="why-title" className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-ink-faint">
          Why this advice?
        </h2>
        <ul className="mt-3 space-y-2.5">
          {d.reasons.map((r) => (
            <li key={r} className="flex gap-3 text-[1.05rem]">
              <span aria-hidden className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="watch-title" className="rounded-(--radius-card) border border-red/30 bg-card p-5 sm:p-6">
        <h2 id="watch-title" className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-red">
          {emergency ? "While you wait for help" : "Watch for"}
        </h2>
        {emergency ? (
          <p className="mt-3 text-[1.05rem]">{d.escalation}</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2">
              {d.worsening_signs.map((w) => (
                <li key={w} className="flex gap-3 text-[1.05rem]">
                  <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
                  {w}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-red-bg px-4 py-3 font-bold text-red">If any of these happen, call 995.</p>
          </>
        )}
      </section>

      {d.self_care.length > 0 && (
        <section aria-labelledby="selfcare-title" className="rounded-(--radius-card) bg-sage p-5 sm:p-6">
          <h2 id="selfcare-title" className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-forest">
            Looking after yourself
          </h2>
          <ul className="mt-3 space-y-2">
            {d.self_care.map((x) => (
              <li key={x} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
                {x}
              </li>
            ))}
          </ul>
          {d.recheck && (
            <p className="mt-4 rounded-xl bg-card px-4 py-3">
              <strong>Next check:</strong> {dayLabel(d.recheck.due_at)} · {timeLabel(d.recheck.due_at)}. WISP will ask how you&apos;re doing.
            </p>
          )}
        </section>
      )}

      {!emergency && <p className="text-[0.95rem] text-ink-soft">{d.escalation}</p>}

      <button onClick={onShowConversation} className="min-h-11 text-[0.95rem] font-bold text-forest underline underline-offset-4">
        See the conversation
      </button>
    </div>
  );
}
