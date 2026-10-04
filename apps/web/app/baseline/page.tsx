"use client";

import { useEffect, useState } from "react";
import { Button, Disclosure, RecordedBadge } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { API_URL, api, post } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { Persona } from "@/lib/types";

interface BaselineResp {
  baseline: {
    sessions: { measurement_id: string; total_time_seconds: number; date: string; provider_mode: string }[];
    median_time: number;
    usual_min: number;
    usual_max: number;
    last_updated: string;
  } | null;
  required_sessions: number;
}

const SAME = ["The same sturdy chair, against the same wall", "The same spot in the room", "Arms crossed the same way each time", "Only on days you feel like your usual self"];

export default function MyUsual() {
  const { userId } = usePrefs();
  const [data, setData] = useState<BaselineResp | null>(null);
  const [me, setMe] = useState<Persona | null>(null);
  const [phase, setPhase] = useState<"idle" | "ready" | "measuring">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<string>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api<BaselineResp>(`/api/baselines/${userId}`).then(setData);
    api<Persona[]>("/api/personas").then((ps) => setMe(ps.find((p) => p.user_id === userId) ?? null));
  }, [userId, reload]);

  const b = data?.baseline;
  const n = b?.sessions.length ?? 0;
  const need = data?.required_sessions ?? 3;
  const stable = b && n >= need ? (b.usual_max - b.usual_min) / b.median_time <= 0.15 : null;

  async function record() {
    setPhase("measuring");
    setMessage(null);
    try {
      const r = await post<{ accepted: boolean; measurement: { provider_mode: string } }>(`/api/baselines/${userId}/sessions`, {});
      setLastMode(r.measurement.provider_mode);
      setMessage(r.accepted ? "Thank you. That healthy-day check has been added." : "That reading wasn't clear enough, so it wasn't added. You can try again another day.");
      setReload((k) => k + 1);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div>
      <h1 className="text-[2rem] font-bold text-forest">My usual</h1>
      <p className="mt-1 text-ink-soft">{me?.display_name}</p>

      <section className="mt-6 rounded-(--radius-card) bg-sage p-6">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-forest">Your usual movement</p>
        <p className="mt-2 text-[1.1rem]">WISP compares today&apos;s check with your own healthy-day pattern — not with other people.</p>
        <WispLine className="my-4 h-3 w-28 text-forest" />
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[0.85rem] text-ink-soft">Status</dt>
            <dd className="text-[1.1rem] font-bold">
              {n} of {need} healthy-day checks
            </dd>
          </div>
          <div>
            <dt className="text-[0.85rem] text-ink-soft">Usual movement</dt>
            <dd className="text-[1.1rem] font-bold">{stable === null ? "Not set yet" : stable ? "Stable" : "Varies a little"}</dd>
          </div>
          <div>
            <dt className="text-[0.85rem] text-ink-soft">Last updated</dt>
            <dd className="text-[1.1rem] font-bold">{b ? new Date(b.last_updated).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "—"}</dd>
          </div>
        </dl>
        {b && (
          <Disclosure summary="View details" className="mt-4">
            <div className="rounded-xl bg-card px-4 py-3 text-[0.95rem]">
              <p>
                Five sit-to-stands usually take you about <strong>{b.median_time.toFixed(1)} seconds</strong> (between {b.usual_min.toFixed(1)} and{" "}
                {b.usual_max.toFixed(1)} s).
              </p>
              <ul className="mt-2 space-y-1 text-ink-soft">
                {b.sessions.map((s) => (
                  <li key={s.measurement_id}>
                    {new Date(s.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} · {s.total_time_seconds.toFixed(1)} s
                    {s.provider_mode !== "live" && <span className="ml-2 font-mono text-xs">[recorded]</span>}
                  </li>
                ))}
              </ul>
            </div>
          </Disclosure>
        )}
      </section>

      <section className="mt-6 rounded-(--radius-card) border border-line bg-card p-6">
        {phase === "idle" && (
          <>
            <h2 className="text-[1.15rem] font-bold">Feeling like your usual self today?</h2>
            <p className="mt-1 text-ink-soft">A healthy-day check helps WISP know your normal. Keep each one the same:</p>
            <ul className="mt-3 space-y-2">
              {SAME.map((c) => (
                <li key={c} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button size="lg" onClick={() => setPhase("ready")} className="w-full sm:w-auto">
                Record another healthy-day check
              </Button>
              <RecordedBadge mode={lastMode} />
            </div>
          </>
        )}
        {phase === "ready" && (
          <div>
            <h2 className="text-[1.15rem] font-bold">Quick movement check</h2>
            <p className="mt-1">Sit comfortably. When you press start, sit still for 3 seconds, then sit and stand five times at your normal pace.</p>
            <p className="mt-3 rounded-xl bg-amber-bg px-4 py-3">
              <strong className="text-amber">Stop</strong> if you feel dizzy, breathless, or in pain.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={record} className="w-full sm:w-auto">
                I&apos;m seated — start
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setPhase("idle")} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </div>
        )}
        {phase === "measuring" && (
          <div className="py-4 text-center" aria-live="polite">
            <WispLine variant="flow" className="mx-auto mb-3 h-8 w-56 text-teal" />
            <p className="text-[1.2rem] font-bold text-teal">Checking your movement…</p>
          </div>
        )}
        {message && (
          <p role="status" className="mt-4 rounded-xl bg-sage px-4 py-3">
            {message}
          </p>
        )}
      </section>

      {b && (
        <button
          className="mt-6 min-h-11 text-sm text-ink-soft underline underline-offset-4"
          onClick={async () => {
            if (!confirm("Delete your usual pattern? WISP will need three new healthy-day checks.")) return;
            await fetch(`${API_URL}/api/baselines/${userId}`, { method: "DELETE" });
            setReload((k) => k + 1);
          }}
        >
          Delete my usual pattern
        </button>
      )}
    </div>
  );
}
