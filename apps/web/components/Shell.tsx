"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { usePrefs } from "@/lib/prefs";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/history", label: "Previous checks" },
  { href: "/baseline", label: "My usual" },
  { href: "/privacy", label: "Privacy" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { largeText, setLargeText, devMode } = usePrefs();
  const pathname = usePathname();
  // Preferences live in localStorage; render defaults until they have loaded.
  const hydrated = useSyncExternalStore(
    (cb) => usePrefs.persist.onFinishHydration(cb),
    () => usePrefs.persist.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    document.documentElement.dataset.large = String(largeText);
  }, [largeText]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to main content
      </a>
      <header className="border-b border-line bg-paper/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2 no-underline" aria-label="WISP home">
            <span className="text-2xl font-bold tracking-[0.18em] text-navy">WISP</span>
            <span className="hidden text-sm text-ink-faint md:inline">self-triage &amp; care navigation</span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-2 text-[0.9rem] ${active ? "bg-navy text-white" : "text-ink-soft hover:bg-grey-bg"}`}
                >
                  {n.label}
                </Link>
              );
            })}
            {hydrated && devMode && (
              <Link
                href="/dev"
                className={`rounded-full px-3 py-2 text-[0.9rem] font-mono ${pathname.startsWith("/dev") ? "bg-ink text-white" : "text-ink-soft hover:bg-grey-bg"}`}
              >
                Dev
              </Link>
            )}
            <button
              type="button"
              onClick={() => setLargeText(!largeText)}
              aria-pressed={hydrated ? largeText : false}
              className="ml-1 rounded-full border border-line bg-card px-3 py-2 text-[0.9rem] text-ink hover:border-ink-soft"
            >
              <span aria-hidden className="mr-1 font-bold">
                A<span className="text-[1.2em]">A</span>
              </span>
              Larger text
            </button>
          </nav>
        </div>
        {hydrated && devMode && (
          <div className="bg-ink px-4 py-1 text-center font-mono text-xs tracking-wider text-white">DEMO MODE — developer tools enabled</div>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-line px-4 py-4 text-center text-sm text-ink-faint">
        WISP gives care-navigation advice, not a diagnosis. In an emergency, call <strong className="text-ink">995</strong>.
      </footer>
    </div>
  );
}
