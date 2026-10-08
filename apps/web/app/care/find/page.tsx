"use client";

import { CareShell } from "@/components/care/CareShell";
import { ProviderCard } from "@/components/care/ProviderCard";
import { type Provider, suitableProviders, useCareSession, useMyLocation, whenToGo } from "@/lib/care";

function LocationPrompt({ loc, hasCoords }: { loc: ReturnType<typeof useMyLocation>; hasCoords: boolean }) {
  if (!hasCoords) return null;
  if (loc.state === "ok") return <p className="mt-4 text-[0.95rem] text-ink-soft">Distances use your location. It stays on this device.</p>;
  return (
    <div className="mt-4 rounded-w-md bg-sage px-4 py-3">
      <button type="button" onClick={loc.ask} disabled={loc.state === "asking"} className="min-h-11 font-bold text-forest underline underline-offset-4">
        {loc.state === "asking" ? "Finding your location…" : "Show how far away your clinic is"}
      </button>
      <p className="text-[0.92rem] text-ink-soft">
        {loc.state === "denied"
          ? "Location is turned off for WISP. You can still use Directions."
          : loc.state === "unavailable"
            ? "Your location isn't available right now. You can still use Directions."
            : "Your location stays on this device. It isn't saved or sent anywhere."}
      </p>
    </div>
  );
}

export default function FindCare() {
  const c = useCareSession();
  const loc = useMyLocation();
  return (
    <CareShell sid={c.sid} snapshot={c.snapshot} none={c.none} error={c.error}>
      {(s) => {
        const d = s.disposition!;
        const places = suitableProviders(d.tier, s.profile);
        const emergencyFallback = d.tier !== "T1" && d.tier !== "T2";
        const main = emergencyFallback ? places.filter((p) => p.id !== "ae") : places;
        const [best, ...others] = main;
        const ae = places.find((p) => p.id === "ae");
        const card = (p: Provider, isBest = false) => (
          <ProviderCard key={p.id} p={p} when={whenToGo(d, p.id)} sid={s.session_id} here={loc.here} best={isBest} />
        );
        return (
          <>
            <h1 className="text-[1.9rem] leading-tight text-forest sm:text-[2.2rem]">Find care</h1>
            <p className="mt-2 text-[1.05rem]">{d.action}</p>

            {d.tier === "T1" && (
              <a href="tel:995" className="mt-5 flex min-h-16 items-center justify-center rounded-w-md bg-red text-[1.3rem] font-bold text-white">
                Call 995
              </a>
            )}

            <LocationPrompt loc={loc} hasCoords={places.some((p) => p.lat != null)} />

            {best && (
              <section aria-labelledby="best-title" className="mt-5">
                <h2 id="best-title" className="font-serif text-[1.2rem] font-semibold text-forest">
                  Best for you now
                </h2>
                <ul className="mt-2">{card(best, true)}</ul>
              </section>
            )}
            {others.length > 0 && (
              <section aria-labelledby="other-title" className="mt-5">
                <h2 id="other-title" className="font-serif text-[1.2rem] font-semibold text-forest">
                  Other options
                </h2>
                <ul className="mt-2 space-y-3">{others.map((p) => card(p))}</ul>
              </section>
            )}
            {emergencyFallback && ae && (
              <section aria-labelledby="ae-title" className="mt-5">
                <h2 id="ae-title" className="font-serif text-[1.2rem] font-semibold text-red-deep">
                  In an emergency
                </h2>
                <ul className="mt-2">{card(ae)}</ul>
              </section>
            )}

            <p className="mt-5 rounded-w-md border border-line bg-card px-4 py-3 text-[0.95rem] text-ink-soft">
              WISP can&apos;t see opening hours, waiting times or appointment slots, and it doesn&apos;t book for you. Please call before you go. Clinic
              details here are demo listings for this prototype.
            </p>
          </>
        );
      }}
    </CareShell>
  );
}
