"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LastTime } from "@/components/check/LastTime";
import type { Trend } from "@/components/StartCheck";
import { WispLine } from "@/components/WispLine";
import { useSession } from "@/lib/useSession";

const TRENDS: { trend: Trend; label: string; detail: string; icon: string }[] = [
  { trend: "better", label: "Better", detail: "I'm improving", icon: "M12 19V5M5 12l7-7 7 7" },
  { trend: "same", label: "About the same", detail: "No real change", icon: "M5 12h14" },
  { trend: "worse", label: "Worse", detail: "I feel worse than before", icon: "M12 5v14M5 12l7 7 7-7" },
  { trend: "new", label: "Something new", detail: "A different problem or symptom", icon: "M12 5v14M5 12h14" },
];

export default function FollowUp() {
  const router = useRouter();
  const prevId = useSearchParams().get("prev") ?? undefined;
  const { snapshot: prev, error } = useSession(prevId);

  if (!prevId || (error && !prev)) {
    return <p className="py-12 text-center text-ink-soft">We couldn&apos;t find your last check.</p>;
  }
  if (!prev) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-teal">Check-in</p>
      <h1 className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">
        Hello again{prev.profile ? `, ${prev.profile.display_name}` : ""}
      </h1>
      <div className="mt-4">
        <LastTime prev={prev} />
      </div>

      <h2 className="mt-6 text-[1.3rem] font-bold">Compared with last time, how are you?</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {TRENDS.map((t) => (
          <li key={t.trend}>
            <button
              type="button"
              onClick={() => router.push(`/follow-up/changes?prev=${prevId}&trend=${t.trend}`)}
              className="flex h-full min-h-28 w-full flex-col items-start justify-between gap-2 rounded-(--radius-card) border-2 border-line bg-card p-4 text-left hover:border-forest/50 hover:bg-sage/40"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-teal" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={t.icon} />
              </svg>
              <span>
                <span className="block text-[1.1rem] font-bold">{t.label}</span>
                <span className="block text-[0.9rem] text-ink-soft">{t.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-6 rounded-2xl bg-red-bg px-4 py-3 text-[0.98rem] text-red">
        Feeling very unwell right now?{" "}
        <a href="tel:995" className="font-bold underline underline-offset-4">
          Call 995
        </a>
      </p>
    </div>
  );
}
