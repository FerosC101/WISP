"use client";

import { useEffect, useState } from "react";
import { YouPage } from "@/components/you/YouPage";
import { usePrefs } from "@/lib/prefs";

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4">
      <span>
        <span className="block text-[1.1rem] font-bold">{label}</span>
        <span className="block text-[0.92rem] text-ink-soft">{detail}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-7 w-7 shrink-0 accent-forest" />
    </label>
  );
}

export default function Accessibility() {
  const { largeText, setLargeText, reduceMotion, setReduceMotion } = usePrefs();
  const [voice, setVoice] = useState<boolean | null>(null);
  useEffect(() => {
    // Feature-detect after mount (not available during server render).
    const id = setTimeout(() => {
      const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
      setVoice(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <YouPage title="Accessibility" intro="Make WISP easier to read and use.">
      <div className="space-y-3">
        <Toggle label="Larger text" detail="Makes all text in WISP bigger." checked={largeText} onChange={setLargeText} />
        <Toggle label="Less motion" detail="Turns off moving lines and animations." checked={reduceMotion} onChange={setReduceMotion} />
      </div>
      <div className="mt-5 rounded-2xl bg-sage px-5 py-4">
        <p className="font-bold">Speaking instead of typing</p>
        <p className="mt-1 text-[0.95rem]">
          {voice === null
            ? "Checking…"
            : voice
              ? "Available. Tap “Speak” when you start a check."
              : "This browser doesn't support voice input. You can still tap the answers."}
        </p>
      </div>
    </YouPage>
  );
}
