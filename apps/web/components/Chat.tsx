"use client";

import { useEffect, useRef, useState } from "react";
import { post } from "@/lib/api";
import { TIER_STYLE } from "@/lib/tiers";
import type { Snapshot } from "@/lib/types";
import { Button } from "./ui";

export function Chat({ snapshot, onSnapshot }: { snapshot: Snapshot; onSnapshot: (s: Snapshot) => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isWorkBuddy = snapshot.agent === "workbuddy";
  const msgs = snapshot.messages;
  const last = msgs[msgs.length - 1];
  const replies = last?.role === "agent" ? (last.data.quick_replies ?? []) : [];
  const waitingForCheck = ["awaiting_patient", "measuring"].includes(snapshot.case.functional_status);
  const canAnswer = !isWorkBuddy && !waitingForCheck && !sending;

  // Opening a finished check shows the recommendation; only scroll for messages added after mount.
  const mountedLength = useRef(msgs.length);
  const finished = snapshot.disposition !== null;
  useEffect(() => {
    if (finished && msgs.length === mountedLength.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, finished]);

  async function send(value: string) {
    const v = value.trim();
    if (!v) return;
    setSending(true);
    setError(null);
    try {
      onSnapshot(await post<Snapshot>(`/api/sessions/${snapshot.session_id}/messages`, { text: v }));
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div role="log" aria-live="polite" aria-label="Conversation with WISP" className="flex-1 space-y-4 pb-4">
        {msgs.map((m) => {
          if (m.role === "system") {
            return (
              <p key={m.id} className="text-center text-sm text-ink-faint">
                {m.text}
              </p>
            );
          }
          if (m.role === "patient") {
            return (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-3xl rounded-br-md bg-navy px-5 py-3 text-[1.05rem] text-white">{m.text}</p>
              </div>
            );
          }
          const kind = m.data.kind;
          const tier = m.data.tier;
          return (
            <div key={m.id} className="flex flex-col items-start">
              <span className="mb-1 ml-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
                {m.data.source === "workbuddy" ? "WISP · WorkBuddy" : "WISP"}
              </span>
              <div
                className={`max-w-[92%] rounded-3xl rounded-tl-md border px-5 py-4 text-[1.05rem] leading-relaxed ${
                  kind === "result" && tier
                    ? `${TIER_STYLE[tier].bg} ${TIER_STYLE[tier].border} border-2 font-bold`
                    : kind === "instructions"
                      ? "border-teal bg-teal-bg"
                      : "border-line bg-card"
                }`}
              >
                {kind === "instructions" && <div className="mb-1 text-sm font-bold uppercase tracking-wider text-teal">Before you start</div>}
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {isWorkBuddy ? (
        <div className="rounded-2xl border border-dashed border-ink-faint bg-grey-bg px-5 py-4 text-ink-soft">
          This assessment is being run by <strong className="text-ink">Tencent WorkBuddy</strong>. Talk to WorkBuddy; this screen shows the check, the
          recommendation and the decision trace.
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-2 space-y-3 bg-paper/95 px-2 pb-2 pt-3">
          {replies.length > 0 && canAnswer && (
            <div className="flex flex-wrap gap-3" role="group" aria-label="Quick answers">
              {replies.map((r) => (
                <Button key={r} variant="secondary" size="lg" className="min-w-28 flex-1 sm:flex-none" onClick={() => send(r)}>
                  {r}
                </Button>
              ))}
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Your answer
            </label>
            <textarea
              id="chat-input"
              value={text}
              rows={1}
              maxLength={1000}
              disabled={!canAnswer}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(text);
                }
              }}
              placeholder={waitingForCheck ? "Follow the steps on screen…" : replies.length ? "Or type your answer…" : "Type how you're feeling…"}
              className="min-h-14 flex-1 resize-none rounded-2xl border-2 border-line bg-card px-4 py-3 text-[1.05rem] placeholder:text-ink-faint focus:border-blue disabled:bg-grey-bg"
            />
            <Button type="submit" size="lg" disabled={!canAnswer || !text.trim()} className="min-h-14 px-6">
              Send
            </Button>
          </form>
          {error && (
            <p role="alert" className="text-sm text-amber">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
