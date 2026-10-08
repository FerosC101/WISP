"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CareShell } from "@/components/care/CareShell";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useCareSession } from "@/lib/care";
import type { Snapshot } from "@/lib/types";
import { type BaselineInfo, type VisitSummary, buildVisitSummary, summaryText } from "@/lib/visitSummary";

function SummaryDoc({ v, large = false }: { v: VisitSummary; large?: boolean }) {
  return (
    <article aria-label="Visit summary" className={large ? "text-[1.25rem]" : ""}>
      <p className={`font-bold ${large ? "text-[1.6rem]" : "text-[1.2rem]"}`}>{v.name}</p>
      <p className="text-ink-soft">{v.when} · WISP self-triage check</p>
      {v.dataNotice && <p className="mt-3 rounded-w-sm border-2 border-amber bg-amber-bg px-4 py-2.5 font-bold text-amber">{v.dataNotice}</p>}
      <dl className="mt-3 divide-y divide-line">
        {v.sections.map((s) => (
          <div key={s.title} className="py-3">
            <dt className="text-[0.85em] font-semibold text-ink-soft">{s.title}</dt>
            {s.lines.map((l, i) => (
              <dd key={i} className={i === 0 ? "mt-0.5 font-bold" : "mt-0.5"}>
                {l}
              </dd>
            ))}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[0.85em] text-ink-soft">{v.disclaimer}</p>
    </article>
  );
}

/** Full screen, large text, for handing the phone to a doctor or nurse. */
function DoctorView({ v, onClose }: { v: VisitSummary; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Visit summary for your doctor" className="fixed inset-0 z-50 overflow-y-auto bg-card">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="label text-teal">For your doctor or nurse</p>
          <Button variant="secondary" onClick={onClose} autoFocus>
            Close
          </Button>
        </div>
        <SummaryDoc v={v} large />
      </div>
    </div>,
    document.body,
  );
}

function Body({ s }: { s: Snapshot }) {
  const [baseline, setBaseline] = useState<BaselineInfo | null>(null);
  const [showDoctor, setShowDoctor] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const userId = s.case.user_id;

  useEffect(() => {
    api<{ baseline: BaselineInfo | null }>(`/api/baselines/${userId}`)
      .then((r) => setBaseline(r.baseline))
      .catch(() => setBaseline(null));
  }, [userId]);

  const v = buildVisitSummary(s, baseline);
  const text = summaryText(v);

  async function share() {
    setShareMsg(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: "WISP visit summary", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareMsg("Copied. You can paste it into a message.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setShareMsg("Couldn't share from this browser. Try printing instead.");
    }
  }

  return (
    <>
      <h1 className="text-[1.9rem] leading-tight text-forest print:hidden sm:text-[2.2rem]">Visit summary</h1>
      <p className="mt-2 text-ink-soft print:hidden">Show this to your doctor or nurse. It only includes what you told WISP and what it measured.</p>

      <div className="mt-5 flex flex-col gap-2.5 print:hidden">
        <Button size="lg" onClick={() => setShowDoctor(true)} className="w-full">
          Show full screen
        </Button>
        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
            Print or save PDF
          </Button>
          <Button variant="secondary" className="flex-1" onClick={share}>
            Share
          </Button>
        </div>
        {shareMsg && (
          <p role="status" className="text-[0.95rem] text-ink-soft">
            {shareMsg}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-(--radius-card) border border-line bg-card p-5 print:border-0 print:p-0">
        <SummaryDoc v={v} />
      </div>

      {showDoctor && <DoctorView v={v} onClose={() => setShowDoctor(false)} />}
    </>
  );
}

export default function VisitSummaryPage() {
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => <Body key={s.session_id} s={s} />}
    </CareShell>
  );
}
