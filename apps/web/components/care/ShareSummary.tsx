"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StickyActions } from "@/components/StickyActions";
import { Button } from "@/components/ui";
import { api, post } from "@/lib/api";
import { formatDate } from "@/lib/tiers";

interface Summary {
  caregiver: { name: string; relationship: string } | null;
  summary: string;
  tier: string;
  include_reasons: boolean;
  shared: { to: string; consented_at: string }[];
}

const NEVER = ["Sensor data or timings", "Your medicines and health conditions", "Your answers to each question"];

/**
 * Share with a trusted person: preview the exact text, choose whether to include the
 * reasons, and agree explicitly before anything is sent.
 */
export function ShareSummary({ sessionId }: { sessionId: string }) {
  const [includeReasons, setIncludeReasons] = useState(false);
  const [s, setS] = useState<Summary | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "shared" | "declined">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Summary>(`/api/sessions/${sessionId}/caregiver-summary?include_reasons=${includeReasons}`)
      .then(setS)
      .catch((e: Error) => setError(e.message));
  }, [sessionId, includeReasons, status]);

  if (error) return <p className="py-10 text-center text-ink-soft">{error}</p>;
  if (!s) return <p className="py-10 text-center text-ink-soft">Loading…</p>;
  if (!s.caregiver) {
    return (
      <div>
        <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Share with family</h1>
        <p className="mt-3">You haven&apos;t added a trusted person, so there&apos;s no one to share with.</p>
        <Link href="/you/caregivers" className="mt-4 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4">
          Trusted people
        </Link>
      </div>
    );
  }
  const { name, relationship } = s.caregiver;

  async function send() {
    setStatus("sending");
    try {
      await post(`/api/sessions/${sessionId}/share`, { consent: true, include_reasons: includeReasons });
      setStatus("shared");
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  }

  async function decline() {
    await post(`/api/sessions/${sessionId}/share`, { consent: false });
    setStatus("declined");
  }

  return (
    <div>
      <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Share with {name}?</h1>
      <p className="mt-2 text-ink-soft">Nothing is sent unless you agree below.</p>

      <div className="mt-5 flex items-center gap-3 rounded-w-md border border-line bg-card px-4 py-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-[1.1rem] font-bold text-forest">
          {name.charAt(0)}
        </span>
        <div>
          <p className="text-[0.92rem] text-ink-soft">To</p>
          <p className="font-bold">
            {name} <span className="font-normal text-ink-soft">({relationship})</span>
          </p>
        </div>
      </div>

      {status !== "shared" && (
        <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-w-md border border-line bg-card px-4 py-3">
          <span>
            <span className="block font-bold">Include the reasons</span>
            <span className="block text-[0.92rem] text-ink-soft">These mention how you&apos;ve been feeling.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={includeReasons}
            onChange={(e) => {
              setIncludeReasons(e.target.checked);
              setAgreed(false); // the preview changed, so agree again
            }}
            className="h-7 w-7 shrink-0 accent-forest"
          />
        </label>
      )}

      <section aria-labelledby="preview-title" className="mt-4 rounded-(--radius-card) border-2 border-forest/30 bg-card p-5">
        <h2 id="preview-title" className="label text-forest">
          Exactly what {name} will receive
        </h2>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-[1.05rem] leading-relaxed">{s.summary}</pre>
      </section>

      <section aria-label="Never shared" className="mt-3 rounded-w-md bg-sage px-4 py-3">
        <p className="font-bold">Never shared</p>
        <ul className="mt-1 space-y-1 text-[0.95rem]">
          {NEVER.map((x) => (
            <li key={x} className="flex gap-2.5">
              <span aria-hidden className="text-forest">✕</span>
              {x}
            </li>
          ))}
        </ul>
      </section>

      {status === "shared" ? (
        <p role="status" className="mt-5 rounded-w-md bg-sage px-5 py-4 font-bold text-forest">
          Sent to {name}. (Prototype: delivery is simulated.)
        </p>
      ) : status === "declined" ? (
        <p role="status" className="mt-5 rounded-w-md bg-slate-bg px-5 py-4">
          Nothing was shared.
        </p>
      ) : (
        <StickyActions>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-w-md border-2 border-line bg-card px-4 py-2">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-6 w-6 shrink-0 accent-forest" />
            <span className="text-[1.02rem] font-bold">I agree to send this message to {name}</span>
          </label>
          <div className="flex gap-2">
            <Button disabled={status === "sending"} variant="secondary" onClick={decline} className="flex-1">
              Don&apos;t share
            </Button>
            <Button disabled={!agreed || status === "sending"} onClick={send} className="flex-[2]">
              {status === "sending" ? "Sending…" : `Send to ${name}`}
            </Button>
          </div>
        </StickyActions>
      )}

      {s.shared.length > 0 && (
        <section aria-label="Already shared" className="mt-5 text-[0.95rem] text-ink-soft">
          <p className="font-bold text-ink">Already shared</p>
          <ul className="mt-1 space-y-0.5">
            {s.shared.map((x, i) => (
              <li key={i}>
                With {x.to} · {formatDate(x.consented_at)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
