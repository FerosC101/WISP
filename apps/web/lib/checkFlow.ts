"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { post } from "./api";
import type { ChatMessage, Snapshot } from "./types";
import { useSession } from "./useSession";

/**
 * The Check flow is a set of dedicated screens over the same agent that drives the
 * chat view. The built-in agent asks one question at a time (its `pending` key is
 * the `question` on its latest message); each question belongs to one screen.
 * Safety decisions stay in the backend: screens only show the question and send
 * the language-independent answer value.
 */
export type Stage = "concern" | "safety" | "summary" | "decision" | "room-ready" | "movement" | "movement-result" | "complete";

/** Safety questions in the order the agent asks them (mirrors triage/agent.py). */
export const SAFETY_ORDER = [
  "onset",
  "duration",
  "chest_pain",
  "severe_breathlessness",
  "one_sided_weakness",
  "speech_difficulty",
  "confusion",
  "loss_of_consciousness",
  "sudden_vision_change",
  "fall",
  "eating",
];
/** Follow-up questions count as the same step as the question they follow. */
const SAFETY_FOLLOW_UP: Record<string, string> = { fall_injury: "fall", fluids: "eating" };
const SAFETY = new Set([...SAFETY_ORDER, ...Object.keys(SAFETY_FOLLOW_UP)]);

/** 1-based position of a safety question, for the progress indicator. */
export function safetyStep(key: string) {
  return SAFETY_ORDER.indexOf(SAFETY_FOLLOW_UP[key] ?? key) + 1;
}
const ROOM = new Set(["steady", "others", "others_clear"]);
const RESULT = new Set(["arms", "stop_reason", "stop_chest", "stop_breath"]);

/** Questions asked on a given screen (other questions, like sharing, belong to later screens). */
export const isMovementQuestion = (key: string | undefined) => !!key && RESULT.has(key);

/** Screens the patient moves past by tapping Continue, rather than by answering the agent. */
export type Ack = "summary" | "decision" | "result";
type Acks = Partial<Record<Ack, boolean>>;

/** Agent messages since the patient last spoke: the current "turn" of the conversation. */
export function currentTurn(snap: Snapshot): ChatMessage[] {
  const msgs = snap.messages;
  let i = msgs.length;
  while (i > 0 && msgs[i - 1].role !== "patient") i--;
  return msgs.slice(i).filter((m) => m.role === "agent");
}

/** The question the agent is waiting on, if any. */
export function pendingQuestion(snap: Snapshot): ChatMessage | null {
  const turn = currentTurn(snap);
  const last = turn[turn.length - 1];
  return last?.data.question ? last : null;
}

export function isChecking(snap: Snapshot) {
  return ["awaiting_patient", "measuring"].includes(snap.case.functional_status);
}

export function stageOf(snap: Snapshot, acks: Acks): Stage {
  const q = pendingQuestion(snap)?.data.question;
  const d = snap.disposition;
  // Red flags route straight to emergency care, whatever screen the patient is on.
  if (d?.tier === "T1") return "complete";
  if (isChecking(snap)) return "movement";
  if (q === "complaint" || q === "scope") return "concern";
  if (q && SAFETY.has(q)) return "safety";
  if (!acks.summary) return "summary";
  if (q === "offer" || !acks.decision) return "decision";
  if (q && ROOM.has(q)) return "room-ready";
  if (q && RESULT.has(q)) return "movement-result";
  const measured = ["measured", "unreliable", "stopped_early"].includes(snap.case.functional_status);
  if (measured && !acks.result) return "movement-result";
  if (d) return "complete";
  // The agent is between steps (e.g. a check is about to start): stay on the decision screen.
  return "decision";
}

export const stagePath = (stage: Stage, sid: string) => `/check/${stage}?s=${sid}`;

/** Where to open a session from elsewhere in the app. WorkBuddy sessions keep the conversation view. */
export function sessionHref(sid: string, agent: Snapshot["agent"] = "local_agent") {
  return agent === "workbuddy" ? `/session/${sid}` : `/check/complete?s=${sid}`;
}

const ALL_ACKED: Acks = { summary: true, decision: true, result: true };

/** Call before navigating into a check the patient has just started. */
export function beginFlow(sid: string) {
  saveAcks(sid, {});
}

function loadAcks(sid: string): Acks | null {
  try {
    const raw = sessionStorage.getItem(`wisp-check-${sid}`);
    return raw ? (JSON.parse(raw) as Acks) : null;
  } catch {
    return null;
  }
}

function saveAcks(sid: string, acks: Acks) {
  try {
    sessionStorage.setItem(`wisp-check-${sid}`, JSON.stringify(acks));
  } catch {
    /* storage unavailable: the flow still works within this page */
  }
}

/**
 * Session state for one Check screen. Redirects to the screen that matches where the
 * session actually is, so refreshing, going back, or an emergency answer always lands
 * the patient on the right step.
 */
export function useCheckFlow(here: Stage) {
  const router = useRouter();
  const sid = useSearchParams().get("s") ?? undefined;
  const session = useSession(sid);
  const { snapshot, setSnapshot } = session;
  // Acks live in sessionStorage. A check opened from elsewhere (no stored acks) that is
  // already finished skips the in-flow review screens and shows the recommendation.
  const [stored, setStored] = useState<Acks | null>(() => (sid ? loadAcks(sid) : null));
  const acks: Acks | null = stored ?? (snapshot ? (snapshot.disposition ? ALL_ACKED : {}) : null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stage = snapshot && acks ? stageOf(snapshot, acks) : null;

  useEffect(() => {
    if (!sid || !snapshot) return;
    if (snapshot.agent === "workbuddy") router.replace(`/session/${sid}`);
    else if (stage && stage !== here) router.replace(stagePath(stage, sid));
  }, [sid, snapshot, stage, here, router]);

  const ack = useCallback(
    (key: Ack) => {
      if (!sid) return;
      setStored((a) => {
        const next = { ...a, [key]: true };
        saveAcks(sid, next);
        return next;
      });
    },
    [sid],
  );

  const answer = useCallback(
    async (label: string, value?: string) => {
      if (!sid || !label.trim()) return;
      // Answering means the patient is in the flow: keep the review screens from here on.
      setStored((a) => {
        if (a) return a;
        saveAcks(sid, {});
        return {};
      });
      setSending(true);
      setError(null);
      try {
        setSnapshot(await post<Snapshot>(`/api/sessions/${sid}/messages`, { text: label.trim(), value }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSending(false);
      }
    },
    [sid, setSnapshot],
  );

  return { ...session, sid, stage, ready: stage === here, ack, answer, sending, error: error ?? session.error };
}
