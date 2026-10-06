"use client";

import { CareShell } from "@/components/care/CareShell";
import { Card } from "@/components/ui";
import { useCareSession } from "@/lib/care";
import { dayLabel, timeLabel } from "@/lib/tiers";

export default function CarePlan() {
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => {
        const d = s.disposition!;
        return (
          <>
            <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Your care plan</h1>
            <Card className="mt-5" aria-label="What to do">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">What to do · {d.timeframe}</p>
              <p className="mt-1 text-[1.15rem] font-bold">{d.action}</p>
            </Card>
            {d.self_care.length > 0 && (
              <Card className="mt-3" aria-label="Looking after yourself">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Looking after yourself</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {d.self_care.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </Card>
            )}
            {d.recheck && (
              <Card className="mt-3" aria-label="Next check-in">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Next check-in</p>
                <p className="mt-1 font-bold">
                  {dayLabel(d.recheck.due_at)} · {timeLabel(d.recheck.due_at)}
                </p>
              </Card>
            )}
            <Card className="mt-3 border-red/30" aria-label="If you feel worse">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-red">If you feel worse</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {d.worsening_signs.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-3 font-bold text-red">If any of these happen, call 995.</p>
            </Card>
          </>
        );
      }}
    </CareShell>
  );
}
