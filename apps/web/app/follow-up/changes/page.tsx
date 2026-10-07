"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type Trend, useStartCheck } from "@/components/StartCheck";
import { Button } from "@/components/ui";
import { useMe } from "@/lib/useMe";

const COPY: Record<Trend, { title: string; hint: string; required: boolean }> = {
  better: { title: "Good to hear. Anything else you'd like to add?", hint: "You can skip this.", required: false },
  same: { title: "Anything you'd like to add?", hint: "You can skip this.", required: false },
  worse: { title: "What feels worse?", hint: "Tell WISP in your own words, or skip this.", required: false },
  new: { title: "What's new?", hint: "Tell WISP in your own words.", required: true },
};

export default function FollowUpChanges() {
  const params = useSearchParams();
  const prev = params.get("prev");
  const trend = params.get("trend") as Trend | null;
  const { me } = useMe();
  const check = useStartCheck(me);
  const [text, setText] = useState("");

  if (!prev || !trend || !(trend in COPY)) return <p className="py-12 text-center text-ink-soft">Please start your check-in again.</p>;
  const copy = COPY[trend];
  const go = () => check.startFollowUpWith(prev, trend, text);

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-teal">Check-in</p>
      <h1 className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">{copy.title}</h1>
      <p className="mt-2 text-ink-soft">{copy.hint} WISP will then ask the safety questions again.</p>
      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label htmlFor="changes" className="sr-only">
          What has changed
        </label>
        <textarea
          id="changes"
          rows={3}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={trend === "new" ? "For example: “I fell yesterday”" : "Type here…"}
          className="w-full resize-none rounded-2xl border border-line bg-card px-4 py-3 text-[1.1rem] placeholder:text-ink-faint"
        />
        <Button type="submit" size="lg" className="mt-4 w-full" disabled={check.busy || (copy.required && !text.trim())}>
          {check.busy ? "Starting…" : text.trim() || copy.required ? "Continue" : "Skip and continue"}
        </Button>
      </form>
      {check.error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          {check.error}
        </p>
      )}
    </div>
  );
}
