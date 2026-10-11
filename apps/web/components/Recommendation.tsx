"use client";

import Link from "next/link";
import { useState } from "react";
import { MAPS } from "@/lib/care";
import { dayLabel, timeLabel } from "@/lib/tiers";
import type { CareDisposition, Snapshot, Tier } from "@/lib/types";
import { HowDecided } from "./HowDecided";
import { Icon } from "./Icon";
import { Illustration } from "./Illustration";
import { buttonClass } from "./ui";
import { WispLine } from "./WispLine";

/**
 * The care recommendation. It renders the backend's CareDisposition as-is
 * (title, action, timeframe, reasons, warning signs): it never decides urgency.
 * Emergency and "can't judge" each get their own, deliberately different layout.
 */

// Hero colours per level. Red only for emergencies.
const HERO: Record<Exclude<Tier, "T1">, { bg: string; title: string; line: string }> = {
  T2: { bg: "bg-amber-bg", title: "text-amber", line: "text-amber-soft" },
  T3: { bg: "bg-teal-bg", title: "text-teal", line: "text-teal-soft" },
  T4: { bg: "bg-sage", title: "text-forest", line: "text-sage-mid" },
  ABSTAIN: { bg: "bg-slate-bg", title: "text-ink", line: "text-ink-faint" },
};

