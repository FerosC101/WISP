"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { LANGUAGE_NAMES, type Lang, usePrefs } from "@/lib/prefs";
import { useMe } from "@/lib/useMe";

const LINKS = [
  { href: "/you/baseline", title: "My usual", detail: "Your healthy-day movement checks, used for comparison" },
  { href: "/privacy", title: "Privacy", detail: "What WISP keeps, what it shares, and deleting your data" },
];

export default function You() {
  const { me, error } = useMe();
  const { language, setLanguage, largeText, setLargeText } = usePrefs();

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">You</p>
      <h1 className="mt-1 text-[2rem] font-bold leading-[1.15] text-forest">{me?.display_name ?? "Your profile"}</h1>
      {me && (
        <p className="mt-1 text-ink-soft">
          {me.age} · {me.lives_alone ? "Lives alone" : "Lives with others"}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      )}

      <nav aria-label="Your settings" className="mt-6 space-y-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40">
            <div>
              <p className="text-[1.1rem] font-bold">{l.title}</p>
              <p className="text-[0.95rem] text-ink-soft">{l.detail}</p>
            </div>
            <span aria-hidden className="text-2xl text-ink-faint">›</span>
          </Link>
        ))}
      </nav>

      <Card className="mt-3" aria-labelledby="lang-title">
        <h2 id="lang-title" className="text-[1.1rem] font-bold">
          Language
        </h2>
        <p className="text-[0.95rem] text-ink-soft">Used for the safety questions.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="lang-title">
          {(Object.keys(LANGUAGE_NAMES) as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={language === l}
              onClick={() => setLanguage(l)}
              className={`min-h-11 rounded-full px-4 ${language === l ? "bg-forest text-white" : "border border-line bg-card text-ink"}`}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-3" aria-labelledby="a11y-title">
        <h2 id="a11y-title" className="text-[1.1rem] font-bold">
          Accessibility
        </h2>
        <label className="mt-2 flex min-h-11 items-center justify-between gap-3">
          <span>Larger text</span>
          <input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} className="h-6 w-6 accent-forest" />
        </label>
      </Card>
    </div>
  );
}
