"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Disclosure } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { API_URL, api } from "@/lib/api";
import { useUserId } from "@/lib/prefs";

interface Privacy {
  raw_csi: { live_files: string[]; saved_for_debugging: boolean };
  baseline: { sessions: number };
  assessments: { count: number };
  llm_extraction_enabled: boolean;
}

const Dot = ({ cls }: { cls: string }) => <span aria-hidden className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${cls}`} />;

function Box({ children, tone }: { children: React.ReactNode; tone: "local" | "cloud" }) {
  return <div className={`rounded-xl border bg-card px-3 py-2 text-center text-[0.92rem] font-bold ${tone === "local" ? "border-forest/30" : "border-teal/30"}`}>{children}</div>;
}

export default function PrivacyPage() {
  const userId = useUserId();
  const [p, setP] = useState<Privacy | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteAll() {
    if (!userId) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/api/users/${userId}/data`, { method: "DELETE" });
      setDeleted(true);
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    api<Privacy>(`/api/privacy/${userId}`).then(setP);
  }, [userId, deleted]);

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <Link href="/you" className="inline-flex min-h-11 items-center font-bold text-forest">
        ‹ You
      </Link>
      <h1 className="mt-1 text-[2rem] font-bold leading-tight text-forest">Your physical sensing data stays at home.</h1>
      <p className="mt-3 text-[1.05rem] text-ink-soft">
        WISP only switches on sensing during a movement check you start. It does not watch you the rest of the time.
      </p>
      <WispLine className="my-6 h-3 w-32 text-teal" />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-(--radius-card) bg-sage p-6">
          <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-forest">Stays on your device</h2>
          <ul className="mt-3 space-y-2 text-[1.05rem]">
            <li className="flex gap-3"><Dot cls="bg-forest" />Raw Wi-Fi sensing</li>
            <li className="flex gap-3"><Dot cls="bg-forest" />Your movement signal</li>
            <li className="flex gap-3"><Dot cls="bg-forest" />Your personal usual pattern</li>
          </ul>
        </section>
        <section className="rounded-(--radius-card) border border-line bg-card p-6">
          <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-teal">WISP&apos;s assistant may receive</h2>
          <ul className="mt-3 space-y-2 text-[1.05rem]">
            <li className="flex gap-3"><Dot cls="bg-teal" />Your answers to the questions</li>
            <li className="flex gap-3"><Dot cls="bg-teal" />A summary such as “slower than usual”</li>
            <li className="flex gap-3"><Dot cls="bg-teal" />The care recommendation</li>
          </ul>
          <p className="mt-3 text-[0.9rem] text-ink-soft">Your conversation may be processed by an online AI service, depending on how WISP is set up.</p>
        </section>
      </div>

      <section className="mt-4 rounded-(--radius-card) border border-line bg-card p-6">
        <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Your controls</h2>
        <ul className="mt-3 space-y-2">
          <li className="flex gap-3"><Dot cls="bg-ink-faint" />Sharing with family only happens when you say yes, each time.</li>
          <li className="flex gap-3"><Dot cls="bg-ink-faint" />You can delete everything WISP stores on this device.</li>
        </ul>
        {deleted ? (
          <p role="status" className="mt-4 rounded-xl bg-sage px-4 py-3 font-bold text-forest">
            Your WISP data on this device has been deleted.
          </p>
        ) : confirming ? (
          <div role="alertdialog" aria-labelledby="wipe-title" className="mt-4 rounded-2xl border-2 border-red/40 bg-red-bg p-4">
            <p id="wipe-title" className="font-bold text-red">
              Delete all your WISP data?
            </p>
            <p className="mt-1 text-[0.95rem]">
              This removes your check-ins, your usual pattern and any saved sensor recordings from this device. It can&apos;t be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="danger" disabled={deleting} onClick={deleteAll} className="flex-1">
                {deleting ? "Deleting…" : "Delete everything"}
              </Button>
              <Button variant="secondary" disabled={deleting} onClick={() => setConfirming(false)} className="flex-1">
                Keep my data
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="mt-4 w-full border-red/50 text-red sm:w-auto" onClick={() => setConfirming(true)}>
            Delete all my WISP data
          </Button>
        )}
      </section>

      <Disclosure summary="View technical privacy details" className="mt-6">
        <div className="grid gap-3 rounded-(--radius-card) border border-line bg-card p-5 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <div className="rounded-2xl bg-sage p-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-forest">Home · local trust zone</p>
            <div className="mt-3 space-y-1.5">
              <Box tone="local">ESP32 Wi-Fi sensor</Box>
              <p aria-hidden className="text-center text-ink-faint">↓</p>
              <Box tone="local">Raw CSI (channel state information)</Box>
              <p aria-hidden className="text-center text-ink-faint">↓</p>
              <Box tone="local">Signal processing on this device</Box>
              <p aria-hidden className="text-center text-ink-faint">↓</p>
              <Box tone="local">Movement-check summary</Box>
            </div>
            <p className="mt-3 text-[0.85rem] text-ink-soft">Baseline stored here, encrypted. Raw CSI files kept only for troubleshooting{p ? ` (${p.raw_csi.live_files.length} files)` : ""}.</p>
          </div>
          <div className="flex items-center justify-center md:flex-col" aria-hidden>
            <div className="h-0.5 w-full border-t-2 border-dashed border-ink-faint md:h-full md:w-0.5 md:border-l-2 md:border-t-0" />
            <span className="mx-2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white md:my-2">Privacy boundary</span>
            <div className="h-0.5 w-full border-t-2 border-dashed border-ink-faint md:h-full md:w-0.5 md:border-l-2 md:border-t-0" />
          </div>
          <div className="rounded-2xl bg-teal-bg p-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-teal">AI agent (WorkBuddy) receives only</p>
            <div className="mt-3 space-y-1.5">
              <Box tone="cloud">Conversation answers</Box>
              <Box tone="cloud">Functional summary (time, rises)</Box>
              <Box tone="cloud">Baseline label + confidence</Box>
            </div>
            <p className="mt-3 text-[0.85rem] text-ink-soft">
              Never sent: raw CSI, signal traces, full baseline history, medication list.
              {p?.llm_extraction_enabled ? " Optional LLM text extraction is ON." : ""}
            </p>
          </div>
        </div>
        {p && (
          <p className="mt-3 text-[0.9rem] text-ink-soft">
            Stored on this device: {p.assessments.count} check-ins · {p.baseline.sessions} healthy-day checks.
          </p>
        )}
      </Disclosure>
    </div>
  );
}
