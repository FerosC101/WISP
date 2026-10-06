"use client";

import { NextCheckCard, RecentRecommendationCard } from "@/components/CareCards";
import { StartCheck, useStartCheck } from "@/components/StartCheck";
import { WispLine } from "@/components/WispLine";
import { greeting } from "@/lib/tiers";
import { useMe } from "@/lib/useMe";

export default function Today() {
  const { me, recent, error } = useMe();
  const check = useStartCheck(me);
  const recheck = me?.rechecks[0];

  return (
    <div className="mx-auto max-w-xl">
      <section aria-labelledby="hello" className="pt-2 sm:pt-8">
        <p className="text-[1.05rem] text-ink-soft">{me ? `${greeting()}, ${me.display_name}.` : `${greeting()}.`}</p>
        <h1 id="hello" className="mt-1 text-[2.2rem] font-bold leading-[1.15] text-forest sm:text-[2.8rem]">
          How are you feeling today?
        </h1>
        <WispLine className="mt-3 h-4 w-40 text-teal" variant="draw" />
        <StartCheck me={me} check={check} />
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
            {error}
          </p>
        )}
      </section>

      <section aria-label="Your care" className="mt-8 space-y-3">
        {recheck && <NextCheckCard recheck={recheck} busy={check.busy} onStart={() => check.startFollowUp(recheck.session_id)} />}
        {recent && <RecentRecommendationCard item={recent} />}
      </section>
    </div>
  );
}
