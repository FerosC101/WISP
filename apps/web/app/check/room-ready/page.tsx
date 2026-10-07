"use client";

import { useEffect, useRef, useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { StickyActions } from "@/components/StickyActions";
import { Button } from "@/components/ui";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import type { QuickReply } from "@/lib/types";

const SETUP = [
  { id: "chair", label: "A sturdy chair with no wheels", detail: "A dining chair is ideal. Not a sofa or office chair." },
  { id: "wall", label: "The chair is against a wall", detail: "So it can't slide back when you sit down." },
  { id: "clear", label: "The space around it is clear", detail: "Nothing to trip on, and room to stand up straight." },
];

// The agent's room questions, in the order it asks them.
const STEP: Record<string, number> = { steady: 2, others: 3, others_clear: 3 };

/** A simple chair-against-a-wall picture. */
function ChairPicture() {
  return (
    <svg viewBox="0 0 160 100" className="h-24 w-40 text-forest" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 8v84" className="text-ink-faint" stroke="currentColor" />
      <path d="M10 92h140" className="text-ink-faint" stroke="currentColor" />
      <path d="M30 18v74M30 56h44M74 56v36M30 56v0" />
      <path d="M34 56h40" strokeWidth="6" />
      <path d="M100 30a7 7 0 1 0 0.1 0M100 44v26M100 52l-12 8M100 52l12 8M100 70l-8 22M100 70l8 22" className="text-teal" stroke="currentColor" />
    </svg>
  );
}

function SensingOffNote() {
  return (
    <p className="mt-6 flex items-start gap-2 text-[0.95rem] text-ink-soft">
      <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ink-faint" />
      Sensing is off. It only turns on when you press Start on the next screen.
    </p>
  );
}

export default function RoomReady() {
  const f = useCheckFlow("room-ready");
  const s = f.snapshot;
  const q = s ? pendingQuestion(s) : null;
  const key = q?.data.question ?? "";
  const replies: QuickReply[] = q?.data.quick_replies ?? [];
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [setupDone, setSetupDone] = useState(false);
  const allTicked = SETUP.every((x) => ticked[x.id]);
  // The setup checklist comes first; after that, follow the agent's questions.
  const step = !setupDone && key === "steady" ? 1 : (STEP[key] ?? 1);

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step, key]);

  const skip = replies.find((r) => r.value === "skip");

  return (
    <CheckFrame stage="room-ready" loading={!f.ready || !s || !q} error={f.error}>
      <section aria-labelledby="room-title">
        <p className="text-[0.95rem] font-bold text-ink-soft">Step {step} of 3</p>

        {step === 1 && (
          <>
            <h1 id="room-title" ref={heading} tabIndex={-1} className="mt-2 text-[1.8rem] font-bold leading-tight text-forest focus:outline-none">
              Let&apos;s get your space ready
            </h1>
            <ChairPicture />
            <ul className="mt-2 space-y-2.5">
              {SETUP.map((x) => (
                <li key={x.id}>
                  <label
                    className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 ${ticked[x.id] ? "border-forest bg-sage" : "border-line bg-card"}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!ticked[x.id]}
                      onChange={(e) => setTicked((t) => ({ ...t, [x.id]: e.target.checked }))}
                      className="mt-1 h-6 w-6 shrink-0 accent-forest"
                    />
                    <span>
                      <span className="block text-[1.05rem] font-bold">{x.label}</span>
                      <span className="block text-[0.92rem] text-ink-soft">{x.detail}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <StickyActions>
              <Button size="lg" className="w-full" disabled={!allTicked} onClick={() => setSetupDone(true)}>
                {allTicked ? "My space is ready" : "Tick each item to continue"}
              </Button>
              {skip && (
                <Button variant="ghost" className="w-full" disabled={f.sending} onClick={() => f.answer(skip.label, skip.value)}>
                  I can&apos;t set this up — skip the check
                </Button>
              )}
            </StickyActions>
          </>
        )}

        {step > 1 && q && (
          <>
            <h1 id="room-title" ref={heading} tabIndex={-1} className="mt-2 text-[1.8rem] font-bold leading-tight text-forest focus:outline-none">
              {q.text}
            </h1>
            {key === "steady" && <p className="mt-2 text-ink-soft">Stop at any time if you feel dizzy, breathless, or in pain.</p>}
            {key === "others" && <p className="mt-2 text-ink-soft">Someone moving nearby can confuse the sensor.</p>}
            <div className="mt-6 flex flex-col gap-3">
              {replies.map((r) => (
                <Button
                  key={r.value}
                  size="lg"
                  variant={r.value === "skip" ? "ghost" : "secondary"}
                  disabled={f.sending}
                  className="w-full"
                  onClick={() => f.answer(r.label, r.value)}
                >
                  {r.value === "skip" ? "Skip the movement check" : r.label}
                </Button>
              ))}
            </div>
          </>
        )}

        <SensingOffNote />
      </section>
    </CheckFrame>
  );
}
