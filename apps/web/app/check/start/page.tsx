"use client";

import { useState } from "react";
import { DescribeBox, useStartCheck } from "@/components/StartCheck";
import { Icon, type IconName } from "@/components/Icon";
import { LargeChoice, PageIntro } from "@/components/kit";
import { StickyActions } from "@/components/StickyActions";
import { Button } from "@/components/ui";
import { WispJourney } from "@/components/WispLine";
import { dayLabel, timeLabel } from "@/lib/tiers";
import { useMe } from "@/lib/useMe";

/**
 * Check-in start: what feels different, then when it started. The answers become
 * the person's own sentence ("I feel weak and dizzy, since yesterday"), which the
 * agent reads exactly as if it had been typed. Safety questions follow.
 */
const CONCERNS: { id: string; label: string; words: string; icon: IconName }[] = [
  { id: "weak", label: "Weakness", words: "I feel weak", icon: "weak" },
  { id: "dizzy", label: "Dizziness", words: "I feel dizzy", icon: "dizzy" },
  { id: "tired", label: "Tiredness", words: "I'm unusually tired", icon: "tired" },
  { id: "balance", label: "Balance", words: "I feel unsteady", icon: "balance" },
  { id: "appetite", label: "Appetite", words: "I'm not eating normally", icon: "appetite" },
  { id: "breathing", label: "Breathing", words: "my breathing feels different", icon: "breathing" },
  { id: "pain", label: "Pain", words: "I have some pain", icon: "pain" },
  { id: "other", label: "Something else", words: "something feels off", icon: "other" },
];

const SINCE: { id: string; label: string; words: string }[] = [
  { id: "today", label: "Today", words: "since today" },
  { id: "yesterday", label: "Yesterday", words: "since yesterday" },
  { id: "days", label: "2–3 days ago", words: "for 2 days" },
  { id: "longer", label: "Longer", words: "for a week or more" },
  { id: "unsure", label: "Not sure", words: "" },
];

const EXTRA: { id: string; label: string; words: string; icon: IconName }[] = [
  { id: "eating", label: "Eating less", words: "I am eating less than usual", icon: "appetite" },
  { id: "drinking", label: "Drinking less", words: "I am drinking less than usual", icon: "appetite" },
  { id: "sleeping", label: "Sleeping more", words: "I am sleeping more than usual", icon: "tired" },
  { id: "unsteady", label: "Feeling unsteady", words: "I feel unsteady on my feet", icon: "balance" },
  { id: "fall", label: "Recent fall", words: "I had a fall recently", icon: "weak" },
  { id: "fever", label: "Fever", words: "I have had a fever", icon: "pain" },
];

function sentence(ids: string[], since: string, extra: string[] = []): string {
  const parts = CONCERNS.filter((c) => ids.includes(c.id)).map((c) => c.words);
  const joined = parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  const body = joined.charAt(0).toUpperCase() + joined.slice(1);
  const when = SINCE.find((s) => s.id === since)?.words;
  const first = when ? `${body}, ${when}.` : `${body}.`;
  const more = EXTRA.filter((x) => extra.includes(x.id)).map((x) => `${x.words}.`);
  return [first, ...more].join(" ");
}

