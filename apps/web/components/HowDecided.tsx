"use client";

import Link from "next/link";
import { usePrefs } from "@/lib/prefs";
import type { Snapshot, Tier } from "@/lib/types";
import { WispLine } from "./WispLine";

const FLAG_WORDS: Record<string, string> = {
  sudden_onset: "it started suddenly",
  chest_pain: "chest pain",
  severe_breathlessness: "severe breathlessness",
  one_sided_weakness: "weakness or numbness on one side",
  speech_difficulty: "trouble speaking",
  confusion: "new confusion",
  loss_of_consciousness: "fainting",
  recent_fall_with_injury: "a fall where you were hurt",
  sudden_vision_change: "a sudden change in eyesight",
};

const RANGE_WORDS: Partial<Record<Tier, string>> = {
  T2: "being seen today",
  T3: "seeing your doctor in the next few days",
  T4: "home monitoring",
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Plain-language account of how the recommendation was reached. Built from the
 *  structured decision record — no internal labels, scores or tool names. */
export function steps(snapshot: Snapshot): string[] {
  const t = snapshot.trace;
  const c = snapshot.case;
  const rf = t.safety_screen;
  const out: string[] = [];

  if (t.current_concern) out.push(`You told me: “${t.current_concern}”`);

  if (rf.status === "triggered") {
    out.push(`You mentioned ${list(rf.triggered_flags.map((f) => FLAG_WORDS[f] ?? f))}. That is an emergency warning sign.`);
    out.push("A warning sign like this already decides the advice, so I did not ask for a movement check.");
  } else if (rf.status === "incomplete" && rf.uncertain.length) {
    out.push(`You weren't sure about ${list(rf.uncertain.map((f) => FLAG_WORDS[f] ?? f))}, so I couldn't safely rule out an emergency from here.`);
  } else if (rf.status === "passed") {
    out.push("I asked about emergency warning signs. You didn't report any.");
  }

  const range = t.possible_range;
  const offered = t.events.some((e) => e.event === "agent_decision" && e.data.selected_action === "Physical function check");
  if (rf.status === "passed" && range?.floor && range.ceiling) {
    if (offered && range.floor !== range.ceiling) {
      out.push(
        `Your answers fell between ${RANGE_WORDS[range.floor] ?? "two options"} and ${RANGE_WORDS[range.ceiling] ?? "another option"}, so I suggested a quick movement check to compare today with your usual.`,
      );
    } else if (range.floor === range.ceiling) {
      out.push("What you told me was already enough to decide, so a movement check wasn't needed.");
    } else if (!snapshot.baseline_available) {
      out.push("I don't have your usual movement pattern yet, so a movement check couldn't be compared.");
    }
  }

  if (c.functional_status === "declined") out.push("We didn't do the movement check, so I relied on your answers.");
  if (c.feels_safe_to_stand === false) out.push("You didn't feel steady enough to try the movement check. That is important information in itself.");
  if (c.functional_status === "stopped_early") out.push("You weren't able to finish the movement check.");

  const cmp = t.comparison;
  if (cmp) {
    if (cmp.status === "measurement_unreliable") out.push("I couldn't get a reliable reading, so I didn't use it.");
    else if (cmp.status === "unable_to_compare") out.push("I couldn't compare the check with your usual pattern.");
    else {
      out.push(`Today's movement check was ${cmp.label.toLowerCase()}.`);
      if (cmp.new_arm_use) out.push("You also needed your arms to stand, which you don't usually do.");
    }
  }

  if (t.previous) out.push("Your earlier check is only background. It can never make today's advice less urgent.");
  if (t.disposition) out.push(`So my advice is: ${t.disposition.title.toLowerCase()}.`);
  return out;
}

export function HowDecided({ snapshot }: { snapshot: Snapshot }) {
  const { devMode } = usePrefs();
  return (
    <section aria-labelledby="how-title" className="wisp-fade-in rounded-(--radius-card) border border-line bg-card p-5 sm:p-6">
      <h2 id="how-title" className="text-[1.2rem] font-bold text-forest">
        How WISP decided
      </h2>
      <ol className="relative mt-4 space-y-4 border-l-2 border-sage-deep pl-5">
        {steps(snapshot).map((s, i) => (
          <li key={i} className="relative">
            <span aria-hidden className="absolute -left-[1.72rem] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-teal" />
            {s}
          </li>
        ))}
      </ol>
      <WispLine className="mt-5 h-3 w-24 text-sage-deep" />
      <p className="mt-2 text-[0.92rem] text-ink-soft">
        The level of urgency is set by fixed safety rules, not by the AI. A movement check can make advice more urgent, never less. WISP does not diagnose.
      </p>
      {devMode && (
        <Link href={`/explain/${snapshot.session_id}`} className="mt-3 inline-block font-mono text-sm text-forest underline">
          Open technical view →
        </Link>
      )}
    </section>
  );
}
