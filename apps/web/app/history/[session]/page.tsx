"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HowDecided } from "@/components/HowDecided";
import { Card } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { api } from "@/lib/api";
import { movementPhrase } from "@/lib/movementWords";
import { PATIENT_OUTCOME, TIER_STYLE, dayLabel, formatDate } from "@/lib/tiers";
import type { HistoryItem, Snapshot } from "@/lib/types";
import { useSession } from "@/lib/useSession";

const FLAG_WORDS: Record<string, string> = {
  sudden_onset: "it started suddenly",
  chest_pain: "chest pain",
  severe_breathlessness: "severe breathlessness",
  one_sided_weakness: "weakness or numbness on one side",
  speech_difficulty: "trouble speaking",
  confusion: "new confusion",
  loss_of_consciousness: "fainting",
  recent_fall_with_injury: "a fall where you were hurt",
  sudden_vision_change: "a sudden change in eyesight",
};
const CHANGE_WORDS: Record<string, string> = {
  reduced_intake: "eating or drinking less",
  unable_to_keep_fluids: "unable to keep fluids down",
  fall_without_injury: "a fall without injury",
  fever: "fever",
  getting_worse: "getting worse",
};

function told(s: Snapshot) {
  const c = s.case;
  const flags = Object.entries(c.red_flags).filter(([, v]) => v === true).map(([k]) => FLAG_WORDS[k] ?? k);
  const changes = Object.entries(c.modifiers).filter(([, v]) => v === true).map(([k]) => CHANGE_WORDS[k] ?? k);
  const days = c.duration_days;
  return [
    { label: "How long", value: days === null ? "Not sure" : days < 1 ? "Since that day" : days < 2 ? "Since the day before" : `About ${Math.round(days)} days` },
    { label: "Other changes", value: changes.length ? changes.join(", ") : "None" },
    {
      label: "Warning signs",
      value: flags.length ? `Reported: ${flags.join(", ")}` : c.uncertain_fields.length ? "None reported; some answers were “not sure”" : "None reported",
    },
  ];
}

export default function CheckDetail() {
  const { session } = useParams<{ session: string }>();
  const { snapshot: s, error } = useSession(session);
  const [related, setRelated] = useState<HistoryItem[]>([]);
  const userId = s?.case.user_id;

  useEffect(() => {
    if (!userId) return;
    api<HistoryItem[]>(`/api/history?user_id=${userId}`)
      .then(setRelated)
      .catch(() => setRelated([]));
  }, [userId]);

  if (error && !s) return <p className="py-12 text-center text-ink-soft">We couldn&apos;t open this check.</p>;
  if (!s) {
    return (
      <div className="py-20" aria-busy>
        <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
      </div>
    );
  }

  const d = s.disposition;
  const c = s.case;
  const move = movementPhrase(c.functional_status, c.comparison?.status, c.comparison?.severity);
  const parent = c.previous_session_id ? related.find((h) => h.session_id === c.previous_session_id) : undefined;
  const followUps = related.filter((h) => h.previous_session_id === s.session_id);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/history" className="inline-flex min-h-11 items-center font-bold text-forest">
        ‹ History
      </Link>
      <p className="mt-2 text-[0.8rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
        {c.previous_session_id ? "Follow-up check" : "Check"} · {formatDate(c.created_at)}
      </p>
      <h1 className="mt-1 text-[1.8rem] font-bold leading-tight text-forest">{c.complaint_text ? `“${c.complaint_text}”` : "Check-in"}</h1>

      {d ? (
        <div className={`mt-4 rounded-(--radius-card) ${TIER_STYLE[d.tier].bg} px-5 py-5`}>
          <p className={`text-[1.3rem] font-bold uppercase leading-tight ${TIER_STYLE[d.tier].fg}`}>{d.title}</p>
          <p className="mt-1 font-bold">{d.action}</p>
        </div>
      ) : (
        <p className="mt-4 text-ink-soft">This check wasn&apos;t finished.</p>
      )}

      <Card className="mt-4" aria-label="What you told WISP">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">What you told WISP</p>
        <dl className="mt-2 divide-y divide-line">
          {told(s).map((r) => (
            <div key={r.label} className="py-2.5">
              <dt className="text-[0.92rem] text-ink-soft">{r.label}</dt>
              <dd className="font-bold">{r.value}</dd>
            </div>
          ))}
          <div className="py-2.5">
            <dt className="text-[0.92rem] text-ink-soft">Movement check</dt>
            <dd className="font-bold">{move.text}</dd>
          </div>
        </dl>
      </Card>

      {(parent || followUps.length > 0) && (
        <Card className="mt-3" aria-label="Follow-ups">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Follow-ups</p>
          <ul className="mt-2 space-y-2">
            {parent && (
              <li>
                <Link href={`/history/${parent.session_id}`} className="font-bold text-forest underline underline-offset-4">
                  Earlier check ({dayLabel(parent.created_at).toLowerCase()})
                </Link>
                {parent.tier && <span className="text-ink-soft"> · {PATIENT_OUTCOME[parent.tier]}</span>}
              </li>
            )}
            {followUps.map((f) => (
              <li key={f.session_id}>
                <Link href={f.tier ? `/history/${f.session_id}` : `/check/concern?s=${f.session_id}`} className="font-bold text-forest underline underline-offset-4">
                  Follow-up ({dayLabel(f.created_at).toLowerCase()})
                </Link>
                <span className="text-ink-soft"> · {f.tier ? PATIENT_OUTCOME[f.tier] : "not finished"}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {d && (
        <>
          <div className="mt-4">
            <HowDecided snapshot={s} />
          </div>
          <nav aria-label="More about this check" className="mt-4 grid grid-cols-2 gap-2.5">
            <Link href={`/care/plan?s=${s.session_id}`} className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-card px-3 text-center font-bold">
              Care plan
            </Link>
            <Link href={`/care/visit-summary?s=${s.session_id}`} className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-card px-3 text-center font-bold">
              Visit summary
            </Link>
          </nav>
        </>
      )}
      <Link href={`/session/${s.session_id}`} className="mt-4 inline-flex min-h-11 items-center text-[0.95rem] font-bold text-forest underline underline-offset-4">
        See the conversation
      </Link>
    </div>
  );
}
