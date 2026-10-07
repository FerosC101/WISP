import Link from "next/link";
import type { ReactNode } from "react";

/** Layout for a You sub-page: back to You, a title, and an optional intro. */
export function YouPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <Link href="/you" className="inline-flex min-h-11 items-center font-bold text-forest print:hidden">
        ‹ You
      </Link>
      <h1 className="mt-1 text-[2rem] font-bold leading-tight text-forest">{title}</h1>
      {intro && <p className="mt-1 text-ink-soft">{intro}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-[0.85rem] text-ink-soft">{label}</dt>
      <dd className="text-[1.08rem] font-bold">{value}</dd>
    </div>
  );
}
