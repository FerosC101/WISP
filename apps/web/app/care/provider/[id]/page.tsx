"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CareShell } from "@/components/care/CareShell";
import { Card } from "@/components/ui";
import { careHref, directionsHref, distanceKm, distanceLabel, providers, useCareSession, useMyLocation, whenToGo } from "@/lib/care";

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const c = useCareSession();
  const loc = useMyLocation();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => {
        const d = s.disposition!;
        const p = providers(s.profile).find((x) => x.id === id);
        if (!p) return <p className="text-ink-soft">This place isn&apos;t available.</p>;
        const known = p.lat != null && p.lng != null;
        const km = known && loc.here ? distanceKm(loc.here, { lat: p.lat!, lng: p.lng! }) : null;
        return (
          <>
            <Link href={careHref("/care/find", s.session_id)} className="inline-flex min-h-11 items-center font-bold text-forest">
              ‹ All places
            </Link>
            <p className="mt-2 label text-ink-faint">{p.kind}</p>
            <h1 className="mt-1 text-[1.9rem] font-bold leading-tight text-forest">{p.name}</h1>
            <p className="mt-2 text-ink-soft">{p.about}</p>

            <Card className="mt-5" aria-label="Where">
              <p className="label text-ink-faint">Where</p>
              <p className="mt-1 text-[1.05rem]">{p.address ?? "Your maps app will show the nearest ones."}</p>
              {km != null && <p className="mt-1 font-bold text-teal">{distanceLabel(km)}</p>}
              {known && loc.state !== "ok" && (
                <button type="button" onClick={loc.ask} className="mt-1 min-h-11 font-bold text-forest underline underline-offset-4">
                  {loc.state === "asking" ? "Finding your location…" : "Show how far away it is"}
                </button>
              )}
            </Card>

            <Card className="mt-3" aria-label="When to go">
              <p className="label text-ink-faint">When to go</p>
              <p className="mt-1 text-[1.1rem] font-bold">{whenToGo(d, p.id)}</p>
            </Card>

            <Card className="mt-3" aria-label="Opening hours and appointments">
              <p className="label text-ink-faint">Opening hours and appointments</p>
              <p className="mt-1 text-[1.05rem]">
                {p.id === "ae"
                  ? "Hospital emergency departments in Singapore are open 24 hours. In an emergency, call 995."
                  : "WISP can't see these. Please call the clinic or check its website before you go."}
              </p>
            </Card>

            <a
              href={directionsHref(p)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex min-h-14 items-center justify-center rounded-w-md bg-forest px-6 text-[1.08rem] font-bold text-white hover:bg-forest-deep"
            >
              {known ? "Directions" : "Find the nearest"}
            </a>
            <Link
              href={careHref("/care/visit-summary", s.session_id)}
              className="mt-3 flex min-h-14 items-center justify-center rounded-w-md border-2 border-line bg-card px-6 text-[1.05rem] font-bold text-ink"
            >
              Show my visit summary
            </Link>
          </>
        );
      }}
    </CareShell>
  );
}
