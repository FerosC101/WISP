"use client";

import { YouPage } from "@/components/you/YouPage";
import { Card } from "@/components/ui";
import { useProfile } from "@/lib/useProfile";

export default function TrustedPeople() {
  const { profile: p, error } = useProfile();
  const c = p?.caregiver;
  return (
    <YouPage title="Trusted people" intro="Someone WISP can send a short summary to, only when you say yes.">
      {error && <p className="text-ink-soft">WISP can&apos;t reach its local service right now.</p>}
      {p &&
        (c ? (
          <Card aria-label={c.name}>
            <p className="text-[1.15rem] font-bold">{c.name}</p>
            <p className="text-ink-soft">{c.relationship.charAt(0).toUpperCase() + c.relationship.slice(1)}</p>
          </Card>
        ) : (
          <Card>
            <p className="font-bold">No one added yet</p>
          </Card>
        ))}
      <ul className="mt-5 space-y-2 text-[1rem]">
        <li className="flex gap-3">
          <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
          WISP asks you every time before sharing anything.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
          You always see exactly what would be sent first.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
          Sensor data is never shared.
        </li>
      </ul>
    </YouPage>
  );
}
