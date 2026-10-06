"use client";

import { CareShell } from "@/components/care/CareShell";
import { Card } from "@/components/ui";
import { useCareSession } from "@/lib/care";
import { formatDate } from "@/lib/tiers";

export default function VisitSummary() {
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => {
        const d = s.disposition!;
        const k = s.case;
        const rows = [
          { label: "Main concern", value: k.complaint_text ?? k.complaint_summary ?? "—" },
          { label: "Movement check", value: k.comparison?.label ?? "Not done" },
          { label: "WISP's recommendation", value: `${d.title}. ${d.action}` },
        ];
        return (
          <>
            <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Visit summary</h1>
            <p className="mt-2 text-ink-soft">Show this to your doctor or nurse.</p>
            <Card className="mt-5">
              <p className="text-[0.95rem] text-ink-soft">
                {s.profile?.display_name} · {formatDate(k.created_at)}
              </p>
              <dl className="mt-3 divide-y divide-line">
                {rows.map((r) => (
                  <div key={r.label} className="py-3 first:pt-0 last:pb-0">
                    <dt className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{r.label}</dt>
                    <dd className="mt-0.5 text-[1.05rem]">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </>
        );
      }}
    </CareShell>
  );
}
