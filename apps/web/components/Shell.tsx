"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePrefs, usePrefsHydrated } from "@/lib/prefs";
import type { Persona } from "@/lib/types";
import { Icon, type IconName } from "./Icon";
import { WispLogo } from "./WispLine";

// Five primary patient sections. `match` lists the route prefixes each tab owns.
const NAV: { href: string; label: string; match: string[]; icon: IconName }[] = [
  { href: "/today", label: "Today", match: ["/today"], icon: "today" },
  { href: "/check/start", label: "Check", match: ["/check", "/session", "/follow-up"], icon: "check" },
  { href: "/care", label: "Care", match: ["/care", "/caregiver"], icon: "care" },
  { href: "/history", label: "History", match: ["/history"], icon: "history" },
  { href: "/you", label: "You", match: ["/you", "/baseline", "/privacy"], icon: "you" },
];

// Pages laid out as wide editorial compositions on desktop.
const WIDE = ["/today"];


function DemoBar() {
  const { userId, setUserId } = usePrefs();
  const pathname = usePathname();
  const [personas, setPersonas] = useState<Persona[]>([]);
  useEffect(() => {
    api<Persona[]>("/api/personas").then(setPersonas).catch(() => setPersonas([]));
  }, []);
  // The check on screen, wherever the patient is: /session/:id, /history/:id, /explain/:id, or ?s= / ?prev=.
  // Safe to read window here: the demo bar only renders on the client after hydration.
  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const sessionId = pathname.match(/^\/(?:session|history|explain)\/(s_[^/]+)/)?.[1] ?? query?.get("s") ?? query?.get("prev") ?? undefined;
  return (
    <div className="bg-forest-deep text-white print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[0.78rem]">
        <span className="font-mono font-bold tracking-wider">DEMO MODE</span>
        <label className="flex items-center gap-1.5">
          <span className="opacity-80">Profile</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded bg-white/15 px-1.5 py-0.5 text-white">
            {personas.map((p) => (
              <option key={p.user_id} value={p.user_id} className="text-ink">
                {p.display_name}
              </option>
            ))}
          </select>
        </label>
        <Link href={sessionId ? `/explain/${sessionId}` : "/explain"} className="underline underline-offset-2">
          Technical view{sessionId ? " (this check)" : ""}
        </Link>
        <Link href="/dev" className="underline underline-offset-2">
          Engineering view
        </Link>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { largeText, setLargeText, reduceMotion, devMode } = usePrefs();
  const pathname = usePathname();
  const hydrated = usePrefsHydrated();
  const technical = pathname.startsWith("/dev") || pathname.startsWith("/explain");

  useEffect(() => {
    document.documentElement.dataset.large = String(largeText);
  }, [largeText]);
  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion ? "reduce" : "full";
  }, [reduceMotion]);

  const isActive = (match: string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to main content
      </a>
      {hydrated && devMode && <DemoBar />}
      <header className="print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6">
          <Link href="/today" aria-label="WISP home" className="rounded-w-sm no-underline">
            <WispLogo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.match) ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-w-md px-3.5 text-[0.98rem] transition-colors ${
                  isActive(n.match) ? "bg-sage font-semibold text-forest" : "text-ink-soft hover:bg-sage/60 hover:text-ink"
                }`}
              >
                <Icon name={n.icon} className="h-5 w-5" />
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setLargeText(!largeText)}
            aria-pressed={hydrated ? largeText : false}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-w-md border-[1.5px] border-line bg-card px-3.5 text-[0.92rem] font-medium text-ink hover:border-forest/40"
          >
            <Icon name="textsize" className="h-5 w-5 text-forest" />
            Text size
          </button>
        </div>
      </header>

      <main id="main" className={`mx-auto w-full flex-1 px-4 pb-[calc(6rem+var(--sticky-h,0px)+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:pb-12 ${technical ? "max-w-6xl" : WIDE.includes(pathname) ? "max-w-5xl" : "max-w-3xl"}`}>
        {children}
      </main>

      <footer className="hidden border-t border-line px-4 py-6 text-center text-[0.92rem] text-ink-faint print:hidden md:block">
        WISP gives care-navigation guidance, not a diagnosis. In an emergency, call <strong className="text-ink">995</strong>.
      </footer>

      {/* Mobile: a screen's primary actions (StickyActions) sit just above the bottom navigation. */}
      <div className="fixed inset-x-0 bottom-0 z-40 print:hidden md:hidden">
      <div id="sticky-actions" />
      <nav aria-label="Main" className="border-t border-line bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => {
            const active = isActive(n.match);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 text-[0.86rem] ${active ? "font-semibold text-forest" : "text-ink-soft"}`}
                >
                  <span aria-hidden className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active ? "bg-sage" : ""}`}>
                    <Icon name={n.icon} className="h-[1.4rem] w-[1.4rem]" strokeWidth={active ? 2 : 1.7} />
                  </span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>
    </div>
  );
}
