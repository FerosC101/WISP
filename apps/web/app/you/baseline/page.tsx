"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Disclosure } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { API_URL } from "@/lib/api";
import { STATUS_WORDS, baselineStatus, useBaseline } from "@/lib/baseline";
import { usePrefs } from "@/lib/prefs";
import { dayLabel } from "@/lib/tiers";

const dateLabel = (iso: string) => {
  const d = dayLabel(iso);
  return d === "Today" || d === "Yesterday" ? d.toLowerCase() : d;
};

export default function MyUsual() {
  const { userId } = usePrefs();
  const { data, error, reload } = useBaseline(userId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (error && !data) return <p className="py-12 text-center text-ink-soft">WISP can&apos;t reach its local service right now.</p>;
  if (!data) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
      </div>
    );
  }

  const b = data.baseline;
  const n = b?.sessions.length ?? 0;
  const need = data.required_sessions;
  const status = baselineStatus(data);
  const words = STATUS_WORDS[status];
  const ready = status === "stable" || status === "varies";

  async function remove() {
    setDeleting(true);
    try {
      await fetch(`${API_URL}/api/baselines/${userId}`, { method: "DELETE" });
      setConfirmDelete(false);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <Link href="/you" className="inline-flex min-h-11 items-center font-bold text-forest">
        ‹ You
      </Link>
      <h1 className="mt-1 text-[2rem] font-bold leading-tight text-forest">My usual</h1>
      <p className="mt-1 text-ink-soft">WISP compares a movement check with your own healthy days, not with other people.</p>

      <section aria-labelledby="progress-title" className="mt-6 rounded-(--radius-card) bg-sage p-5">
        <h2 id="progress-title" className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-forest">
          Healthy-day checks
        </h2>
        <ol className="mt-3 flex items-center gap-2" aria-label={`${Math.min(n, need)} of ${need} done`}>
          {Array.from({ length: need }, (_, i) => (
            <li key={i} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[1rem] font-bold ${i < n ? "bg-forest text-white" : "border-2 border-forest/30 bg-card text-ink-faint"}`}
              >
                {i < n ? "✓" : i + 1}
              </span>
              {i < need - 1 && <span aria-hidden className={`h-1 flex-1 rounded-full ${i < n - 1 ? "bg-forest" : "bg-forest/20"}`} />}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[1.05rem] font-bold">
          {Math.min(n, need)} of {need} done{n > need ? ` · ${n} in total` : ""}
        </p>
      </section>

      <section aria-label="Status" className="mt-3 rounded-(--radius-card) border border-line bg-card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[0.85rem] text-ink-soft">Status</p>
            <p className="flex items-center gap-2 text-[1.15rem] font-bold">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-forest" : "bg-amber"}`} />
              {words.title}
            </p>
          </div>
          <div>
            <p className="text-[0.85rem] text-ink-soft">Last updated</p>
            <p className="text-[1.15rem] font-bold">{b ? dateLabel(b.last_updated) : "—"}</p>
          </div>
        </div>
        <p className="mt-3 text-ink-soft">{words.detail}</p>

        {b && (
          <Disclosure summary="View details" className="mt-3">
            <div className="rounded-xl bg-sage/60 px-4 py-3 text-[0.95rem]">
              <p>
                Five sit-to-stands usually take you about <strong>{b.median_time.toFixed(1)} seconds</strong> (between {b.usual_min.toFixed(1)} and{" "}
                {b.usual_max.toFixed(1)} s).
              </p>
              <ul className="mt-2 space-y-1 text-ink-soft">
                {b.sessions.map((s) => (
                  <li key={s.measurement_id}>
                    {new Date(s.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} · {s.total_time_seconds.toFixed(1)} s
                    {s.provider_mode !== "live" && <span className="ml-2 font-mono text-xs">[{s.provider_mode === "synthetic_recorded" ? "synthetic" : "recorded"}]</span>}
                  </li>
                ))}
              </ul>
            </div>
          </Disclosure>
        )}
      </section>

      <Link
        href="/you/baseline/enroll"
        className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-forest px-7 text-[1.08rem] font-bold text-white hover:bg-forest-deep"
      >
        {n === 0 ? "Record my first healthy-day check" : "Record another healthy-day check"}
      </Link>
      <p className="mt-2 text-center text-[0.95rem] text-ink-soft">Only on a day you feel like your usual self.</p>

      {b && (
        <div className="mt-8 border-t border-line pt-4">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 text-[0.95rem] text-ink-soft underline underline-offset-4">
              Delete my usual pattern
            </button>
          ) : (
            <div role="alertdialog" aria-labelledby="del-title" className="rounded-2xl border-2 border-red/40 bg-red-bg p-4">
              <p id="del-title" className="font-bold text-red">
                Delete your usual pattern?
              </p>
              <p className="mt-1 text-[0.95rem]">WISP will need {need} new healthy-day checks before it can compare again.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" disabled={deleting} onClick={remove} className="flex-1">
                  Delete
                </Button>
                <Button variant="secondary" disabled={deleting} onClick={() => setConfirmDelete(false)} className="flex-1">
                  Keep it
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
