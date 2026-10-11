"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CareDisposition, PublicProfile, Tier } from "./types";
import { useMe } from "./useMe";
import { useSession } from "./useSession";

export const MAPS = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;

/** Places to get care. WISP never claims opening hours or appointment availability. */
export interface Provider {
  id: "usual-gp" | "polyclinic" | "gp" | "ae";
  name: string;
  kind: string;
  about: string;
  mapQuery: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export function providers(profile: PublicProfile | null): Provider[] {
  const out: Provider[] = [];
  if (profile?.usual_gp) {
    const d = profile.usual_gp_details;
    out.push({
      id: "usual-gp",
      name: profile.usual_gp,
      kind: "Your usual doctor",
      about: "Your own doctor knows your history.",
      mapQuery: profile.usual_gp,
      address: d?.address ?? undefined,
      lat: d?.lat ?? undefined,
      lng: d?.lng ?? undefined,
    });
  }
  out.push(
    { id: "polyclinic", name: "Polyclinic", kind: "Polyclinic", about: "Government clinics for GP care, with lower fees.", mapQuery: "polyclinic near me" },
    { id: "gp", name: "GP clinic near you", kind: "Family doctor / GP", about: "Private family clinics, often open in the evening.", mapQuery: "GP clinic near me" },
    { id: "ae", name: "Emergency department (A&E)", kind: "Emergency department", about: "For emergencies, or if you can't be seen today.", mapQuery: "hospital emergency department near me" },
  );
  return out;
}

/** Directions to a known place, or a "near me" search that the maps app answers with the nearest ones. */
export function directionsHref(p: Provider) {
  return p.lat != null && p.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : MAPS(p.mapQuery);
}

/** Straight-line distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const distanceLabel = (km: number) => (km < 1 ? `About ${Math.round(km * 10) * 100} m away` : `About ${km.toFixed(1)} km away`);

/**
 * The patient's location, only after they ask for it. It stays in this page's memory:
 * never stored, never sent to WISP's service or the agent.
 */
export function useMyLocation() {
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<"idle" | "asking" | "denied" | "unavailable" | "ok">("idle");
  function ask() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return setState("unavailable");
    setState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setState("ok");
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { maximumAge: 300000, timeout: 10000 },
    );
  }
  return { here, state, ask };
}

/** Which places fit this recommendation, most suitable first. */
export function suitableProviders(tier: Tier, profile: PublicProfile | null): Provider[] {
  const all = providers(profile);
  const order: Record<Tier, Provider["id"][]> = {
    T1: ["ae"],
    T2: ["usual-gp", "polyclinic", "gp", "ae"],
    T3: ["usual-gp", "polyclinic", "gp", "ae"],
    T4: ["usual-gp", "polyclinic", "gp", "ae"],
    ABSTAIN: ["usual-gp", "polyclinic", "gp", "ae"],
  };
  return order[tier].map((id) => all.find((p) => p.id === id)).filter((p): p is Provider => !!p);
}

/** When to go, for this recommendation. */
export function whenToGo(d: CareDisposition, id: Provider["id"]): string {
  if (d.tier === "T1") return "Now. Call 995 if you can't get there safely.";
  if (id === "ae") return d.tier === "T2" ? "If no clinic can see you today, or you feel worse." : "Only if warning signs appear.";
  return d.timeframe;
}

/**
 * The check the Care section is about: `?s=` if given, otherwise the person's most
 * recent check that reached a recommendation.
 */
export function useCareSession() {
  const param = useSearchParams().get("s");
  const { me, recent, loaded } = useMe();
  const sid = param ?? recent?.session_id ?? undefined;
  const session = useSession(sid);
  return { ...session, sid, me, none: !param && loaded && !recent };
}

export const careHref = (path: string, sid: string | undefined) => (sid ? `${path}?s=${sid}` : path);
