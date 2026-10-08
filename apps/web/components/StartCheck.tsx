"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { post } from "@/lib/api";
import { beginFlow, stagePath } from "@/lib/checkFlow";
import { type Lang, usePrefs } from "@/lib/prefs";
import type { Persona, Snapshot } from "@/lib/types";

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

export type Trend = "better" | "same" | "worse" | "new";

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
      const snap = await post<Snapshot>("/api/sessions", { user_id: me.user_id, agent: agentMode, language, text: firstWords.trim(), confirm_summary: true });
      beginFlow(snap.session_id);
      router.push(snap.agent === "workbuddy" ? `/session/${snap.session_id}` : stagePath("concern", snap.session_id));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  /** A scheduled check-in starts by asking how things compare with last time. */
  function startFollowUp(prev: string) {
    // WorkBuddy runs its own conversation, so it starts straight away.
    if (agentMode === "workbuddy") return startFollowUpWith(prev);
    router.push(`/follow-up?prev=${prev}`);
  }

  async function startFollowUpWith(prev: string, trend?: Trend, text?: string) {
    setBusy(true);
    try {
      const snap = await post<Snapshot>(`/api/sessions/${prev}/followup`, {
        agent: agentMode,
        language,
        confirm_summary: true,
        ...(agentMode === "local_agent" && trend ? { trend, text: text?.trim() || undefined } : {}),
      });
      beginFlow(snap.session_id);
      router.push(snap.agent === "workbuddy" ? `/session/${snap.session_id}` : stagePath("concern", snap.session_id));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return { start, startFollowUp, startFollowUpWith, busy, error, setError };
}

/** Speak or type how you feel. Voice input appears only where the browser supports it. */
export function DescribeBox({
  me,
  check,
  submitLabel = "Start check-in",
  placeholder = "Describe how you feel…",
}: {
  me: Persona | null;
  check: ReturnType<typeof useStartCheck>;
  submitLabel?: string;
  placeholder?: string;
}) {
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(text);
      }}
    >
      <div className="flex items-start gap-2 rounded-w-md border-[1.5px] border-line bg-card p-2 focus-within:border-forest/60">
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
          placeholder={listening ? "Listening…" : placeholder}
          className="min-h-[3.4rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-[1.06rem] placeholder:text-ink-faint focus:outline-none"
        />
        {speechOk && (
          <button
            type="button"
            onClick={speak}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Speak instead of typing"}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${listening ? "bg-red text-white" : "bg-sage text-forest hover:bg-sage-deep"}`}
          >
            <Icon name="mic" className="h-6 w-6" />
          </button>
        )}
      </div>
      {text.trim() && (
        <Button type="submit" size="lg" disabled={!me || busy} className="mt-3 w-full">
          {busy ? "Starting…" : submitLabel}
        </Button>
      )}
      {check.error && (
        <p role="alert" className="mt-3 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
          {check.error}
        </p>
      )}
    </form>
  );
}
