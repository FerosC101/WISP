"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { api, post } from "@/lib/api";

interface Summary {
  caregiver: { name: string; relationship: string } | null;
  summary: string;
  tier: string;
}

export default function CaregiverPreview() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<Summary | null>(null);
  const [status, setStatus] = useState<"idle" | "shared" | "declined">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Summary>(`/api/sessions/${id}/caregiver-summary`).then(setS).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="py-10 text-center text-ink-soft">{error}</p>;
  if (!s) return <p className="py-10 text-center text-ink-soft">Loading…</p>;
  const name = s.caregiver?.name ?? "your caregiver";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[2rem] font-bold text-navy">Share with {name}?</h1>
      <p className="mt-2 text-ink-soft">
        This is exactly what {name} would receive. Nothing is sent unless you say yes. Raw sensor data is never shared.
      </p>

      <Card className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Message preview</p>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-[1.05rem] leading-relaxed">{s.summary}</pre>
      </Card>

      {status === "idle" && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={async () => {
              await post(`/api/sessions/${id}/share`, { consent: true });
              setStatus("shared");
            }}
          >
            Yes, share with {name}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={async () => {
              await post(`/api/sessions/${id}/share`, { consent: false });
              setStatus("declined");
            }}
          >
            No, don&apos;t share
          </Button>
        </div>
      )}
      {status === "shared" && (
        <p role="status" className="mt-6 rounded-2xl bg-green-bg px-5 py-4 font-bold text-green">
          Shared with {name}. (Demo: delivery is simulated.)
        </p>
      )}
      {status === "declined" && (
        <p role="status" className="mt-6 rounded-2xl bg-grey-bg px-5 py-4">
          Nothing was shared.
        </p>
      )}
      <Link href={`/session/${id}`} className="mt-6 inline-block font-bold text-blue underline underline-offset-4">
        Back to my recommendation
      </Link>
    </div>
  );
}
