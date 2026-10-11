"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LastTime } from "@/components/check/LastTime";
import type { Trend } from "@/components/StartCheck";
import type { IconName } from "@/components/Icon";
import { Icon } from "@/components/Icon";
import { EmptyState, LargeChoice, PageIntro } from "@/components/kit";
import { WispLine } from "@/components/WispLine";
import { dayLabel } from "@/lib/tiers";
import type { Tier } from "@/lib/types";
import { useSession } from "@/lib/useSession";

// A one-line reminder of last time's outcome (the outcome itself comes from the backend).
const LAST: Record<Tier, string> = {
  T1: "WISP advised getting emergency help",
  T2: "WISP suggested being seen that day",
  T3: "WISP suggested booking your doctor",
  T4: "you were monitoring at home",
  ABSTAIN: "WISP suggested speaking with a professional",
};

const TRENDS: {
  trend: Trend;
  label: string;
  detail: string;
  icon: IconName;
  tone: "sage" | "dusty" | "sand" | "plain";
}[] = [
  {
    trend: "better",
    label: "Better",
    detail: "I'm improving",
    icon: "leaf",
    tone: "sage",
  },
  {
    trend: "same",
    label: "About the same",
    detail: "No real change",
    icon: "clock",
    tone: "dusty",
  },
  {
    trend: "worse",
    label: "Worse",
    detail: "I feel worse than before",
    icon: "heart",
    tone: "sand",
  },
  {
    trend: "new",
    label: "Something new happened",
    detail: "A different problem or symptom",
    icon: "plus",
    tone: "plain",
  },
];

export default function FollowUp() {
  const router = useRouter();
  const prevId = useSearchParams().get("prev") ?? undefined;
  const { snapshot: prev, error } = useSession(prevId);

  if (!prevId || (error && !prev)) {
    return <EmptyState scene="rest" title="We couldn't find your last check" body="You can start a new check-in from Today whenever you like." />;
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
      <PageIntro
        label={`Hello again${prev.profile ? `, ${prev.profile.display_name}` : ""}`}
        title="How are you feeling now?"
        lead={prev.disposition ? `${dayLabel(prev.case.created_at)} ${LAST[prev.disposition.tier]}.` : undefined}
      />
      <div className="mt-4">
        <LastTime prev={prev} />
      </div>

      <h2 className="sr-only">Compared with last time</h2>
      <ul className="mt-6 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
        {TRENDS.map((t) => (
          <li key={t.trend}>
            <LargeChoice
              role="button"
              icon={t.icon}
              label={t.label}
              detail={t.detail}
              tone={t.tone}
              onClick={() => router.push(`/follow-up/changes?prev=${prevId}&trend=${t.trend}`)}
            />
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center gap-3 rounded-w-md bg-red-bg px-4 py-3 text-[0.98rem] text-red-deep">
        <Icon name="phone" className="h-5 w-5" />
        <span>
          Feeling very unwell right now?{" "}
          <a href="tel:995" className="font-bold underline underline-offset-4">
            Call 995
          </a>
        </span>
      </p>
    </div>
  );
}
