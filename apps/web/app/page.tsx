"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { api, post } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { formatDate } from "@/lib/tiers";
import type { Persona, Snapshot } from "@/lib/types";

export default function Welcome() {
  const router = useRouter();
  const { userId, setUserId, agentMode, devMode } = usePrefs();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Persona[]>("/api/personas")
      .then(setPersonas)
      .catch(() => setError("WISP can't reach its local service. Please make sure it is running."));
  }, []);

  const me = personas?.find((p) => p.user_id === userId) ?? personas?.[0];
  const recheck = me?.rechecks[0];

  async function start(previousSessionId?: string) {
    if (!me) return;
    setBusy(true);
    try {
      const snap = previousSessionId
        ? await post<Snapshot>(`/api/sessions/${previousSessionId}/followup`, { agent: agentMode })
        : await post<Snapshot>("/api/sessions", { user_id: me.user_id, agent: agentMode });
      router.push(`/session/${snap.session_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="py-6 sm:py-12" aria-labelledby="welcome-title">
        <p className="mb-3 text-lg text-ink-soft">{me ? `Hello, ${me.display_name}.` : "Hello."}</p>
        <h1 id="welcome-title" className="text-[2.6rem] font-bold leading-tight text-navy sm:text-[3.2rem]">
          Tell me how you&apos;re feeling.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">
          WISP asks a few simple questions and helps you decide what to do next — whether that&apos;s resting at home, seeing your doctor, or getting help now.
        </p>

        {recheck && (
          <Card className="mt-8 border-teal bg-teal-bg">
            <p className="font-bold text-teal">Your follow-up check is due</p>
            <p className="mt-1 text-ink-soft">Planned for {formatDate(recheck.due_at)}. It only takes a few minutes.</p>
            <Button className="mt-4" onClick={() => start(recheck.session_id)} disabled={busy}>
              Start follow-up check
            </Button>
          </Card>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => start()} disabled={!me || busy} aria-describedby="privacy-note">
            {busy ? "Starting…" : "Start assessment"}
          </Button>
          {me?.latest_session_id ? (
            <Link
              href={`/session/${me.latest_session_id}`}
              className="inline-flex min-h-16 items-center justify-center rounded-2xl border-2 border-line bg-card px-8 text-[1.15rem] font-bold text-ink hover:border-ink-soft"
            >
              Review previous check
            </Link>
          ) : (
            <Link href="/history" className="inline-flex min-h-16 items-center justify-center rounded-2xl px-6 text-[1.05rem] font-bold text-ink-soft underline-offset-4 hover:underline">
              Review previous check
            </Link>
          )}
        </div>

        <p id="privacy-note" className="mt-6 flex items-start gap-2 text-ink-soft">
          <span aria-hidden className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
          WISP only activates physical sensing during an assessment you start.{" "}
          <Link href="/privacy" className="font-bold text-blue underline underline-offset-4">
            How your data is used
          </Link>
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
            {error}
          </p>
        )}
      </section>

      {personas && (
        <section aria-labelledby="who" className="border-t border-line pt-6">
          <h2 id="who" className="text-sm font-bold uppercase tracking-[0.14em] text-ink-faint">
            Who is checking in? <span className="font-normal normal-case tracking-normal">(demo profiles)</span>
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Choose profile">
            {personas.map((p) => {
              const selected = p.user_id === me?.user_id;
              return (
                <button
                  key={p.user_id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setUserId(p.user_id)}
                  className={`rounded-2xl border-2 p-4 text-left transition-colors ${selected ? "border-navy bg-card" : "border-line bg-card/60 hover:border-ink-faint"}`}
                >
                  <div className="text-lg font-bold">{p.display_name}</div>
                  <div className="text-sm text-ink-soft">
                    {p.age} · {p.lives_alone ? "lives alone" : "lives with family"}
                  </div>
                  <div className="mt-2 text-sm text-ink-faint">
                    {p.baseline_sessions >= 3 ? "Usual chair-rise pattern recorded" : `Usual pattern: ${p.baseline_sessions} of 3 checks`}
                  </div>
                </button>
              );
            })}
          </div>
          {devMode && (
            <p className="mt-3 font-mono text-xs text-ink-faint">
              agent: {agentMode === "workbuddy" ? "Tencent WorkBuddy via MCP (conversation runs in WorkBuddy)" : "built-in agent"} — change in Dev
            </p>
          )}
        </section>
      )}
    </div>
  );
}
