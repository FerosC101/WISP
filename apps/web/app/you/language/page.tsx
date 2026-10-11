"use client";

import { YouPage } from "@/components/you/YouPage";
import { LANGUAGE_NAMES, type Lang, usePrefs } from "@/lib/prefs";

export default function Language() {
  const { language, setLanguage } = usePrefs();
  return (
    <YouPage title="Language" intro="WISP asks its safety questions in this language.">
      <div role="radiogroup" aria-label="Language" className="space-y-2.5">
        {(Object.keys(LANGUAGE_NAMES) as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={language === l}
            onClick={() => setLanguage(l)}
            className={`flex min-h-16 w-full items-center justify-between rounded-w-md border-2 px-5 text-left text-[1.15rem] font-bold ${language === l ? "border-forest bg-sage" : "border-line bg-card"}`}
          >
            {LANGUAGE_NAMES[l]}
            {language === l && <span aria-hidden className="text-forest">✓</span>}
          </button>
        ))}
      </div>
      <p className="mt-5 rounded-w-md bg-amber-bg px-4 py-3 text-[0.95rem]">
        The Mandarin, Malay and Tamil wording is still being checked by native speakers. If anything is unclear, choose English or ask someone to help.
      </p>
      <p className="mt-3 text-[0.95rem] text-ink-soft">The rest of the app is in English for now. Your choice applies to new checks.</p>
    </YouPage>
  );
}
