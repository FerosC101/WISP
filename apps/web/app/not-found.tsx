"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { WispLine } from "@/components/WispLine";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <WispLine variant="draw" className="mx-auto h-6 w-40 text-sage-mid" />
      <h1 className="mt-6 text-[2rem] leading-tight text-forest">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-ink-soft">The link may be old, or the check it pointed to may have been deleted.</p>
      <Link href="/today" className={buttonClass("primary", "lg", "mt-8 w-full")}>
        Go to Today
      </Link>
      <p className="mt-6 text-[0.95rem] text-ink-soft">
        Feeling very unwell? Call <a href="tel:995" className="font-semibold text-red-deep underline underline-offset-4">995</a>.
      </p>
    </div>
  );
}
