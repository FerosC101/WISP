"use client";

import { useSearchParams } from "next/navigation";
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
}

export function providers(profile: PublicProfile | null): Provider[] {
  const out: Provider[] = [];
  if (profile?.usual_gp) {
    out.push({ id: "usual-gp", name: profile.usual_gp, kind: "Your usual GP", about: "Your family doctor knows your history.", mapQuery: profile.usual_gp });
  }
  out.push(
    { id: "polyclinic", name: "Polyclinic", kind: "Polyclinic", about: "Government clinics for GP care, with lower fees.", mapQuery: "polyclinic near me" },
    { id: "gp", name: "GP clinic near you", kind: "GP clinic", about: "Private family clinics, often open in the evening.", mapQuery: "GP clinic near me" },
    { id: "ae", name: "Emergency department (A&E)", kind: "Hospital A&E", about: "For emergencies, or if you can't be seen today.", mapQuery: "hospital emergency department near me" },
  );
  return out;
}

/** Which places fit this recommendation, most suitable first. */
export function suitableProviders(tier: Tier, profile: PublicProfile | null): Provider[] {
  const all = providers(profile);
  const order: Record<Tier, Provider["id"][]> = {
    T1: ["ae"],
    T2: ["usual-gp", "polyclinic", "gp", "ae"],
    T3: ["usual-gp", "polyclinic", "gp"],
    T4: ["usual-gp", "polyclinic", "gp"],
    ABSTAIN: ["usual-gp", "polyclinic", "gp"],
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
