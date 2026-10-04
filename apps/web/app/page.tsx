"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { api, post } from "@/lib/api";
import { LANGUAGE_NAMES, type Lang, usePrefs } from "@/lib/prefs";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel, greeting, timeLabel } from "@/lib/tiers";
import type { HistoryItem, Persona, Snapshot } from "@/lib/types";

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

export default function Home() {
  const router = useRouter();
  const { userId, agentMode, language, setLanguage } = usePrefs();
  const [me, setMe] = useState<Persona | null>(null);
  const [recent, setRecent] = useState<HistoryItem | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    api<Persona[]>("/api/personas")
      .then((ps) => setMe(ps.find((p) => p.user_id === userId) ?? ps[0] ?? null))
      .catch(() => setError("WISP can't reach its local service right now."));
    api<HistoryItem[]>(`/api/history?user_id=${userId}`)
      .then((h) => setRecent(h.find((x) => x.tier) ?? null))
      .catch(() => setRecent(null));
    // Feature-detect voice input after mount (not available during server render).
    const id = setTimeout(() => setSpeechOk(speechCtor() !== null), 0);
    return () => clearTimeout(id);
  }, [userId]);

  const recheck = me?.rechecks[0];

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
    const snap = await post<Snapshot>(`/api/sessions/${prev}/followup`, { agent: agentMode, language });
    router.push(`/session/${snap.session_id}`);
  }

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
    <div className="mx-auto max-w-xl">
      <section aria-labelledby="hello" className="pt-2 sm:pt-8">
        <p className="text-[1.05rem] text-ink-soft">{me ? `${greeting()}, ${me.display_name}.` : `${greeting()}.`}</p>
        <h1 id="hello" className="mt-1 text-[2.2rem] font-bold leading-[1.15] text-forest sm:text-[2.8rem]">
          How are you feeling today?
        </h1>
        <WispLine className="mt-3 h-4 w-40 text-teal" variant="draw" />

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

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
            {error}
          </p>
        )}
      </section>

      <section aria-label="Your care" className="mt-8 space-y-3">
        {recheck && (
          <div className="flex flex-col gap-3 rounded-(--radius-card) bg-sage p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-forest">Next check</p>
              <p className="mt-0.5 text-[1.1rem] font-bold">
                {dayLabel(recheck.due_at)} · {timeLabel(recheck.due_at)}
              </p>
            </div>
            <Button onClick={() => startFollowUp(recheck.session_id)} disabled={busy}>
              Start check-in
            </Button>
          </div>
        )}
        {recent?.tier && (
          <Link href={`/session/${recent.session_id}`} className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Recent recommendation · {dayLabel(recent.created_at)}</p>
              <p className="mt-1 flex items-center gap-2 text-[1.1rem] font-bold">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${TIER_STYLE[recent.tier].dot}`} />
                {PATIENT_OUTCOME[recent.tier]}
              </p>
            </div>
            <span aria-hidden className="text-2xl text-ink-faint">›</span>
          </Link>
        )}
      </section>

      <section className="mt-8 space-y-3 text-[0.92rem] text-ink-soft">
        <p className="flex items-start gap-2">
          <span aria-hidden className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-teal" />
          <span>
            WISP only uses physical sensing during a check you start.{" "}
            <Link href="/privacy" className="font-bold text-forest underline underline-offset-4">
              Privacy
            </Link>
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Language for safety questions">
          <span>Questions in:</span>
          {(Object.keys(LANGUAGE_NAMES) as Lang[]).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={language === l}
              onClick={() => setLanguage(l)}
              className={`min-h-9 rounded-full px-3 ${language === l ? "bg-forest text-white" : "border border-line bg-card text-ink"}`}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
