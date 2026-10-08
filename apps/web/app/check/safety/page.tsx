"use client";

import { useEffect, useRef, useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { Icon } from "@/components/Icon";
import { Illustration } from "@/components/Illustration";
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
      className="flex min-h-[4.25rem] w-full items-center gap-4 rounded-w-md border-[1.5px] border-line bg-card px-5 text-left text-[1.2rem] font-semibold text-ink shadow-(--shadow-soft) transition-colors duration-200 hover:border-forest/50 hover:bg-sage/40 disabled:opacity-60"
    >
      {icon && (
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
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
        {step === 1 && (
          <div className="mb-6 flex items-center gap-4 rounded-w-lg bg-sage/70 p-3 pr-4">
            <Illustration scene="calm" decorative className="w-28 shrink-0 rounded-w-md" />
            <div>
              <p className="font-serif text-[1.3rem] font-semibold leading-tight text-forest">Let&apos;s do a quick safety check.</p>
              <p className="mt-1 text-[0.98rem] text-ink-soft">I need to check a few important things before we continue.</p>
            </div>
          </div>
        )}

        <div
          role="progressbar"
          aria-label="Safety questions"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          aria-valuetext={`Question ${step} of ${total}`}
          className="flex items-center gap-3"
        >
          <span aria-hidden className="flex flex-1 items-center">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className="flex flex-1 items-center last:flex-none">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i < step ? "bg-forest" : "border-[1.5px] border-sage-deep bg-ivory"}`} />
                {i < total - 1 && <span className={`h-[2px] flex-1 ${i < step - 1 ? "bg-forest" : "bg-sage-deep"}`} />}
              </span>
            ))}
          </span>
          <span className="shrink-0 text-[0.95rem] font-medium text-ink-soft">
            Question {step} of {total}
          </span>
        </div>

        {context.length > 0 && step === 1 && (
          <div className="mt-5 rounded-w-md border-l-4 border-sage-mid bg-card px-4 py-3 text-[1rem] text-ink-soft">
            {context.map((m) => (
              <p key={m.id}>{m.text}</p>
            ))}
          </div>
        )}

        <h1 id="safety-q" ref={heading} tabIndex={-1} className={`mt-6 leading-[1.18] text-forest focus:outline-none ${(q?.text.length ?? 0) > 60 ? "text-[1.65rem] sm:text-[2rem]" : "text-[1.95rem] sm:text-[2.2rem]"}`}>
          {q?.text}
        </h1>

        <div className="mt-6 flex flex-col gap-3">
          {replies.map((r) => (
            <AnswerButton key={r.value} r={r} icons={icons} disabled={f.sending} onClick={() => f.answer(r.label, r.value)} />
          ))}
        </div>
        {replies.some((r) => r.value === "unsure") && (
          <p className="mt-3 text-[0.98rem] text-ink-soft">If you&apos;re not sure, that&apos;s fine. WISP will take the safer path.</p>
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
                className="min-h-14 min-w-0 flex-1 rounded-w-md border-[1.5px] border-line bg-card px-4 text-[1.05rem] placeholder:text-ink-faint"
              />
              <Button type="submit" size="lg" disabled={f.sending || !text.trim()}>
                Send
              </Button>
            </div>
          </Disclosure>
        </form>

        <p className="mt-8 flex items-center gap-3 rounded-w-md bg-red-bg px-4 py-3 text-[1rem] text-red-deep">
          <Icon name="phone" className="h-5 w-5" />
          <span>
            Feeling very unwell right now?{" "}
            <a href="tel:995" className="font-bold underline underline-offset-4">
              Call 995
            </a>
          </span>
        </p>
      </section>
    </CheckFrame>
  );
}
