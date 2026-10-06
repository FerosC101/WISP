"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WispLine } from "@/components/WispLine";
import { careHref } from "@/lib/care";
import type { Snapshot } from "@/lib/types";

const SECTIONS = [
  { path: "/care/recommendation", label: "Recommendation" },
  { path: "/care/plan", label: "Care plan" },
  { path: "/care/find", label: "Find care" },
  { path: "/care/visit-summary", label: "Visit summary" },
  { path: "/care/share", label: "Share" },
];

/** Frame for a Care page: back to the Care hub, section tabs, loading and empty states. */
export function CareShell({
  sid,
  snapshot,
  none,
  error,
  children,
}: {
  sid: string | undefined;
  snapshot: Snapshot | null;
  none: boolean;
  error?: string | null;
  children: (s: Snapshot) => ReactNode;
}) {
  const pathname = usePathname();
  if (none) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="text-[1.2rem] font-bold">No recommendation yet</p>
        <p className="mt-1 text-ink-soft">After a check, your next step and where to go will appear here.</p>
        <Link href="/check/start" className="mt-4 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4">
          Start a check
        </Link>
      </div>
    );
  }
  if (error && !snapshot) return <p className="py-12 text-center text-ink-soft">We couldn&apos;t open this check.</p>;
  if (!snapshot || !snapshot.disposition) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl">
      <Link href={careHref("/care", sid)} className="inline-flex min-h-11 items-center font-bold text-forest">
        ‹ Your care
      </Link>
      <nav aria-label="Care sections" className="-mx-4 mb-5 mt-1 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {SECTIONS.map((x) => {
            const active = pathname === x.path;
            return (
              <li key={x.path}>
                <Link
                  href={careHref(x.path, sid)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-[0.92rem] font-bold ${active ? "bg-forest text-white" : "border border-line bg-card text-ink-soft"}`}
                >
                  {x.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children(snapshot)}
    </div>
  );
}
