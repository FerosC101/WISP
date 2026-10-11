import Link from "next/link";
import { Icon } from "@/components/Icon";
import { WispLine } from "@/components/WispLine";
import type { ReactNode } from "react";

/** Layout for a You sub-page: back to You, a title, and an optional intro. */
export function YouPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <Link href="/you" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-semibold text-forest print:hidden">
        <Icon name="chevron-left" className="h-5 w-5" />
        You
      </Link>
      <h1 className="mt-1 text-[2rem] leading-tight text-forest sm:text-[2.3rem]">{title}</h1>
      <WispLine variant="draw" className="mt-3 h-4 w-28 text-sage-mid" />
      {intro && <p className="mt-3 text-[1.06rem] text-ink-soft">{intro}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-[0.92rem] text-ink-soft">{label}</dt>
      <dd className="text-[1.08rem] font-semibold">{value}</dd>
    </div>
  );
}
