"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, RecordedBadge, SensingIndicator } from "@/components/ui";
import { API_URL, WS_URL, api, post } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { formatDate } from "@/lib/tiers";
import type { Persona, SensingState } from "@/lib/types";

interface BaselineResp {
  baseline: {
    sessions: { measurement_id: string; total_time_seconds: number; date: string; provider_mode: string; recording_id: string | null }[];
    median_time: number;
    usual_min: number;
    usual_max: number;
    arms_used_normally: boolean;
    last_updated: string;
  } | null;
  required_sessions: number;
}

const CONSISTENCY = ["Same sturdy chair, against the same wall", "Same spot in the room (the sensor stays where it is)", "Arms folded across your chest — the same way each time", "Only on days when you feel your usual self"];

export default function BaselinePage() {
  const { userId } = usePrefs();
  const [data, setData] = useState<BaselineResp | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [state, setState] = useState<SensingState>("OFF");
  const [phase, setPhase] = useState<"idle" | "ready" | "measuring">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<string | undefined>();
  const wsRef = useRef<WebSocket | null>(null);

  const load = () => {
    api<BaselineResp>(`/api/baselines/${userId}`).then(setData);
    api<Persona[]>("/api/personas").then((ps) => setPersona(ps.find((p) => p.user_id === userId) ?? null));
  };
  useEffect(load, [userId]);
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/enrol/${userId}`);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "sensing_state") setState(m.state);
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [userId]);

  const b = data?.baseline;
  const n = b?.sessions.length ?? 0;
  const required = data?.required_sessions ?? 3;

  async function record() {
    setPhase("measuring");
    setMessage(null);
    try {
      const r = await post<{ accepted: boolean; reason?: string; measurement: { total_time_seconds: number | null; provider_mode: string } }>(`/api/baselines/${userId}/sessions`, {});
      setLastMode(r.measurement.provider_mode);
      setMessage(r.accepted ? "Thank you — that well-day check has been added." : "That reading wasn't clear enough to use, so it wasn't added. You can try again another time.");
      load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setPhase("idle");
      setState("COMPLETE");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-bold text-navy">My usual chair-rise</h1>
          <p className="mt-1 text-ink-soft">{persona?.display_name ?? ""}</p>
        </div>
        <SensingIndicator state={state === "ACTIVE" ? "ACTIVE" : state === "COMPLETE" ? "COMPLETE" : "OFF"} />
      </div>
      <p className="mt-4 max-w-2xl text-[1.05rem]">
        WISP compares you with <strong>your own normal</strong>, not with other people. On {required} different days when you feel well, do a short chair-rise
        check so WISP can learn your usual pace.
      </p>

      <Card className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[1.15rem] font-bold">
            {n >= required ? "Your usual pattern is recorded" : `${n} of ${required} well-day checks`}
          </h2>
        </div>
        <div className="mt-3 flex gap-2" aria-hidden>
          {Array.from({ length: Math.max(required, n) }).map((_, i) => (
            <span key={i} className={`h-3 flex-1 rounded-full ${i < n ? "bg-teal" : "bg-grey-bg"}`} />
          ))}
        </div>
        {b && n >= required && (
          <p className="mt-4 text-ink-soft">
            Your usual time for five chair rises is about <strong className="text-ink">{Math.round(b.median_time)} seconds</strong> (between{" "}
            {b.usual_min.toFixed(1)} and {b.usual_max.toFixed(1)} s across your well days).
          </p>
        )}
        {b && (
          <ul className="mt-4 space-y-1 text-sm text-ink-soft">
            {b.sessions.map((s) => (
              <li key={s.measurement_id}>
                {formatDate(s.date, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {s.total_time_seconds.toFixed(1)} s
                {s.provider_mode !== "live" && <span className="ml-2 font-mono text-xs">[{s.provider_mode.replace("_", " ")}]</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="text-[1.15rem] font-bold">Keep each check the same</h2>
        <ul className="mt-3 space-y-2">
          {CONSISTENCY.map((c) => (
            <li key={c} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
              {c}
            </li>
          ))}
        </ul>
        {phase === "idle" && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => setPhase("ready")}>
              Record a well-day check
            </Button>
            <RecordedBadge mode={lastMode} />
          </div>
        )}
        {phase === "ready" && (
          <div className="mt-6 rounded-2xl bg-teal-bg p-5">
            <p className="text-[1.1rem] font-bold">Sit comfortably. When you press start, sit still for 3 seconds, then stand up and sit down five times.</p>
            <p className="mt-2 text-ink-soft">Stop immediately if you feel dizzy, very short of breath, or have any pain.</p>
            <div className="mt-4 flex gap-3">
              <Button size="lg" onClick={record}>
                Start
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setPhase("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {phase === "measuring" && <p className="mt-6 text-[1.4rem] font-bold text-teal wisp-pulse">Measuring…</p>}
        {message && (
          <p role="status" className="mt-4 rounded-xl bg-grey-bg px-4 py-3">
            {message}
          </p>
        )}
      </Card>

      {b && (
        <button
          className="mt-6 text-sm text-ink-soft underline underline-offset-4"
          onClick={async () => {
            if (!confirm("Delete your recorded usual pattern? WISP will need three new well-day checks.")) return;
            await fetch(`${API_URL}/api/baselines/${userId}`, { method: "DELETE" });
            load();
          }}
        >
          Delete my usual pattern
        </button>
      )}
    </div>
  );
}
