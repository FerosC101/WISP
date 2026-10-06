"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { api, post } from "@/lib/api";

interface Summary {
  caregiver: { name: string; relationship: string } | null;
  summary: string;
  tier: string;
}

/** Preview of exactly what a family member would receive, sent only with explicit consent. */
export function ShareSummary({ sessionId }: { sessionId: string }) {
  const [s, setS] = useState<Summary | null>(null);
  const [status, setStatus] = useState<"idle" | "shared" | "declined">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Summary>(`/api/sessions/${sessionId}/caregiver-summary`)
      .then(setS)
      .catch((e: Error) => setError(e.message));
  }, [sessionId]);

  if (error) return <p className="py-10 text-center text-ink-soft">{error}</p>;
  if (!s) return <p className="py-10 text-center text-ink-soft">Loading…</p>;
  if (!s.caregiver) return <p className="text-ink-soft">You haven&apos;t added a trusted person yet.</p>;
  const name = s.caregiver.name;

  return (
    <div>
      <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Share with {name}?</h1>
      <p className="mt-2 text-ink-soft">This is exactly what {name} would receive. Nothing is sent unless you say yes. Sensor data is never shared.</p>

      <section className="mt-6 rounded-(--radius-card) border border-line bg-card p-6">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Message preview</p>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-[1.05rem] leading-relaxed">{s.summary}</pre>
      </section>

      {status === "idle" && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={async () => {
              await post(`/api/sessions/${sessionId}/share`, { consent: true });
              setStatus("shared");
            }}
          >
            Yes, share with {name}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={async () => {
              await post(`/api/sessions/${sessionId}/share`, { consent: false });
              setStatus("declined");
            }}
          >
            No, don&apos;t share
          </Button>
        </div>
      )}
      {status === "shared" && (
        <p role="status" className="mt-6 rounded-2xl bg-sage px-5 py-4 font-bold text-forest">
          Shared with {name}. (Prototype: delivery is simulated.)
        </p>
      )}
      {status === "declined" && (
        <p role="status" className="mt-6 rounded-2xl bg-slate-bg px-5 py-4">
          Nothing was shared.
        </p>
      )}
    </div>
  );
}
