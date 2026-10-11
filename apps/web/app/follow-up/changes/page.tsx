"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type Trend, useStartCheck } from "@/components/StartCheck";
import { type IconName } from "@/components/Icon";
import { EmptyState, LargeChoice, PageIntro } from "@/components/kit";
import { Button } from "@/components/ui";
import { useMe } from "@/lib/useMe";

const COPY: Record<Trend, { title: string; hint: string; required: boolean }> = {
  better: { title: "Good to hear. Anything else you'd like to add?", hint: "You can skip this.", required: false },
  same: { title: "Anything you'd like to add?", hint: "You can skip this.", required: false },
  worse: { title: "What feels worse?", hint: "Tell WISP in your own words, or skip this.", required: false },
  new: { title: "What changed?", hint: "Choose what's new, or tell WISP in your own words.", required: true },
};

// Tiles become the person's own words; the safety questions are all asked again afterwards.
const CHANGES: { id: string; label: string; words: string; icon: IconName }[] = [
  { id: "confusion", label: "Confusion", words: "I have been confused", icon: "question" },
  { id: "weakness", label: "New weakness", words: "I have new weakness", icon: "weak" },
  { id: "dizzy", label: "Dizziness", words: "I feel dizzy", icon: "dizzy" },
  { id: "fall", label: "Fall", words: "I had a fall", icon: "balance" },
  { id: "breathing", label: "Breathing problem", words: "I have a breathing problem", icon: "breathing" },
  { id: "pain", label: "Pain", words: "I have pain", icon: "pain" },
];

export default function FollowUpChanges() {
  const params = useSearchParams();
  const prev = params.get("prev");
  const trend = params.get("trend") as Trend | null;
  const { me } = useMe();
  const check = useStartCheck(me);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  if (!prev || !trend || !(trend in COPY)) return <EmptyState scene="rest" title="Let's start that again" body="Something went missing along the way. Please start your check-in again from Today." />;
  const copy = COPY[trend];
  const tiles = trend === "new" || trend === "worse";
  const words = [...CHANGES.filter((c) => picked.includes(c.id)).map((c) => `${c.words}.`), text.trim()].filter(Boolean).join(" ");
  const go = () => check.startFollowUpWith(prev, trend, words);

  return (
    <div className="mx-auto max-w-xl">
      <PageIntro label="Follow-up" title={copy.title} lead={`${copy.hint} WISP will then ask the safety questions again.`} />
      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        {tiles && (
          <fieldset className="mb-5">
            <legend className="sr-only">What changed</legend>
            <ul className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
              {CHANGES.map((c) => (
                <li key={c.id}>
                  <LargeChoice
                    icon={c.icon}
                    label={c.label}
                    tone="sand"
                    selected={picked.includes(c.id)}
                    onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                  />
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <label htmlFor="changes" className={tiles ? "mb-2 block font-semibold" : "sr-only"}>
          {tiles ? "What has changed, in your own words (optional)" : "What has changed"}
        </label>
        <textarea
          id="changes"
          rows={3}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={trend === "new" ? "For example: “I fell yesterday”" : "Type here…"}
          className="w-full resize-none rounded-w-md border-[1.5px] border-line bg-card px-4 py-3 text-[1.1rem] placeholder:text-ink-faint focus:border-forest"
        />
        <Button type="submit" size="lg" className="mt-4 w-full" disabled={check.busy || (copy.required && !words)}>
          {check.busy ? "Starting…" : words || copy.required ? "Continue" : "Skip and continue"}
        </Button>
      </form>
      {check.error && (
        <p role="alert" className="mt-4 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
          {check.error}
        </p>
      )}
    </div>
  );
}
