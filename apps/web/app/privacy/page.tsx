"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { API_URL, api } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";

interface Privacy {
  raw_csi: { location: string; live_files: string[]; saved_for_debugging: boolean };
  baseline: { location: string; sessions: number };
  assessments: { location: string; count: number };
  sent_to_agent: string[];
  never_sent: string[];
  llm_extraction_enabled: boolean;
}

function Step({ children, tone = "local" }: { children: React.ReactNode; tone?: "local" | "cloud" }) {
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-center font-bold ${tone === "local" ? "border-teal/40 bg-card text-ink" : "border-blue/40 bg-card text-ink"}`}>
      {children}
    </div>
  );
}
const Arrow = () => (
  <div aria-hidden className="text-center text-ink-faint">
    ↓
  </div>
);

export default function PrivacyPage() {
  const { userId } = usePrefs();
  const [p, setP] = useState<Privacy | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    api<Privacy>(`/api/privacy/${userId}`).then(setP);
  }, [userId, deleted]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-[2rem] font-bold text-navy">Privacy and your data</h1>
      <p className="mt-2 max-w-2xl text-[1.05rem]">
        <strong>Raw physical sensing stays local.</strong> WISP only switches on physical sensing during an assessment you start, and only for the chair-rise
        check. It is not a monitoring camera and does not watch you the rest of the time.
      </p>

      <section aria-labelledby="arch" className="mt-8 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <h2 id="arch" className="sr-only">
          Where data goes
        </h2>
        <div className="rounded-[var(--radius-card)] border-2 border-teal bg-teal-bg p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Home · local trust zone</p>
          <div className="mt-4 space-y-1.5">
            <Step>Wi-Fi sensor (ESP32)</Step>
            <Arrow />
            <Step>Raw Wi-Fi signal (CSI)</Step>
            <Arrow />
            <Step>Signal processing on this device</Step>
            <Arrow />
            <Step>Chair-rise summary</Step>
          </div>
          <p className="mt-4 text-sm text-ink-soft">Your usual pattern (baseline) is stored here, encrypted.</p>
        </div>

        <div className="flex items-center justify-center md:flex-col" aria-hidden>
          <div className="h-1 w-full border-t-4 border-dashed border-ink-faint md:h-full md:w-1 md:border-l-4 md:border-t-0" />
          <span className="mx-2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-white md:my-2">Privacy boundary</span>
          <div className="h-1 w-full border-t-4 border-dashed border-ink-faint md:h-full md:w-1 md:border-l-4 md:border-t-0" />
        </div>

        <div className="rounded-[var(--radius-card)] border-2 border-blue bg-blue-bg p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">AI assistant (WorkBuddy) receives only</p>
          <ul className="mt-4 space-y-2">
            {(p?.sent_to_agent ?? ["Your answers to the questions", "Chair-rise summary", "Comparison label"]).map((x) => (
              <li key={x}>
                <Step tone="cloud">{x}</Step>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-soft">Your conversation may be processed by the AI service, depending on how WISP is set up.</p>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-[1.15rem] font-bold">Never leaves this device</h2>
          <ul className="mt-3 space-y-2">
            {(p?.never_sent ?? []).map((x) => (
              <li key={x} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                {x}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-[1.15rem] font-bold">What is stored</h2>
          {p && (
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="font-bold">Raw sensor recordings</dt>
                <dd className="text-ink-soft">
                  {p.raw_csi.location}. {p.raw_csi.saved_for_debugging ? `Kept for troubleshooting (${p.raw_csi.live_files.length} files).` : "Not kept."}
                </dd>
              </div>
              <div>
                <dt className="font-bold">Usual chair-rise pattern</dt>
                <dd className="text-ink-soft">
                  {p.baseline.location} · {p.baseline.sessions} well-day checks
                </dd>
              </div>
              <div>
                <dt className="font-bold">Assessments</dt>
                <dd className="text-ink-soft">
                  {p.assessments.location} · {p.assessments.count} checks
                </dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-[1.15rem] font-bold">Your controls</h2>
        <p className="mt-2 text-ink-soft">Sharing with a family member only happens when you say yes each time.</p>
        {deleted ? (
          <p role="status" className="mt-4 rounded-xl bg-green-bg px-4 py-3 font-bold text-green">
            Your WISP data on this device has been deleted.
          </p>
        ) : (
          <Button
            variant="secondary"
            className="mt-4 border-red text-red"
            onClick={async () => {
              if (!confirm("Delete all your WISP checks, your usual pattern and any saved sensor recordings from this device?")) return;
              await fetch(`${API_URL}/api/users/${userId}/data`, { method: "DELETE" });
              setDeleted(true);
            }}
          >
            Delete all my WISP data
          </Button>
        )}
      </Card>
    </div>
  );
}
