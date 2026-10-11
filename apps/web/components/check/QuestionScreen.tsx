"use client";

import { useState } from "react";
import { Button, Disclosure } from "@/components/ui";
import { currentTurn, pendingQuestion } from "@/lib/checkFlow";
import type { Snapshot } from "@/lib/types";

/**
 * Shows the agent's current question with large answer buttons. Context the agent
 * said in the same turn ("You said you've been feeling weaker…") is shown above it.
 * Typing is offered only as a fallback, for answers that need clarification.
 */
export function QuestionScreen({
  snapshot,
  sending,
  onAnswer,
  allowText = true,
  showContext = true,
}: {
  snapshot: Snapshot;
  sending: boolean;
  onAnswer: (label: string, value?: string) => void;
  allowText?: boolean;
  showContext?: boolean;
}) {
  const [text, setText] = useState("");
  const q = pendingQuestion(snapshot);
  if (!q) return null;
  const context = !showContext ? [] : currentTurn(snapshot).filter((m) => m.id !== q.id && m.data.kind !== "check");
  const replies = q.data.quick_replies ?? [];

  return (
    <section aria-labelledby="q-title">
      {context.map((m) => (
        <p key={m.id} className="mb-3 text-[1.05rem] text-ink-soft">
          {m.text}
        </p>
      ))}
      <h1 id="q-title" className="text-[1.8rem] font-bold leading-tight text-forest">
        {q.text}
      </h1>

      {replies.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {replies.map((r) => (
            <Button key={r.value} variant="secondary" size="lg" disabled={sending} onClick={() => onAnswer(r.label, r.value)} className="w-full">
              {r.label}
            </Button>
          ))}
        </div>
      )}

      {allowText && (
        <form
          className={replies.length ? "mt-5" : "mt-6"}
          onSubmit={(e) => {
            e.preventDefault();
            onAnswer(text);
            setText("");
          }}
        >
          {replies.length ? (
            <Disclosure summary="Answer in your own words">
              <TextAnswer text={text} setText={setText} sending={sending} />
            </Disclosure>
          ) : (
            <TextAnswer text={text} setText={setText} sending={sending} />
          )}
        </form>
      )}
    </section>
  );
}

function TextAnswer({ text, setText, sending }: { text: string; setText: (v: string) => void; sending: boolean }) {
  return (
    <div className="flex gap-2">
      <label htmlFor="answer" className="sr-only">
        Your answer
      </label>
      <input
        id="answer"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer…"
        className="min-h-14 min-w-0 flex-1 rounded-w-md border border-line bg-card px-4 text-[1.05rem] placeholder:text-ink-faint"
      />
      <Button type="submit" size="lg" disabled={sending || !text.trim()}>
        Send
      </Button>
    </div>
  );
}
