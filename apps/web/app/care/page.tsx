"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, LinkRow, PageIntro, StatusLine } from "@/components/kit";
import { useStartCheck } from "@/components/StartCheck";
import { Button, buttonClass } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { careHref, useCareSession } from "@/lib/care";
import { buildPlan, loadPlanDone } from "@/lib/carePlan";
import { TIER_STYLE, dayLabel, timeLabel } from "@/lib/tiers";

/**
 * Care home: the current plan and its status, what to do now, what to bring,
 * and what would change things. Everything comes from the rules engine's
 * disposition (via the care plan); this page only arranges it.
 */
export default function Care() {
  const { sid, snapshot: s, me, none, error } = useCareSession();
  const check = useStartCheck(me);
  const d = s?.disposition;
  const caregiver = s?.profile?.caregiver;
  const recheck = me?.rechecks.find((r) => r.session_id === sid);
  const plan = s && d ? buildPlan(s) : null;
  const first = plan ? [...plan.now, ...plan.today].find((x) => x.checkable) : undefined;

  // Ticks live in this browser only; read after mount.
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!sid) return;
    const id = setTimeout(() => setDone(loadPlanDone(sid)), 0);
    return () => clearTimeout(id);
  }, [sid]);

  const emergency = d?.tier === "T1";
  const seeingDoctor = d && ["T2", "T3", "ABSTAIN"].includes(d.tier);

  return (
    <div className="mx-auto max-w-xl pt-1 sm:pt-6">
      <PageIntro
        label="Care"
        title="Your care"
        lead={s && d ? `From your check ${dayLabel(s.case.created_at).toLowerCase() === "today" ? "today" : `on ${dayLabel(s.case.created_at)}`}.` : undefined}
      />

      {none ? (
        <EmptyState
          scene="rest"
          title="No recommendation yet"
          body="After a check-in, your next step, where to go and a summary for your doctor will appear here."
          action={
            <Link href="/check/start" className={buttonClass("primary", "lg")}>
              Start a check-in
            </Link>
          }
        />
      ) : error && !s ? (
        <p role="alert" className="mt-6 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      ) : !s || !d || !plan ? (
        <div className="py-16" aria-busy>
          <WispLine variant="flow" className="mx-auto h-8 w-48 text-sage-mid" />
        </div>
      ) : (
        <>
          <section aria-labelledby="plan-title" className={`mt-6 rounded-w-lg ${TIER_STYLE[d.tier].bg} px-6 py-6`}>
            <h2 id="plan-title" className="label text-ink-soft">
              Your current plan
            </h2>
            <p className={`mt-1 font-serif text-[1.8rem] font-semibold leading-[1.15] ${TIER_STYLE[d.tier].fg}`}>{d.title}</p>
            <p className="mt-2 text-[1.12rem] font-semibold text-ink">{d.action}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-w-md bg-card/80 px-4 py-3">
              <div>
                <dt className="text-[0.9rem] text-ink-soft">When</dt>
                <dd className="font-semibold">{d.timeframe}</dd>
              </div>
              {first && !emergency && (
                <div>
                  <dt className="text-[0.9rem] text-ink-soft">Status</dt>
                  <dd className="font-semibold">
                    <StatusLine tone={done[first.id] ? "good" : "attention"}>{done[first.id] ? "Done" : "Not done yet"}</StatusLine>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex flex-col gap-3">
              {emergency ? (
                <a
                  href="tel:995"
                  className="inline-flex min-h-16 items-center justify-center gap-3 rounded-w-md bg-red px-8 text-[1.25rem] font-bold text-white hover:bg-red-deep"
                >
                  <Icon name="phone" className="h-6 w-6" strokeWidth={2} />
                  Call 995
                </a>
              ) : (
                <Link href={careHref("/care/find", sid)} className={buttonClass("primary", "lg", "w-full")}>
                  <Icon name="location" className="h-5 w-5" />
                  {d.tier === "T4" ? "Find care if you need it" : "Find care"}
                </Link>
              )}
              <Link
                href={careHref("/care/recommendation", sid)}
                className="inline-flex min-h-11 items-center justify-center font-semibold text-forest underline underline-offset-4"
              >
                See full recommendation
              </Link>
            </div>
          </section>

          {!emergency && (
            <section aria-labelledby="now-title" className="mt-8">
              <h2 id="now-title" className="text-[1.35rem] text-forest">
                What to do now
              </h2>
              <ul className="mt-3 space-y-2.5">
                {[...plan.now, ...plan.today].slice(0, 4).map((x) => (
                  <li key={x.id} className="flex gap-3 text-[1.04rem]">
                    <span
                      aria-hidden
                      className={`mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done[x.id] ? "bg-forest text-white" : "border-[1.5px] border-sage-deep"}`}
                    >
                      {done[x.id] && <Icon name="check-mark" className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={done[x.id] ? "text-ink-soft line-through" : ""}>{x.text}</span>
                  </li>
                ))}
              </ul>
              <Link href={careHref("/care/plan", sid)} className="mt-3 inline-flex min-h-11 items-center gap-1 font-semibold text-forest">
                Open your full care plan <Icon name="chevron-right" className="h-4 w-4" />
              </Link>
            </section>
          )}

          {seeingDoctor && (
            <section aria-labelledby="bring-title" className="mt-6 rounded-w-lg bg-sand-soft px-5 py-5">
              <h2 id="bring-title" className="text-[1.35rem] text-forest">
                Before you go
              </h2>
              <p className="mt-1 text-[0.98rem] text-ink-soft">Bring:</p>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-3">
                  <Icon name="document" className="h-5 w-5 text-teal" /> Your medication list
                </li>
                <li className="flex items-center gap-3">
                  <Icon name="you" className="h-5 w-5 text-teal" /> Identification
                </li>
                <li className="flex items-center gap-3">
                  <Icon name="shield" className="h-5 w-5 text-teal" />
                  <Link href={careHref("/care/visit-summary", sid)} className="font-semibold text-forest underline underline-offset-4">
                    Your WISP visit summary
                  </Link>
                </li>
              </ul>
            </section>
          )}

          <nav aria-label="Your care" className="mt-6 divide-y divide-line rounded-w-lg border border-line bg-card px-4">
            <LinkRow href={careHref("/care/plan", sid)} icon="calendar" title="Care plan" detail="What to do now, today, and next" />
            <LinkRow
              href={careHref("/care/find", sid)}
              icon="location"
              title="Find care"
              detail={emergency ? "Call 995 or go to the nearest A&E" : "Where you can be seen"}
            />
            <LinkRow href={careHref("/care/visit-summary", sid)} icon="document" title="Visit summary" detail="Show your doctor what WISP found" />
            {caregiver && !emergency && (
              <LinkRow href={careHref("/care/share", sid)} icon="family" title="Share with family" detail={`Send ${caregiver.name} a short summary`} />
            )}
          </nav>

          <section aria-labelledby="followup-title" className="mt-6 rounded-w-lg bg-sage px-5 py-5">
            <h2 id="followup-title" className="text-[1.35rem] text-forest">
              Follow-up
            </h2>
            {recheck ? (
              <>
                <p className="mt-1 text-ink-soft">
                  WISP will check in with you {dayLabel(recheck.due_at).toLowerCase()} at {timeLabel(recheck.due_at)}.
                </p>
                <Button size="lg" variant="secondary" className="mt-3 w-full" onClick={() => check.startFollowUp(recheck.session_id)} disabled={check.busy}>
                  Check in now
                </Button>
              </>
            ) : (
              <p className="mt-1 text-ink-soft">
                {emergency ? "Get help first. You can start a new check later." : "No check-in is scheduled. If anything changes, start a new check."}
              </p>
            )}
          </section>

          {!emergency && (
            <section aria-labelledby="change-title" className="mt-6 rounded-w-lg border border-red/25 bg-card px-5 py-5">
              <h2 id="change-title" className="text-[1.35rem] text-red-deep">
                If things change
              </h2>
              <ul className="mt-3 space-y-1.5">
                {plan.worse.signs.map((w) => (
                  <li key={w} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red" />
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="mt-6 flex items-center gap-3 rounded-w-md bg-red-bg px-5 py-4 text-red-deep">
        <Icon name="phone" className="h-5 w-5" />
        <span>
          In an emergency, call <strong>995</strong>.
        </span>
      </p>
    </div>
  );
}
