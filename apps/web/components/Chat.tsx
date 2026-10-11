"use client";

import { useEffect, useRef, useState } from "react";
import { post } from "@/lib/api";
import { TIER_STYLE } from "@/lib/tiers";
import type { ChatMessage, QuickReply, Snapshot } from "@/lib/types";
import { Button, Disclosure } from "./ui";
import { WispLine } from "./WispLine";

function AgentMessage({ m }: { m: ChatMessage }) {
  const kind = m.data.kind;
  if (kind === "offer") {
    const [first, ...rest] = m.text.split("\n");
    return (
      <div className="wisp-fade-in rounded-(--radius-card) border border-teal/40 bg-teal-bg px-5 py-5">
        <WispLine className="mb-3 h-3 w-24 text-teal" />
        <p className="text-[1.05rem]">{first}</p>
        {rest.map((line) => (
          <p key={line} className="mt-2 text-[1.05rem] font-bold text-ink">
            {line}
          </p>
        ))}
        {m.data.why && (
          <Disclosure summary="Why this check?" className="mt-3">
            <p className="rounded-w-sm bg-card px-4 py-3 text-ink-soft">{m.data.why}</p>
          </Disclosure>
        )}
      </div>
    );
  }
  if (kind === "instructions") {
    return (
      <div className="wisp-fade-in rounded-(--radius-card) border border-line bg-card px-5 py-4">
        <p className="mb-1 label text-teal">Before you start</p>
        <p>{m.text}</p>
      </div>
    );
  }
  if (kind === "result" && m.data.tier) {
    const s = TIER_STYLE[m.data.tier];
    return <p className={`wisp-fade-in rounded-w-md border-2 ${s.border} ${s.bg} px-5 py-4 text-[1.05rem] font-bold`}>{m.text}</p>;
  }
  return <p className={`wisp-fade-in max-w-[92%] text-[1.08rem] leading-relaxed ${kind === "question" ? "font-bold text-ink" : "text-ink"}`}>{m.text}</p>;
}

export function Chat({ snapshot, onSnapshot }: { snapshot: Snapshot; onSnapshot: (s: Snapshot) => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isWorkBuddy = snapshot.agent === "workbuddy";
  const msgs = snapshot.messages;
  const last = msgs[msgs.length - 1];
  const replies: QuickReply[] = last?.role === "agent" ? (last.data.quick_replies ?? []) : [];
  const waitingForCheck = ["awaiting_patient", "measuring"].includes(snapshot.case.functional_status);
  const canAnswer = !isWorkBuddy && !waitingForCheck && !sending;

  // Opening a finished check shows the recommendation; only scroll for messages added after mount.
  const mountedLength = useRef(msgs.length);
  const finished = snapshot.disposition !== null;
  useEffect(() => {
    if (finished && msgs.length === mountedLength.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, finished]);

  async function send(label: string, value?: string) {
    const v = label.trim();
    if (!v) return;
    setSending(true);
    setError(null);
    try {
      onSnapshot(await post<Snapshot>(`/api/sessions/${snapshot.session_id}/messages`, { text: v, value }));
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div role="log" aria-live="polite" aria-label="Conversation with WISP" className="space-y-4 pb-4">
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
                <p className="max-w-[85%] rounded-w-lg rounded-br-lg bg-forest px-5 py-3 text-[1.02rem] text-white">{m.text}</p>
              </div>
            );
          }
          return (
            <div key={m.id}>
              <AgentMessage m={m} />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {isWorkBuddy ? (
        <div className="rounded-w-md border border-dashed border-ink-faint bg-slate-bg px-5 py-4 text-ink-soft">
          You&apos;re talking with WISP through <strong className="text-ink">WorkBuddy</strong>. This screen shows the movement check and your recommendation.
        </div>
      ) : (
        <div className="sticky bottom-20 -mx-2 space-y-3 bg-ivory/95 px-2 pb-2 pt-3 md:bottom-0">
          {replies.length > 0 && canAnswer && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap" role="group" aria-label="Answers">
              {replies.map((r, i) => (
                <Button
                  key={r.value}
                  variant={replies.length <= 3 && i === 0 && ["do_check", "ready"].includes(r.value) ? "primary" : "secondary"}
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-32 sm:flex-1"
                  onClick={() => send(r.label, r.value)}
                >
                  {r.label}
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
              placeholder={replies.length ? "Or type your answer…" : "Type here…"}
              className="min-h-12 flex-1 resize-none rounded-w-md border border-line bg-card px-4 py-3 text-[1.02rem] placeholder:text-ink-faint focus:border-forest disabled:bg-slate-bg"
            />
            <Button type="submit" disabled={!canAnswer || !text.trim()} className="min-h-12" aria-label="Send">
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
