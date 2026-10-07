"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NextCheckCard, RecentRecommendationCard } from "@/components/CareCards";
import { useStartCheck } from "@/components/StartCheck";
import { Eyebrow } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { api } from "@/lib/api";
import { dayLabel, greeting } from "@/lib/tiers";
import { useMe } from "@/lib/useMe";

// Each card starts a check with the patient's own words, exactly as if they had typed them.
const SYMPTOMS = [
  { words: "I feel weak", label: "Weaker than usual", icon: "M3 8h15v8H3zM21 11v2M6 11v2" },
  { words: "I feel dizzy", label: "Dizzy", icon: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1" },
  { words: "I'm unusually tired", label: "Unusually tired", icon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" },
  { words: "Something feels off", label: "Something feels off", icon: "M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" },
];

interface BaselineResp {
  baseline: { sessions: { date: string }[]; last_updated?: string } | null;
  required_sessions: number;
}

function BaselineStatus({ userId }: { userId: string }) {
  const [data, setData] = useState<BaselineResp | null>(null);
  useEffect(() => {
    api<BaselineResp>(`/api/baselines/${userId}`)
      .then(setData)
      .catch(() => setData(null));
  }, [userId]);
  if (!data) return null;

  const have = data.baseline?.sessions.length ?? 0;
  const need = data.required_sessions;
  const ready = have >= need;
  const last = data.baseline?.sessions.at(-1)?.date;

  return (
    <Link href="/you/baseline" className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40">
      <div className="min-w-0">
        <Eyebrow>My usual</Eyebrow>
        <p className="mt-1 flex items-center gap-2 text-[1.1rem] font-bold">
          <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${ready ? "bg-forest" : "bg-amber"}`} />
          {ready ? "Ready to compare" : have === 0 ? "Not set up yet" : `${have} of ${need} healthy-day checks`}
        </p>
        <p className="text-[0.95rem] text-ink-soft">
          {ready
            ? `Based on ${have} healthy-day checks${last ? ` · updated ${dayLabel(last) === "Today" ? "today" : dayLabel(last)}` : ""}`
            : "WISP needs your usual to compare a movement check against"}
        </p>
      </div>
      <span aria-hidden className="text-2xl text-ink-faint">›</span>
    </Link>
  );
}

export default function Today() {
  const { me, recent, error } = useMe();
  const check = useStartCheck(me);
  const recheck = me?.rechecks[0];

  return (
    <div className="mx-auto max-w-xl">
      <section aria-labelledby="hello" className="pt-2 sm:pt-8">
        <p className="text-[1.05rem] text-ink-soft">{me ? `${greeting()}, ${me.display_name}.` : `${greeting()}.`}</p>
        <h1 id="hello" className="mt-1 text-[2.2rem] font-bold leading-[1.15] text-forest sm:text-[2.8rem]">
          How are you today?
        </h1>
        <WispLine className="mt-3 h-4 w-40 text-teal" variant="draw" />
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      )}

      {recheck && (
        <section aria-label="Scheduled check" className="mt-6">
          <NextCheckCard recheck={recheck} busy={check.busy} onStart={() => check.startFollowUp(recheck.session_id)} />
        </section>
      )}

      <section aria-labelledby="symptoms-title" className="mt-6">
        <Link
          href="/check/start"
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-forest px-7 text-[1.08rem] font-bold text-white hover:bg-forest-deep"
        >
          {check.busy ? "Starting…" : "Start a new check-in"}
        </Link>
        <h2 id="symptoms-title" className="mt-5 text-[1.1rem] font-bold">
          Or tap what&apos;s different today
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {SYMPTOMS.map((s) => (
            <li key={s.words}>
              <button
                type="button"
                disabled={!me || check.busy}
                onClick={() => check.start(s.words)}
                className="flex h-full min-h-28 w-full flex-col items-start justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-4 text-left text-[1.05rem] font-bold text-ink hover:border-forest/50 hover:bg-sage/40 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-teal" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={s.icon} />
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
        {check.error && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-bg px-4 py-3 text-amber">
            {check.error}
          </p>
        )}
      </section>

      <section aria-label="Your care" className="mt-8 space-y-3">
        {recent && <RecentRecommendationCard item={recent} />}
        {me && <BaselineStatus userId={me.user_id} />}
      </section>
    </div>
  );
}
