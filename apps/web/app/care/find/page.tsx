"use client";

import Link from "next/link";
import { CareShell } from "@/components/care/CareShell";
import { careHref, suitableProviders, useCareSession, whenToGo } from "@/lib/care";

export default function FindCare() {
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => {
        const d = s.disposition!;
        return (
          <>
            <h1 className="text-[1.9rem] font-bold leading-tight text-forest">Find care</h1>
            <p className="mt-2 text-ink-soft">{d.action}</p>
            {d.tier === "T1" && (
              <a href="tel:995" className="mt-5 flex min-h-16 items-center justify-center rounded-2xl bg-red text-[1.3rem] font-bold text-white">
                Call 995
              </a>
            )}
            <ul className="mt-5 space-y-3">
              {suitableProviders(d.tier, s.profile).map((p) => (
                <li key={p.id}>
                  <Link
                    href={careHref(`/care/provider/${p.id}`, s.session_id)}
                    className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-line bg-card p-5 hover:border-forest/40"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{p.kind}</p>
                      <p className="text-[1.1rem] font-bold">{p.name}</p>
                      <p className="text-[0.95rem] text-ink-soft">{whenToGo(d, p.id)}</p>
                    </div>
                    <span aria-hidden className="text-2xl text-ink-faint">›</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.95rem] text-ink-soft">WISP doesn&apos;t check opening hours or book appointments.</p>
          </>
        );
      }}
    </CareShell>
  );
}
