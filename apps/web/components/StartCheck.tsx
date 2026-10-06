"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { post } from "@/lib/api";
import { type Lang, usePrefs } from "@/lib/prefs";
import type { Persona, Snapshot } from "@/lib/types";

const PROMPTS = ["I feel weak", "I feel dizzy", "I'm unusually tired", "Something feels off"];
const SPEECH_LANG: Record<Lang, string> = { en: "en-SG", zh: "zh-CN", ms: "ms-MY", ta: "ta-IN" };

// Minimal typing for the browser speech API (not in the standard DOM lib).
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

function speechCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Hook shared by every entry point that starts a check or a scheduled follow-up. */
export function useStartCheck(me: Persona | null) {
  const router = useRouter();
  const { agentMode, language } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(firstWords: string) {
    if (!me || !firstWords.trim()) return;
    setBusy(true);
    try {
      const snap = await post<Snapshot>("/api/sessions", { user_id: me.user_id, agent: agentMode, language, text: firstWords.trim() });
      router.push(`/session/${snap.session_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function startFollowUp(prev: string) {
    setBusy(true);
    try {
      const snap = await post<Snapshot>(`/api/sessions/${prev}/followup`, { agent: agentMode, language });
      router.push(`/session/${snap.session_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return { start, startFollowUp, busy, error, setError };
}

/** Free-text / voice entry with quick-start cards. */
export function StartCheck({ me, check }: { me: Persona | null; check: ReturnType<typeof useStartCheck> }) {
  const { language } = usePrefs();
  const { start, busy } = check;
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    // Feature-detect voice input after mount (not available during server render).
    const id = setTimeout(() => setSpeechOk(speechCtor() !== null), 0);
    return () => clearTimeout(id);
  }, []);

  function speak() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[language];
    rec.interimResults = true;
    rec.onresult = (e) => setText(Array.from(e.results, (r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <>
      <form
        className="mt-6 rounded-[1.75rem] border border-line bg-card p-3 shadow-[0_1px_0_rgba(27,37,64,0.04)]"
        onSubmit={(e) => {
          e.preventDefault();
          start(text);
        }}
      >
        <label htmlFor="feel" className="sr-only">
          Tell WISP how you feel
        </label>
        <textarea
          id="feel"
          rows={2}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              start(text);
            }
          }}
          placeholder="Tell WISP how you feel…"
          className="w-full resize-none rounded-2xl bg-transparent px-3 py-2 text-[1.1rem] placeholder:text-ink-faint focus:outline-none"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {speechOk && (
            <Button type="button" variant={listening ? "danger" : "soft"} size="lg" onClick={speak} aria-pressed={listening} className="sm:flex-1">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              {listening ? "Listening… tap to stop" : "Speak"}
            </Button>
          )}
          <Button type="submit" size="lg" disabled={!me || busy || !text.trim()} className="sm:flex-1">
            {busy ? "Starting…" : "Continue"}
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick starts">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={!me || busy}
            onClick={() => start(p)}
            className="min-h-11 rounded-full border border-line bg-card px-4 text-[0.98rem] text-ink hover:border-forest/50 hover:bg-sage/50"
          >
            {p}
          </button>
        ))}
      </div>

      {check.error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {check.error}
        </p>
      )}
    </>
  );
}
