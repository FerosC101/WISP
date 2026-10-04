"use client";

import Link from "next/link";
import { useState } from "react";
import { TIER_STYLE, formatDate } from "@/lib/tiers";
import type { CareDisposition, Snapshot } from "@/lib/types";
import { Button, Card, Eyebrow } from "./ui";

const MAPS = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;

function FindCare({ d, snapshot }: { d: CareDisposition; snapshot: Snapshot }) {
  const gp = snapshot.profile?.usual_gp;
  const caregiver = snapshot.profile?.caregiver;
  const items: { label: string; detail: string; href?: string; strong?: boolean }[] = [];
  if (d.tier === "T1") {
    items.push({ label: "Call 995", detail: "Singapore emergency ambulance (SCDF).", href: "tel:995", strong: true });
    items.push({ label: "Nearest A&E", detail: "Opens a map search for emergency departments near you.", href: MAPS("hospital emergency department near me") });
  } else if (d.tier === "T2" || d.tier === "T3") {
    if (gp) items.push({ label: gp, detail: "Your usual clinic (from your profile). Opening hours are not checked by WISP." });
    items.push({ label: "Polyclinic or GP near me", detail: "Opens a map search.", href: MAPS("polyclinic near me") });
    if (d.tier === "T2") items.push({ label: "If no one can see you today", detail: "Go to the nearest A&E.", href: MAPS("hospital emergency department near me") });
  } else if (d.tier === "ABSTAIN") {
    if (gp) items.push({ label: gp, detail: "Call your family doctor and describe how you feel." });
    if (caregiver) items.push({ label: `${caregiver.name} (${caregiver.relationship})`, detail: "Ask them to help you get advice today." });
    items.push({ label: "A nurse or healthcare professional", detail: "A nurse advice service, where available, can talk it through with you." });
  } else {
    items.push({ label: "Stay at home and rest", detail: "WISP will check in with you again." });
    if (gp) items.push({ label: gp, detail: "If you are not improving, book an appointment." });
  }
  return (
    <ul className="mt-4 space-y-3">
      {items.map((i) => (
        <li key={i.label} className="rounded-2xl border border-line bg-paper px-4 py-3">
          {i.href ? (
            <a href={i.href} target={i.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`font-bold underline underline-offset-4 ${i.strong ? "text-red text-[1.2rem]" : "text-blue"}`}>
              {i.label}
            </a>
          ) : (
            <span className="font-bold">{i.label}</span>
          )}
          <div className="text-ink-soft">{i.detail}</div>
        </li>
      ))}
      <li className="text-sm text-ink-faint">WISP does not check live clinic availability.</li>
    </ul>
  );
}

export function Recommendation({ snapshot, onShowWhy }: { snapshot: Snapshot; onShowWhy: () => void }) {
  const d = snapshot.disposition!;
  const s = TIER_STYLE[d.tier];
  const [showCare, setShowCare] = useState(d.tier === "T1");
  const emergency = d.tier === "T1";

  return (
    <div className="space-y-5">
      <section aria-labelledby="rec-title" className={`rounded-[2rem] border-2 ${s.border} ${s.bg} px-6 py-7 sm:px-9 sm:py-9`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${s.chip}`}>{s.short}</span>
          <span className="text-sm text-ink-soft">
            Confidence: <strong className="text-ink">{d.confidence[0].toUpperCase() + d.confidence.slice(1)}</strong>
          </span>
        </div>
        <h1 id="rec-title" className={`mt-4 text-[2.3rem] font-bold leading-tight sm:text-[2.7rem] ${s.fg}`}>
          {d.title}
        </h1>
        <p className="mt-3 text-[1.3rem] font-bold text-ink">{d.action}</p>
        <p className="mt-1 text-ink-soft">
          When: <strong className="text-ink">{d.timeframe}</strong>
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {emergency ? (
            <>
              <a href="tel:995" className="inline-flex min-h-16 items-center justify-center rounded-2xl bg-red px-8 text-[1.3rem] font-bold text-white">
                Call 995
              </a>
              <a
                href={MAPS("hospital emergency department near me")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-16 items-center justify-center rounded-2xl border-2 border-red bg-card px-6 text-[1.05rem] font-bold text-red"
              >
                Show nearest emergency department
              </a>
            </>
          ) : (
            <Button size="lg" onClick={() => setShowCare((v) => !v)} aria-expanded={showCare}>
              Find care
            </Button>
          )}
          {snapshot.profile?.caregiver && !emergency && (
            <Link
              href={`/caregiver/${snapshot.session_id}`}
              className="inline-flex min-h-16 items-center justify-center rounded-2xl border-2 border-line bg-card px-6 text-[1.05rem] font-bold text-ink hover:border-ink-soft"
            >
              Share summary
            </Link>
          )}
          <Button size="lg" variant="secondary" onClick={onShowWhy}>
            View why
          </Button>
        </div>
        {emergency && <p className="mt-3 text-sm text-ink-soft">Demo: WISP never places a call by itself. Tapping “Call 995” opens your phone dialler.</p>}
        {showCare && !emergency && <FindCare d={d} snapshot={snapshot} />}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card aria-labelledby="why-title">
          <h2 id="why-title" className="text-[1.15rem] font-bold text-navy">
            Why this advice?
          </h2>
          <ul className="mt-3 space-y-3">
            {d.reasons.map((r) => (
              <li key={r} className="flex gap-3">
                <span aria-hidden className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${d.tier === "T1" ? "bg-red" : "bg-navy"}`} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card aria-labelledby="watch-title" className={emergency ? "" : "border-red/40"}>
          <h2 id="watch-title" className="text-[1.15rem] font-bold text-red">
            {emergency ? "While you wait for help" : "Watch for"}
          </h2>
          {emergency ? (
            <p className="mt-3">{d.escalation}</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {d.worsening_signs.map((w) => (
                  <li key={w} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-red-bg px-4 py-3 font-bold text-red">If these happen: call 995.</p>
              <p className="mt-3 text-ink-soft">{d.escalation}</p>
            </>
          )}
        </Card>
      </div>

      {d.self_care.length > 0 && (
        <Card aria-labelledby="selfcare-title">
          <h2 id="selfcare-title" className="text-[1.15rem] font-bold text-green">
            Looking after yourself today
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {d.self_care.map((x) => (
              <li key={x} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-green" />
                {x}
              </li>
            ))}
          </ul>
          {d.recheck && (
            <p className="mt-4 rounded-xl bg-green-bg px-4 py-3">
              <strong>Next check-in:</strong> {formatDate(d.recheck.due_at)}. WISP will ask how you&apos;re doing.
            </p>
          )}
        </Card>
      )}

      <div className="flex items-center gap-2 text-sm text-ink-faint">
        <Eyebrow>Decided by</Eyebrow>
        <span>deterministic safety rules{d.sensing_used ? ", using your chair-rise check" : ""} · explained by WISP</span>
      </div>
    </div>
  );
}