/** A calendar reminder for the scheduled check-in, made on the device (nothing is sent anywhere). */
function reminderHref(dueAt: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(dueAt);
  const end = new Date(start.getTime() + 15 * 60_000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WISP//Check-in//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}-wisp@local`,
    `DTSTAMP:${stamp(start)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "SUMMARY:WISP check-in",
    "DESCRIPTION:Open WISP and tell it how you are feeling. If you feel much worse before then, call 995.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function ReasonList({ d }: { d: CareDisposition }) {
  return (
    <section aria-labelledby="why-title" className="border-t border-line pt-6">
      <h2 id="why-title" className="text-[1.35rem] text-forest">
        Why this advice?
      </h2>
      <ul className="mt-3 space-y-2.5">
        {d.reasons.map((r) => (
          <li key={r} className="flex gap-3 text-[1.06rem]">
            <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-sage-mid" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WatchFor({ d }: { d: CareDisposition }) {
  return (
    <section aria-labelledby="watch-title" className="rounded-w-lg border border-red/25 bg-card px-5 py-5 sm:px-6">
      <h2 id="watch-title" className="text-[1.35rem] text-red-deep">
        Watch for
      </h2>
      <ul className="mt-3 space-y-2">
        {d.worsening_signs.map((w) => (
          <li key={w} className="flex gap-3 text-[1.04rem]">
            <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
            {w}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-3 rounded-w-md bg-red-bg px-4 py-3 text-[1.04rem] font-semibold text-red-deep">
        <Icon name="phone" className="h-5 w-5" />
        <span>
          If any of these happen,{" "}
          <a href="tel:995" className="underline underline-offset-4">
            call 995
          </a>
          .
        </span>
      </p>
    </section>
  );
}

/** Emergency: quiet, uncluttered, unmistakable. No sensing, no extras. */
function Emergency({ snapshot, d }: { snapshot: Snapshot; d: CareDisposition }) {
  const [showHow, setShowHow] = useState(false);
  return (
    <div className="space-y-6">
      <section aria-labelledby="rec-title" className="rounded-w-lg bg-red-bg px-6 py-8 sm:px-9">
        <p className="label text-red-deep">Your next step</p>
        <h1 id="rec-title" className="display mt-2 text-[2.5rem] uppercase tracking-[0.01em] text-red-deep sm:text-[3rem]">
          {d.title}
        </h1>
        <p className="mt-4 text-[1.25rem] font-semibold leading-snug text-ink">Call 995 now or go to the nearest A&amp;E.</p>
        <div className="mt-6 flex flex-col gap-3">
          <a href="tel:995" className="inline-flex min-h-16 items-center justify-center gap-3 rounded-w-md bg-red px-8 text-[1.3rem] font-bold text-white hover:bg-red-deep">
            <Icon name="phone" className="h-6 w-6" strokeWidth={2} />
            Call 995
          </a>
          <a href={MAPS("hospital emergency department near me")} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg", "w-full border-red/40 text-red-deep")}>
            <Icon name="location" className="h-5 w-5" />
            Nearest emergency department
          </a>
        </div>
        <p className="mt-3 text-[0.92rem] text-ink-soft">WISP never calls by itself. “Call 995” opens your phone&apos;s dialler.</p>
      </section>

      <section aria-labelledby="wait-title" className="px-1">
        <h2 id="wait-title" className="text-[1.35rem] text-ink">
          While you wait
        </h2>
        <ul className="mt-3 space-y-2.5 text-[1.06rem]">
          <li className="flex gap-3">
            <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
            Do not drive yourself.
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
            Sit or lie somewhere safe.
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
            If you are alone, call someone nearby and unlock your door if you can.
          </li>
        </ul>
      </section>

      <section aria-labelledby="why-title" className="border-t border-line px-1 pt-5">
        <h2 id="why-title" className="text-[1.2rem] text-ink">
          Why WISP is recommending this
        </h2>
        {d.reasons.map((r) => (
          <p key={r} className="mt-2 text-[1.04rem] text-ink-soft">
            {r}
          </p>
        ))}
        <button type="button" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow} className="mt-3 min-h-11 font-semibold text-forest underline underline-offset-4">
          How WISP decided
        </button>
      </section>
      {showHow && <HowDecided snapshot={snapshot} />}
    </div>
  );
}

export function Recommendation({ snapshot, onShowConversation }: { snapshot: Snapshot; onShowConversation: () => void }) {
  const d = snapshot.disposition!;
  const [showHow, setShowHow] = useState(false);
  if (d.tier === "T1") return <Emergency snapshot={snapshot} d={d} />;

  const h = HERO[d.tier];
  const abstain = d.tier === "ABSTAIN";
  const caregiver = snapshot.profile?.caregiver;
  const sid = snapshot.session_id;

  return (
    <div className="space-y-7">
      <section aria-labelledby="rec-title" className={`rounded-w-lg ${h.bg} px-6 py-7 sm:px-9 sm:py-9`}>
        <p className="label text-ink-soft">Your next step</p>
        <h1 id="rec-title" className={`display mt-2 text-[2.35rem] sm:text-[2.9rem] ${h.title}`}>
          {d.title}
        </h1>
        <WispLine variant="draw" className={`mt-3 h-4 w-28 ${h.line}`} />
        {abstain ? (
          <>
            <p className="mt-4 text-[1.1rem] text-ink-soft">I don&apos;t have enough reliable information to suggest home monitoring.</p>
            <p className="mt-2 text-[1.22rem] font-semibold leading-snug text-ink">{d.action}</p>
          </>
        ) : (
          <p className="mt-4 text-[1.22rem] font-semibold leading-snug text-ink">{d.action}</p>
        )}
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-1.5 text-[1rem]">
          <Icon name="clock" className="h-5 w-5 text-forest" />
          <span className="text-ink-soft">When:</span> <strong className="font-semibold">{d.timeframe}</strong>
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={`/care/find?s=${sid}`} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
            <Icon name="location" className="h-5 w-5" />
            {d.tier === "T4" ? "Find care if you need it" : "Find care near me"}
          </Link>
          {caregiver && (
            <Link href={`/care/share?s=${sid}`} className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>
              <Icon name="family" className="h-5 w-5" />
              Share with someone
            </Link>
          )}
        </div>
        <button type="button" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow} className="mt-4 min-h-11 font-semibold text-forest underline underline-offset-4">
          How WISP decided
        </button>
      </section>

      {showHow && <HowDecided snapshot={snapshot} />}

      <ReasonList d={d} />

      {d.self_care.length > 0 && (
        <section aria-labelledby="selfcare-title" className="grid items-center gap-5 rounded-w-lg bg-sage px-5 py-5 sm:grid-cols-[1fr_11rem] sm:px-6">
          <div>
            <h2 id="selfcare-title" className="text-[1.35rem] text-forest">
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
              <div className="mt-4 rounded-w-md bg-card px-4 py-3">
                <p className="flex items-center gap-2.5">
                  <Icon name="calendar" className="h-5 w-5 text-forest" />
                  <span>
                    <strong className="font-semibold">Next check-in:</strong> {dayLabel(d.recheck.due_at)} · {timeLabel(d.recheck.due_at)}. WISP will ask how you&apos;re doing.
                  </span>
                </p>
                <a href={reminderHref(d.recheck.due_at)} download="wisp-check-in.ics" className={buttonClass("secondary", "md", "mt-3 w-full")}>
                  <Icon name="calendar" className="h-5 w-5" />
                  Set check-in
                </a>
              </div>
            )}
          </div>
          <Illustration scene="rest" decorative className="hidden rounded-w-md sm:block" />
        </section>
      )}

      <WatchFor d={d} />

      <p className="px-1 text-[0.98rem] text-ink-soft">{d.escalation}</p>

      <button onClick={onShowConversation} className="min-h-11 px-1 text-[0.95rem] font-semibold text-forest underline underline-offset-4">
        See the full conversation
      </button>
    </div>
  );
}
