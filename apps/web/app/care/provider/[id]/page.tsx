"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CareShell } from "@/components/care/CareShell";
import { Card } from "@/components/ui";
import { MAPS, careHref, providers, useCareSession, whenToGo } from "@/lib/care";

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const c = useCareSession();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => {
        const d = s.disposition!;
        const p = providers(s.profile).find((x) => x.id === id);
        if (!p) return <p className="text-ink-soft">This place isn&apos;t available.</p>;
        return (
          <>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{p.kind}</p>
            <h1 className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">{p.name}</h1>
            <p className="mt-2 text-ink-soft">{p.about}</p>
            <Card className="mt-5" aria-label="When to go">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">When to go</p>
              <p className="mt-1 text-[1.1rem] font-bold">{whenToGo(d, p.id)}</p>
            </Card>
            <a
              href={MAPS(p.mapQuery)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex min-h-14 items-center justify-center rounded-2xl bg-forest px-6 text-[1.08rem] font-bold text-white hover:bg-forest-deep"
            >
              Open in maps
            </a>
            <Link
              href={careHref("/care/visit-summary", s.session_id)}
              className="mt-3 flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-card px-6 text-[1.05rem] font-bold text-ink"
            >
              Show my visit summary
            </Link>
            <p className="mt-4 text-[0.95rem] text-ink-soft">WISP doesn&apos;t know opening hours or waiting times. Call ahead if you can.</p>
          </>
        );
      }}
    </CareShell>
  );
}
