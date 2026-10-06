"use client";

import Link from "next/link";
import { useStartCheck } from "@/components/StartCheck";
import { Button, Card } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { careHref, useCareSession } from "@/lib/care";
import { TIER_STYLE, dayLabel, timeLabel } from "@/lib/tiers";

function SectionLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40">
      <div className="min-w-0">
        <p className="text-[1.1rem] font-bold">{title}</p>
        <p className="text-[0.95rem] text-ink-soft">{detail}</p>
      </div>
      <span aria-hidden className="text-2xl text-ink-faint">›</span>
    </Link>
  );
}

export default function Care() {
  const { sid, snapshot: s, me, none, error } = useCareSession();
  const check = useStartCheck(me);
  const d = s?.disposition;
  const caregiver = s?.profile?.caregiver;
  const recheck = me?.rechecks.find((r) => r.session_id === sid);

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Care</p>
      <h1 className="mt-1 text-[2rem] font-bold leading-[1.15] text-forest">Your care</h1>

      {none ? (
        <Card className="mt-6">
          <p className="font-bold">No recommendation yet</p>
          <p className="mt-1 text-ink-soft">After a check, your next step and where to go will appear here.</p>
          <Link href="/check/start" className="mt-3 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4">
            Start a check
          </Link>
        </Card>
      ) : error && !s ? (
        <p role="alert" className="mt-6 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      ) : !s || !d ? (
        <div className="py-16" aria-busy>
          <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
        </div>
      ) : (
        <>
          <p className="mt-1 text-ink-soft">From your check {dayLabel(s.case.created_at).toLowerCase() === "today" ? "today" : `on ${dayLabel(s.case.created_at)}`}</p>

          <Link href={careHref("/care/recommendation", sid)} className={`mt-5 block rounded-4xl ${TIER_STYLE[d.tier].bg} px-6 py-6`}>
            <p className={`text-[1.5rem] font-bold uppercase leading-tight ${TIER_STYLE[d.tier].fg}`}>{d.title}</p>
            <p className="mt-2 text-[1.1rem] font-bold text-ink">{d.action}</p>
            <p className="mt-3 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4">See full recommendation</p>
          </Link>

          <nav aria-label="Your care" className="mt-4 space-y-3">
            <SectionLink href={careHref("/care/plan", sid)} title="Care plan" detail="What to do now, today, and next" />
            <SectionLink
              href={careHref("/care/find", sid)}
              title="Find care"
              detail={d.tier === "T1" ? "Call 995 or go to the nearest A&E" : "Where you can be seen"}
            />
            <SectionLink href={careHref("/care/visit-summary", sid)} title="Visit summary" detail="Show your doctor what WISP found" />
            {caregiver && d.tier !== "T1" && (
              <SectionLink href={careHref("/care/share", sid)} title="Share with family" detail={`Send ${caregiver.name} a short summary`} />
            )}
          </nav>

          <Card className="mt-3" aria-labelledby="followup-title">
            <h2 id="followup-title" className="text-[1.1rem] font-bold">
              Follow-up
            </h2>
            {recheck ? (
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-soft">
                  WISP will check in with you {dayLabel(recheck.due_at).toLowerCase()} at {timeLabel(recheck.due_at)}.
                </p>
                <Button onClick={() => check.startFollowUp(recheck.session_id)} disabled={check.busy}>
                  Check in now
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-ink-soft">
                {d.tier === "T1" ? "Get help first. You can start a new check later." : "No check-in is scheduled. If anything changes, start a new check."}
              </p>
            )}
          </Card>
        </>
      )}

      <p className="mt-8 rounded-(--radius-card) bg-red-bg px-5 py-4 text-red">
        In an emergency, call <strong>995</strong>.
      </p>
    </div>
  );
}
