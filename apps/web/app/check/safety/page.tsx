"use client";

import { useEffect, useRef, useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { Button, Disclosure } from "@/components/ui";
import { SAFETY_ORDER, currentTurn, pendingQuestion, safetyStep, useCheckFlow } from "@/lib/checkFlow";
import type { QuickReply } from "@/lib/types";

// Answer icons. Colours stay neutral so no answer looks like the "right" one.
const ICON: Record<string, string> = {
  yes: "M5 12.5l4.5 4.5L19 7.5",
  no: "M6 6l12 12M18 6L6 18",
  unsure: "M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2v.3M12 17.5v.5",
};

function AnswerButton({ r, icons, disabled, onClick }: { r: QuickReply; icons: boolean; disabled: boolean; onClick: () => void }) {
  const icon = icons ? ICON[r.value] : undefined;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 border-line bg-card px-5 text-left text-[1.2rem] font-bold text-ink transition-colors hover:border-forest/60 hover:bg-sage/40 disabled:opacity-60"
    >
      {icon && (
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </span>
      )}
      {r.label}
    </button>
  );
}

export default function Safety() {
  const f = useCheckFlow("safety");
  const s = f.snapshot;
  const q = s ? pendingQuestion(s) : null;
  const key = q?.data.question ?? "";
  const step = safetyStep(key);
  const total = SAFETY_ORDER.length;
  // What the agent said before its first question ("You said you've been feeling weaker…").
  const context = s && q ? currentTurn(s).filter((m) => m.id !== q.id) : [];
  const replies = q?.data.quick_replies ?? [];
  const icons = replies.every((r) => r.value in ICON);
  const [text, setText] = useState("");

  // Move focus to each new question so screen-reader users hear it.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [q?.id]);

  return (
    <CheckFrame stage="safety" loading={!f.ready || !s || !q} error={f.error}>
      <section aria-labelledby="safety-q">
        <p
          role="progressbar"
          aria-label="Safety questions"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          className="text-[0.95rem] font-bold text-ink-soft"
        >
          Question {step} of {total}
        </p>

        {context.length > 0 && (
          <div className="mt-4 rounded-2xl bg-sage px-4 py-3 text-[1rem] text-ink">
            {context.map((m) => (
              <p key={m.id}>{m.text}</p>
            ))}
          </div>
        )}

        <h1 id="safety-q" ref={heading} tabIndex={-1} className="mt-5 text-[1.9rem] font-bold leading-tight text-forest focus:outline-none">
          {q?.text}
        </h1>

        <div className="mt-6 flex flex-col gap-3">
          {replies.map((r) => (
            <AnswerButton key={r.value} r={r} icons={icons} disabled={f.sending} onClick={() => f.answer(r.label, r.value)} />
          ))}
        </div>
        {replies.some((r) => r.value === "unsure") && (
          <p className="mt-3 text-[0.95rem] text-ink-soft">If you&apos;re not sure, that&apos;s fine. WISP will play it safe.</p>
        )}

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            f.answer(text);
            setText("");
          }}
        >
          <Disclosure summary="Answer in your own words">
            <div className="flex gap-2">
              <label htmlFor="safety-text" className="sr-only">
                Your answer
              </label>
              <input
                id="safety-text"
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your answer…"
                className="min-h-14 min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 text-[1.05rem] placeholder:text-ink-faint"
              />
              <Button type="submit" size="lg" disabled={f.sending || !text.trim()}>
                Send
              </Button>
            </div>
          </Disclosure>
        </form>

        <p className="mt-8 rounded-2xl bg-red-bg px-4 py-3 text-[0.98rem] text-red">
          Feeling very unwell right now?{" "}
          <a href="tel:995" className="font-bold underline underline-offset-4">
            Call 995
          </a>
        </p>
      </section>
    </CheckFrame>
  );
}
