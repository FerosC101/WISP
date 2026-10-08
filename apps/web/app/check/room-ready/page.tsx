"use client";

import { useEffect, useRef, useState } from "react";
import { CheckFrame } from "@/components/check/CheckFrame";
import { StickyActions } from "@/components/StickyActions";
import { Icon } from "@/components/Icon";
import { Illustration } from "@/components/Illustration";
import { Button } from "@/components/ui";
import { pendingQuestion, useCheckFlow } from "@/lib/checkFlow";
import { usePrefs } from "@/lib/prefs";
import { questionText, replyLabel } from "@/lib/replyLabels";
import type { QuickReply } from "@/lib/types";

const SETUP = [
  { id: "chair", label: "A sturdy chair with no wheels", detail: "A dining chair is ideal. Not a sofa or office chair." },
  { id: "wall", label: "The chair is against a wall", detail: "So it can't slide back when you sit down." },
  { id: "clear", label: "The space around it is clear", detail: "Nothing to trip on, and room to stand up straight." },
];

// The agent's room questions, in the order it asks them.
const STEP: Record<string, number> = { steady: 2, others: 3, others_clear: 3 };

function SensingOffNote() {
  return (
    <p className="mt-6 flex items-start gap-2.5 text-[0.98rem] text-ink-soft">
      <Icon name="lock" className="mt-0.5 h-5 w-5 text-teal" />
      Sensing is off. It only turns on when you press Start on the next screen.
    </p>
  );
}

export default function RoomReady() {
  const f = useCheckFlow("room-ready");
  const { language } = usePrefs();
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
        <p className="text-[0.95rem] font-medium text-ink-soft">Step {step} of 3</p>

        {step === 1 && (
          <>
            <h1 id="room-title" ref={heading} tabIndex={-1} className="mt-2 text-[2rem] leading-[1.15] text-forest focus:outline-none">
              Let&apos;s get the room ready.
            </h1>
            <Illustration scene="room" className="my-5 rounded-w-lg" />
            <ul className="mt-2 space-y-2.5">
              {SETUP.map((x) => (
                <li key={x.id}>
                  <label
                    className={`flex min-h-16 cursor-pointer items-start gap-3.5 rounded-w-md border-[1.5px] px-4 py-3.5 transition-colors ${ticked[x.id] ? "border-forest bg-sage" : "border-line bg-card hover:border-forest/40"}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!ticked[x.id]}
                      onChange={(e) => setTicked((t) => ({ ...t, [x.id]: e.target.checked }))}
                      className="mt-1 h-6 w-6 shrink-0 accent-forest"
                    />
                    <span>
                      <span className="block text-[1.06rem] font-semibold">{x.label}</span>
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
            <Illustration scene={key === "steady" ? "calm" : "room"} decorative className="mb-5 mt-3 max-w-[16rem] rounded-w-lg" />
            <h1 id="room-title" ref={heading} tabIndex={-1} className="text-[2rem] leading-[1.15] text-forest focus:outline-none">
              {questionText(key, q.text, language)}
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
                  onClick={() => f.answer(replyLabel(key, r, language), r.value)}
                >
                  {r.value === "skip" ? "Skip the movement check" : replyLabel(key, r, language)}
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
