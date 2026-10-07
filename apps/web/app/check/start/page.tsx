"use client";

import { NextCheckCard } from "@/components/CareCards";
import { StartCheck, useStartCheck } from "@/components/StartCheck";
import { useMe } from "@/lib/useMe";

export default function Check() {
  const { me, error } = useMe();
  const check = useStartCheck(me);
  const recheck = me?.rechecks[0];

  return (
    <div className="mx-auto max-w-xl">
      <section aria-labelledby="check-title" className="pt-2 sm:pt-8">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">New check</p>
        <h1 id="check-title" className="mt-1 text-[2rem] font-bold leading-[1.15] text-forest">
          What&apos;s different today?
        </h1>
        <p className="mt-2 text-ink-soft">WISP will ask a few safety questions, then tell you what to do next and why.</p>
        <StartCheck me={me} check={check} />
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
            {error}
          </p>
        )}
      </section>

      {recheck && (
        <section aria-label="Scheduled check" className="mt-8">
          <NextCheckCard recheck={recheck} busy={check.busy} onStart={() => check.startFollowUp(recheck.session_id)} />
        </section>
      )}
    </div>
  );
}
