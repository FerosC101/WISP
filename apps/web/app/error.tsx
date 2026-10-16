"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClass } from "@/components/ui";
import { WispLine } from "@/components/WispLine";

// Error boundary for every screen: say what happened plainly, offer a retry, and keep 995 visible.
export default function ScreenError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <WispLine variant="static" className="mx-auto h-6 w-40 text-sage-mid" />
      <h1 className="mt-6 text-[2rem] leading-tight text-forest">Something went wrong on this screen</h1>
      <p className="mt-3 text-ink-soft">Your check-ins are still saved. Please try again.</p>
      <Button size="lg" className="mt-8 w-full" onClick={retry}>
        Try again
      </Button>
      <Link href="/today" className={buttonClass("ghost", "md", "mt-2 w-full")}>
        Go to Today
      </Link>
      <p className="mt-6 text-[0.95rem] text-ink-soft">
        Feeling very unwell? Call <a href="tel:995" className="font-semibold text-red-deep underline underline-offset-4">995</a>.
      </p>
    </div>
  );
}
