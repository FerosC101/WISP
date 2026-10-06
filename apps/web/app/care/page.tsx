"use client";

import Link from "next/link";
import { RecentRecommendationCard } from "@/components/CareCards";
import { Card } from "@/components/ui";
import { useMe } from "@/lib/useMe";

export default function Care() {
  const { recent, error } = useMe();

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Care</p>
      <h1 className="mt-1 text-[2rem] font-bold leading-[1.15] text-forest">Your care</h1>

      <div className="mt-6 space-y-3">
        {recent ? (
          <RecentRecommendationCard item={recent} />
        ) : (
          <Card>
            <p className="font-bold">No recommendation yet</p>
            <p className="mt-1 text-ink-soft">After a check, your next step and where to go will appear here.</p>
            <Link href="/check/start" className="mt-3 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4">
              Start a check
            </Link>
          </Card>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-amber-bg px-4 py-3 text-amber">
            {error}
          </p>
        )}
      </div>

      <p className="mt-8 rounded-(--radius-card) bg-red-bg px-5 py-4 text-red">
        In an emergency, call <strong>995</strong>.
      </p>
    </div>
  );
}
