"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { Persona } from "@/lib/types";
import { WispLogo } from "./WispLine";

// Five primary patient sections. `match` lists the route prefixes each tab owns.
const NAV = [
  { href: "/today", label: "Today", match: ["/today"], icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/check/start", label: "Check", match: ["/check", "/session"], icon: "M9 12l2 2 4-4M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" },
  { href: "/care", label: "Care", match: ["/care", "/caregiver"], icon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" },
  { href: "/history", label: "History", match: ["/history"], icon: "M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" },
  { href: "/you", label: "You", match: ["/you", "/baseline", "/privacy"], icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

function useHydrated() {
  return useSyncExternalStore(
    (cb) => usePrefs.persist.onFinishHydration(cb),
    () => usePrefs.persist.hasHydrated(),
    () => false,
  );
}

function DemoBar() {
  const { userId, setUserId } = usePrefs();
  const pathname = usePathname();
  const [personas, setPersonas] = useState<Persona[]>([]);
  useEffect(() => {
    api<Persona[]>("/api/personas").then(setPersonas).catch(() => setPersonas([]));
  }, []);
  const sessionId = pathname.match(/^\/session\/([^/]+)/)?.[1];
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
  const { largeText, setLargeText, devMode } = usePrefs();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const technical = pathname.startsWith("/dev") || pathname.startsWith("/explain");

  useEffect(() => {
    document.documentElement.dataset.large = String(largeText);
  }, [largeText]);

  const isActive = (match: string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to main content
      </a>
      {hydrated && devMode && <DemoBar />}
      <header className="border-b border-line/70 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/today" aria-label="WISP home" className="no-underline">
            <WispLogo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.match) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-[0.95rem] ${isActive(n.match) ? "bg-forest text-white" : "text-ink-soft hover:bg-sage"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setLargeText(!largeText)}
            aria-pressed={hydrated ? largeText : false}
            className="min-h-11 rounded-full border border-line bg-card px-4 text-[0.9rem] text-ink hover:border-ink-faint"
          >
            <span aria-hidden className="mr-1 font-bold">
              A<span className="text-[1.25em]">A</span>
            </span>
            Text size
          </button>
        </div>
      </header>

      <main id="main" className={`mx-auto w-full flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 ${technical ? "max-w-6xl" : "max-w-3xl"}`}>
        {children}
      </main>

      <footer className="hidden print:hidden border-t border-line px-4 py-5 text-center text-sm text-ink-faint md:block">
        WISP helps you decide what to do next. It does not diagnose. In an emergency, call <strong className="text-ink">995</strong>.
      </footer>

      {/* Mobile: bottom navigation with large touch targets */}
      <nav aria-label="Main" className="print:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={isActive(n.match) ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-bold ${isActive(n.match) ? "text-forest" : "text-ink-faint"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={n.icon} />
                </svg>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
