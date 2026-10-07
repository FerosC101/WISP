"use client";

import { Row, YouPage } from "@/components/you/YouPage";
import { Card } from "@/components/ui";
import { MAPS } from "@/lib/care";
import { useProfile } from "@/lib/useProfile";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function HealthProfile() {
  const { profile: p, error } = useProfile();
  return (
    <YouPage title="Health profile" intro="WISP uses this to tailor its questions and advice.">
      {error && <p className="text-ink-soft">WISP can&apos;t reach its local service right now.</p>}
      {p && (
        <div className="space-y-3">
          <Card aria-label="About you">
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">About you</p>
            <dl className="divide-y divide-line">
              <Row label="Age" value={p.age} />
              <Row label="Home" value={p.lives_alone ? "Lives alone" : "Lives with others"} />
            </dl>
          </Card>
          <Card aria-label="Health conditions">
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Health conditions</p>
            {p.conditions.length ? (
              <ul className="list-disc space-y-1 pl-5 text-[1.05rem]">
                {p.conditions.map((c) => (
                  <li key={c}>{capitalise(c)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">None recorded</p>
            )}
          </Card>
          <Card aria-label="Medicines">
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Medicines</p>
            {p.medications.length ? (
              <ul className="list-disc space-y-1 pl-5 text-[1.05rem]">
                {p.medications.map((m) => (
                  <li key={m}>{capitalise(m)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">None recorded</p>
            )}
            <p className="mt-2 text-[0.9rem] text-ink-soft">Your medicine list stays on this device. It isn&apos;t sent to WISP&apos;s assistant.</p>
          </Card>
          <Card aria-label="Mobility">
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Mobility</p>
            <dl className="divide-y divide-line">
              <Row label="Getting up from a chair" value={p.normally_stands_unaided ? "Usually on your own" : "Usually with help"} />
              <Row label="Walking aid" value={p.mobility_aid ? capitalise(p.mobility_aid) : "None"} />
            </dl>
          </Card>
          <Card aria-label="Usual GP">
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Usual GP</p>
            <p className="text-[1.08rem] font-bold">{p.usual_gp}</p>
            {p.usual_gp_details?.address && <p className="text-ink-soft">{p.usual_gp_details.address}</p>}
            <a
              href={
                p.usual_gp_details?.lat != null && p.usual_gp_details?.lng != null
                  ? `https://www.google.com/maps/dir/?api=1&destination=${p.usual_gp_details.lat},${p.usual_gp_details.lng}`
                  : MAPS(p.usual_gp)
              }
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4"
            >
              Directions
            </a>
          </Card>
          <p className="text-[0.92rem] text-ink-soft">These details come from your demo profile. Changing them isn&apos;t available in this prototype.</p>
        </div>
      )}
    </YouPage>
  );
}
