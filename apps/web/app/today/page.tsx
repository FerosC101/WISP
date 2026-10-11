"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DescribeBox, useStartCheck } from "@/components/StartCheck";
import { Icon, type IconName } from "@/components/Icon";
import { Illustration } from "@/components/Illustration";
import { LargeChoice, StatusLine } from "@/components/kit";
import { Button, buttonClass } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { STATUS_WORDS, baselineStatus, useBaseline } from "@/lib/baseline";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel, greeting, timeLabel } from "@/lib/tiers";
import type { HistoryItem, Persona } from "@/lib/types";
import { useMe } from "@/lib/useMe";

// Each tile starts a check with the person's own words, exactly as if they had typed them.
const QUICK: { words: string; label: string; icon: IconName; tone: "sage" | "dusty" | "sand" }[] = [
  { words: "I feel weak", label: "I feel weak", icon: "weak", tone: "sage" },
  { words: "I feel dizzy", label: "I feel dizzy", icon: "dizzy", tone: "dusty" },
  { words: "I'm unusually tired", label: "I'm unusually tired", icon: "tired", tone: "sand" },
  { words: "I feel unsteady", label: "I feel unsteady", icon: "balance", tone: "sage" },
  { words: "I'm not eating normally", label: "I'm not eating normally", icon: "appetite", tone: "dusty" },
  { words: "Something feels off", label: "Something feels off", icon: "other", tone: "sand" },
];

function NextCheckIn({ recheck, busy, onStart }: { recheck: Persona["rechecks"][number]; busy: boolean; onStart: () => void }) {
  // Read the clock after mount, not during render.
  const [due, setDue] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDue(new Date(recheck.due_at).getTime() <= Date.now()), 0);
    return () => clearTimeout(id);
  }, [recheck.due_at]);
  return (
    <section aria-labelledby="next-title" className="rounded-w-lg bg-sage px-5 py-5">
      <h2 id="next-title" className="label text-forest">
        Next check-in
      </h2>
      <p className="mt-1 font-serif text-[1.45rem] font-semibold leading-tight text-forest">
        {dayLabel(recheck.due_at)} <span className="text-ink-soft">·</span> {timeLabel(recheck.due_at)}
      </p>
      <p className="mt-1 text-[0.98rem] text-ink-soft">WISP will ask how things compare with last time.</p>
      <Button size="lg" variant={due ? "primary" : "secondary"} onClick={onStart} disabled={busy} className="mt-4 w-full">
        {due ? "Start check-in" : "Start early"}
      </Button>
    </section>
  );
}

/** One plain sentence about the last check. Built from what was recorded, never a new interpretation. */
function recentSentence(r: HistoryItem): string {
  const felt = r.complaint ? `You said “${r.complaint.replace(/[.!]+$/, "")}”.` : "";
  const movement =
    r.comparison_status === "within_usual_range" || r.comparison_status === "faster_than_usual"
      ? " Your movement was within your usual range."
      : r.comparison_status === "slower_than_usual"
        ? " Your movement was slower than your usual pattern."
        : r.sensing_used
          ? " A movement check was part of it."
          : "";
  return `${felt}${movement}`.trim();
}

function MostRecent({ item }: { item: HistoryItem }) {
  if (!item.tier) return null;
  return (
    <Link href={`/care?s=${item.session_id}`} className="group block rounded-w-lg border border-line bg-card px-5 py-5 transition-colors hover:border-forest/40">
      <p className="label text-ink-soft">Most recent · {dayLabel(item.created_at)}</p>
      <p className="mt-1 text-[1.15rem] font-semibold">
        <StatusLine tone={item.tier === "T4" ? "good" : item.tier === "T1" ? "urgent" : "attention"}>
          <span className={TIER_STYLE[item.tier].fg}>{PATIENT_OUTCOME[item.tier]}</span>
        </StatusLine>
      </p>
      <p className="mt-1.5 text-[0.98rem] text-ink-soft">{recentSentence(item)}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[0.95rem] font-semibold text-forest">
        See this check <Icon name="chevron-right" className="h-4 w-4" />
      </span>
    </Link>
  );
}

function MyUsual({ userId }: { userId: string }) {
  const { data } = useBaseline(userId);
  if (!data) return null;
  const st = baselineStatus(data);
  const n = data.baseline?.sessions.length ?? 0;
  const w = STATUS_WORDS[st];
  return (
    <section aria-labelledby="usual-title" className="rounded-w-lg border border-line bg-card px-5 py-5">
      <h2 id="usual-title" className="label text-ink-soft">
        My usual
      </h2>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-[1.05rem] text-ink-soft">Movement</span>
        <span className="text-[1.15rem] font-semibold">
          <StatusLine tone={st === "stable" ? "good" : st === "varies" ? "attention" : "neutral"}>{w.title}</StatusLine>
        </span>
      </div>
      <p className="mt-1 text-[0.98rem] text-ink-soft">
        {n === 0 ? "No healthy-day checks yet." : `${n} healthy-day check${n === 1 ? "" : "s"} recorded`}
      </p>
      <Link href="/you/baseline" className={buttonClass("secondary", "md", "mt-3 w-full")}>
        View my usual
      </Link>
    </section>
  );
}

export default function Today() {
  const { me, recent, error } = useMe();
  const check = useStartCheck(me);
  const recheck = me?.rechecks[0];

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:gap-14">
      <div className="min-w-0">
        <section aria-labelledby="hello" className="pt-1 sm:pt-6">
          <p className="text-[1.08rem] text-ink-soft">{me ? `${greeting()}, ${me.display_name}.` : `${greeting()}.`}</p>
          <h1 id="hello" className="display mt-1 text-[2.35rem] text-forest sm:text-[3.1rem]">
            How are you feeling today?
          </h1>
          <WispLine variant="draw" className="mt-3 h-5 w-36 text-sage-mid" />
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
            {error}
          </p>
        )}

        <section aria-label="Check in" className="mt-6 rounded-w-lg bg-sand-soft p-4 sm:p-5">
          <Link href="/check/start" className={buttonClass("primary", "lg", "w-full")}>
            {check.busy ? "Starting…" : "Start a new check-in"}
          </Link>
          <p className="mb-2 mt-4 text-[0.95rem] text-ink-soft">Or say it in your own words</p>
          <DescribeBox me={me} check={check} />
        </section>

        <section aria-labelledby="quick-title" className="mt-7">
          <h2 id="quick-title" className="text-[1.3rem] text-ink">
            Or tap what feels different
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
            {QUICK.map((q) => (
              <li key={q.words}>
                <LargeChoice role="button" icon={q.icon} label={q.label} tone={q.tone} disabled={!me || check.busy} onClick={() => check.start(q.words)} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside aria-label="Your care" className="min-w-0 space-y-4 md:pt-6">
        <Illustration scene="healthy" decorative className="hidden rounded-w-lg md:block" />
        {recheck && <NextCheckIn recheck={recheck} busy={check.busy} onStart={() => check.startFollowUp(recheck.session_id)} />}
        {recent && <MostRecent item={recent} />}
        {me && <MyUsual userId={me.user_id} />}
        <p className="flex items-start gap-2.5 px-1 text-[0.95rem] text-ink-soft">
          <Icon name="lock" className="mt-0.5 h-5 w-5 text-teal" />
          <span>
            Movement sensing only turns on during a check you start.{" "}
            <Link href="/you/privacy" className="font-semibold text-forest underline underline-offset-4">
              Your privacy
            </Link>
          </span>
        </p>
      </aside>
    </div>
  );
}
