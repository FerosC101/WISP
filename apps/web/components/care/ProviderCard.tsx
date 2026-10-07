"use client";

import Link from "next/link";
import { type Provider, careHref, directionsHref, distanceKm, distanceLabel } from "@/lib/care";

/** One place to get care. Shows only what WISP actually knows: no hours, no availability. */
export function ProviderCard({
  p,
  when,
  sid,
  here,
  best = false,
}: {
  p: Provider;
  when: string;
  sid: string;
  here: { lat: number; lng: number } | null;
  best?: boolean;
}) {
  const km = here && p.lat != null && p.lng != null ? distanceKm(here, { lat: p.lat, lng: p.lng }) : null;
  return (
    <li className={`rounded-(--radius-card) border-2 bg-card p-5 ${best ? "border-forest" : "border-line"}`}>
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{p.kind}</p>
      <p className="mt-0.5 text-[1.15rem] font-bold">{p.name}</p>
      {p.address && <p className="text-[0.95rem] text-ink-soft">{p.address}</p>}
      {km != null && <p className="mt-1 text-[0.95rem] font-bold text-teal">{distanceLabel(km)}</p>}
      <p className="mt-2 text-[1rem]">
        <span className="text-ink-soft">When: </span>
        <span className="font-bold">{when}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={directionsHref(p)}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 font-bold ${best ? "bg-forest text-white hover:bg-forest-deep" : "border-2 border-line bg-card text-ink hover:border-forest/50"}`}
        >
          {p.lat != null ? "Directions" : "Find nearest"}
        </a>
        <Link
          href={careHref(`/care/provider/${p.id}`, sid)}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-line bg-card px-4 font-bold text-ink hover:border-forest/50"
        >
          Details
        </Link>
      </div>
    </li>
  );
}
