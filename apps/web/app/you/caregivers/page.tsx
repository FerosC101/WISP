"use client";

import { useState } from "react";
import { YouPage } from "@/components/you/YouPage";
import { Button, Card } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { useProfile } from "@/lib/useProfile";

const RULES = [
  "WISP asks you every time before sharing anything.",
  "You always see exactly what would be sent first.",
  "By default only WISP's advice is shared. You choose whether to add the reasons.",
  "Sensor data, timings, medicines and conditions are never shared.",
];

export default function TrustedPeople() {
  const { profile: p, error, reload } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<string | null>(null);
  const c = p?.caregiver;

  async function remove() {
    if (!p || !c) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/api/profile/${p.user_id}/caregiver`, { method: "DELETE" });
      setRemoved(c.name);
      setConfirming(false);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <YouPage title="Trusted people" intro="Someone WISP can send a short summary to, only when you say yes.">
      {error && <p className="text-ink-soft">WISP can&apos;t reach its local service right now.</p>}
      {removed && (
        <p role="status" className="mb-3 rounded-2xl bg-sage px-4 py-3 font-bold text-forest">
          {removed} has been removed. WISP won&apos;t offer to share with them.
        </p>
      )}
      {p &&
        (c ? (
          <Card aria-label={c.name}>
            <p className="text-[1.15rem] font-bold">{c.name}</p>
            <p className="text-ink-soft">{c.relationship.charAt(0).toUpperCase() + c.relationship.slice(1)}</p>
            {!confirming ? (
              <button type="button" onClick={() => setConfirming(true)} className="mt-2 min-h-11 font-bold text-red underline underline-offset-4">
                Remove {c.name}
              </button>
            ) : (
              <div role="alertdialog" aria-labelledby="rm-title" className="mt-3 rounded-2xl border-2 border-red/40 bg-red-bg p-4">
                <p id="rm-title" className="font-bold text-red">
                  Remove {c.name}?
                </p>
                <p className="mt-1 text-[0.95rem]">WISP will stop offering to share with them. Anything already sent stays with them.</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="danger" disabled={busy} onClick={remove} className="flex-1">
                    Remove
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)} className="flex-1">
                    Keep
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <p className="font-bold">No one added</p>
            <p className="mt-1 text-[0.95rem] text-ink-soft">Adding someone isn&apos;t available in this prototype.</p>
          </Card>
        ))}
      <ul className="mt-5 space-y-2 text-[1rem]">
        {RULES.map((r) => (
          <li key={r} className="flex gap-3">
            <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
            {r}
          </li>
        ))}
      </ul>
    </YouPage>
  );
}
