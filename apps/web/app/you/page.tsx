"use client";

import Link from "next/link";
import { STATUS_WORDS, baselineStatus, useBaseline } from "@/lib/baseline";
import { LANGUAGE_NAMES, usePrefs, useUserId } from "@/lib/prefs";
import { useProfile } from "@/lib/useProfile";

function Item({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center justify-between gap-3 px-5 py-3 hover:bg-sage/40">
        <span className="min-w-0">
          <span className="block text-[1.08rem] font-bold">{title}</span>
          <span className="block text-[0.92rem] text-ink-soft">{detail}</span>
        </span>
        <span aria-hidden className="text-2xl text-ink-faint">›</span>
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mt-5">
      <h2 className="mb-2 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-card">{children}</ul>
    </section>
  );
}

export default function You() {
  const { language, largeText, reduceMotion } = usePrefs();
  const userId = useUserId();
  const { profile, error } = useProfile();
  const { data: baseline } = useBaseline(userId);
  const caregiver = profile?.caregiver;

  return (
    <div className="mx-auto max-w-xl pt-2 sm:pt-8">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">You</p>
      <h1 className="mt-1 text-[2rem] font-bold leading-[1.15] text-forest">{profile?.display_name ?? "Your profile"}</h1>
      {profile && (
        <p className="mt-1 text-ink-soft">
          {profile.age} · {profile.lives_alone ? "Lives alone" : "Lives with others"}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-amber">
          WISP can&apos;t reach its local service right now.
        </p>
      )}

      <Group title="Your health">
        <Item href="/you/health" title="Health profile" detail={profile ? `Conditions, medicines, mobility, ${profile.usual_gp}` : "Conditions, medicines, mobility, usual GP"} />
        <Item href="/you/baseline" title="My usual" detail={baseline ? STATUS_WORDS[baselineStatus(baseline)].title : "Your healthy-day movement checks"} />
      </Group>

      <Group title="People">
        <Item
          href="/you/caregivers"
          title="Trusted people"
          detail={caregiver ? `${caregiver.name} (${caregiver.relationship})` : "No one added yet"}
        />
      </Group>

      <Group title="Settings">
        <Item href="/you/language" title="Language" detail={LANGUAGE_NAMES[language]} />
        <Item
          href="/you/accessibility"
          title="Accessibility"
          detail={[largeText ? "Larger text on" : "Standard text", reduceMotion ? "less motion" : null].filter(Boolean).join(" · ")}
        />
      </Group>

      <Group title="Privacy">
        <Item href="/you/privacy" title="Privacy and your data" detail="What WISP keeps, what it shares, deleting your data" />
      </Group>
    </div>
  );
}