export default function CheckStart() {
  const { me, error } = useMe();
  const check = useStartCheck(me);
  const recheck = me?.rechecks[0];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [extra, setExtra] = useState<string[]>([]);
  const [nothingElse, setNothingElse] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [since, setSince] = useState<string | null>(null);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="mx-auto max-w-xl">
      <WispJourney current={0} className="mb-7" />
      <p className="label text-ink-soft" aria-live="polite">
        Check-in · {step} of 3
      </p>

      {step === 1 ? (
        <>
          <PageIntro title="What feels different today?" lead="Choose everything that applies. You can describe it in your own words instead." className="mt-1" />
          <fieldset className="mt-6">
            <legend className="sr-only">What feels different</legend>
            <ul className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
              {CONCERNS.map((c) => (
                <li key={c.id}>
                  <LargeChoice icon={c.icon} label={c.label} selected={picked.includes(c.id)} onClick={() => toggle(c.id)} tone="sage" />
                </li>
              ))}
            </ul>
          </fieldset>

          <section aria-labelledby="own-words" className="mt-8">
            <h2 id="own-words" className="text-[1.25rem] text-ink">
              Or say it in your own words
            </h2>
            <p className="mb-3 mt-1 text-[0.98rem] text-ink-soft">Type, or tap the microphone to speak.</p>
            <DescribeBox me={me} check={check} />
          </section>

          {picked.length > 0 && (
            <StickyActions>
              <Button size="lg" className="w-full" onClick={() => setStep(2)}>
                Next: when it started
                <Icon name="arrow-right" className="h-5 w-5" />
              </Button>
            </StickyActions>
          )}
        </>
      ) : step === 2 ? (
        <>
          <PageIntro title="When did this start?" lead="An approximate answer is fine." className="mt-1" />
          <div role="radiogroup" aria-label="When it started" className="mt-6 grid gap-2.5">
            {SINCE.map((s) => (
              <LargeChoice key={s.id} role="radio" icon="calendar" label={s.label} selected={since === s.id} onClick={() => setSince(s.id)} tone="plain" />
            ))}
          </div>
          <StickyActions>
            <Button size="lg" className="w-full" disabled={!since} onClick={() => setStep(3)}>
              Next: anything else
              <Icon name="arrow-right" className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
              Back to what feels different
            </Button>
          </StickyActions>
        </>
      ) : (
        <>
          <PageIntro title="Has anything else changed?" lead="Choose any that apply." className="mt-1" />
          <fieldset className="mt-6">
            <legend className="sr-only">Other changes</legend>
            <ul className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
              {EXTRA.map((x) => (
                <li key={x.id}>
                  <LargeChoice
                    icon={x.icon}
                    label={x.label}
                    tone="dusty"
                    selected={extra.includes(x.id)}
                    onClick={() => {
                      setNothingElse(false);
                      setExtra((e) => (e.includes(x.id) ? e.filter((y) => y !== x.id) : [...e, x.id]));
                    }}
                  />
                </li>
              ))}
              <li className="min-[420px]:col-span-2">
                <LargeChoice
                  icon="check-mark"
                  label="Nothing else"
                  tone="plain"
                  selected={nothingElse}
                  onClick={() => {
                    setExtra([]);
                    setNothingElse((v) => !v);
                  }}
                />
              </li>
            </ul>
          </fieldset>
          {check.error && (
            <p role="alert" className="mt-4 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
              {check.error}
            </p>
          )}
          <StickyActions>
            <Button
              size="lg"
              className="w-full"
              disabled={(!nothingElse && extra.length === 0) || !since || !me || check.busy}
              onClick={() => since && check.start(sentence(picked, since, extra))}
            >
              {check.busy ? "Starting…" : "Start the safety check"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
              Back to when it started
            </Button>
          </StickyActions>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
          {error}
        </p>
      )}

      {recheck && step === 1 && (
        <section aria-labelledby="sched-title" className="mt-10 rounded-w-lg bg-sage px-5 py-5">
          <h2 id="sched-title" className="label text-forest">
            Next check
          </h2>
          <p className="mt-1 text-[1.1rem] font-semibold">
            {dayLabel(recheck.due_at)} · {timeLabel(recheck.due_at)}
          </p>
          <p className="text-[0.98rem] text-ink-soft">Your follow-up compares how you feel now with last time.</p>
          <Button variant="secondary" size="lg" className="mt-3 w-full" disabled={check.busy} onClick={() => check.startFollowUp(recheck.session_id)}>
            Start the follow-up instead
          </Button>
        </section>
      )}
    </div>
  );
}
