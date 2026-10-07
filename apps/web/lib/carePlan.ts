import { MAPS } from "./care";
import { dayLabel, timeLabel } from "./tiers";
import type { Snapshot } from "./types";

export interface PlanAction {
  label: string;
  href: string;
  /** tel: and map links open outside the app; "followup" starts the scheduled check-in. */
  kind: "tel" | "link" | "external" | "followup";
  emphasis?: "emergency" | "primary";
}

export interface PlanStep {
  id: string;
  text: string;
  detail?: string;
  action?: PlanAction;
  /** Can be ticked off. Emergency steps are not: they are not "done" until help arrives. */
  checkable?: boolean;
}

export interface CarePlan {
  now: PlanStep[];
  today: PlanStep[];
  next: PlanStep[];
  worse: { signs: string[]; advice: string[] };
}

const sentences = (text: string) => text.split(/(?<=\.)\s+/).filter(Boolean);

/**
 * A Now / Today / Next / If worse plan built from the rules engine's disposition:
 * its care actions, escalation advice, self-care steps, warning signs and re-check.
 * The plan only arranges that content; it never sets or changes urgency.
 */
export function buildPlan(s: Snapshot): CarePlan {
  const d = s.disposition!;
  const sid = s.session_id;
  const caregiver = s.profile?.caregiver;
  const gp = s.profile?.usual_gp;
  const findCare: PlanAction = { label: "Find care", href: `/care/find?s=${sid}`, kind: "link", emphasis: "primary" };
  const summary: PlanAction = { label: "Show visit summary", href: `/care/visit-summary?s=${sid}`, kind: "link" };
  const ae: PlanAction = { label: "Nearest A&E in maps", href: MAPS("hospital emergency department near me"), kind: "external" };
  const escalation = sentences(d.escalation);
  // The "call 995 if warning signs appear" sentence belongs with the warning signs.
  const worseAdvice = escalation.filter((x) => !/warning signs/i.test(x));
  const plan: CarePlan = { now: [], today: [], next: [], worse: { signs: d.worsening_signs, advice: [] } };

  switch (d.tier) {
    case "T1":
      plan.now.push(
        { id: "995", text: "Call 995", detail: d.actions.find((a) => a.kind === "call_995")?.detail, action: { label: "Call 995", href: "tel:995", kind: "tel", emphasis: "emergency" } },
        { id: "ae", text: "Or go to the nearest A&E", detail: d.actions.find((a) => a.kind === "emergency_department")?.detail, action: ae },
        ...escalation.map((x, i) => ({ id: `esc-${i}`, text: x })),
      );
      plan.today.push({ id: "summary", text: "Show the doctor what WISP found", action: summary });
      plan.next.push({ id: "after", text: "After you've been seen, follow the hospital's advice." });
      return plan;

    case "T2":
      plan.now.push({ id: "call", text: gp ? `Call ${gp} or a polyclinic to be seen today` : "Call a GP or polyclinic to be seen today", action: findCare, checkable: true });
      plan.today.push(
        { id: "seen", text: "Be seen today", detail: d.actions[0]?.detail, checkable: true },
        { id: "summary", text: "Take your visit summary with you", action: summary, checkable: true },
        { id: "ae", text: "If no one can see you today, go to A&E", action: ae },
      );
      plan.next.push({ id: "after", text: "Follow your doctor's advice. Start a new WISP check if anything changes." });
      plan.worse.advice = worseAdvice;
      return plan;

    case "T3":
      plan.now.push({ id: "book", text: gp ? `Book an appointment with ${gp} or a polyclinic` : "Book an appointment with your GP or a polyclinic", action: findCare, checkable: true });
      plan.today.push({ id: "watch", text: "Keep an eye on how you feel", detail: worseAdvice[0] });
      plan.next.push(
        { id: "visit", text: `See your doctor (${d.timeframe.toLowerCase()})`, checkable: true },
        { id: "summary", text: "Take your visit summary with you", action: summary, checkable: true },
      );
      plan.worse.advice = worseAdvice;
      return plan;

    case "T4":
      plan.now.push(...d.self_care.map((x, i) => ({ id: `self-${i}`, text: x, checkable: true })));
      plan.today.push({ id: "watch", text: "Keep an eye on how you feel" });
      if (d.recheck) {
        plan.next.push({
          id: "recheck",
          text: `WISP will check in with you ${dayLabel(d.recheck.due_at).toLowerCase()} at ${timeLabel(d.recheck.due_at)}`,
          action: { label: "Check in now", href: s.session_id, kind: "followup" },
        });
      }
      plan.next.push(...worseAdvice.map((x, i) => ({ id: `esc-${i}`, text: x })));
      return plan;

    case "ABSTAIN":
      plan.now.push({
        id: "talk",
        text: gp ? `Call ${gp} or a nurse and describe how you feel` : "Call your family doctor or a nurse and describe how you feel",
        detail: d.actions[0]?.detail,
        action: findCare,
        checkable: true,
      });
      if (caregiver) plan.now.push({ id: "family", text: `Ask ${caregiver.name} to help you get advice`, action: { label: `Share with ${caregiver.name}`, href: `/care/share?s=${sid}`, kind: "link" }, checkable: true });
      plan.today.push({ id: "today", text: "Speak to someone today", checkable: true }, { id: "summary", text: "Have your visit summary ready", action: summary });
      plan.next.push({ id: "after", text: "Start a new WISP check if anything changes." });
      return plan;
  }
}
