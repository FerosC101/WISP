"use client";

import { Icon, type IconName } from "@/components/Icon";
import { LinkRow, PageIntro } from "@/components/kit";
import { STATUS_WORDS, baselineStatus, useBaseline } from "@/lib/baseline";
import { LANGUAGE_NAMES, usePrefs, useUserId } from "@/lib/prefs";
import { useProfile } from "@/lib/useProfile";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mt-7">
      <h2 className="mb-2 text-[1.2rem] text-forest">{title}</h2>
      <div className="divide-y divide-line rounded-w-lg border border-line bg-card px-4 shadow-(--shadow-soft)">{children}</div>
    </section>
  );
}

function Item({ href, icon, title, detail }: { href: string; icon: IconName; title: string; detail: string }) {
  return <LinkRow href={href} icon={icon} title={title} detail={detail} />;
}

export default function You() {
  const { language, largeText, reduceMotion } = usePrefs();
  const userId = useUserId();
  const { profile, error } = useProfile();
  const { data: baseline } = useBaseline(userId);
  const caregiver = profile?.caregiver;

  return (
    <div className="mx-auto max-w-xl pt-1 sm:pt-6">
      <PageIntro
        label="You"
        title={profile?.display_name ?? "Your profile"}
        lead={profile ? `${profile.age} · ${profile.lives_alone ? "Lives alone" : "Lives with others"}` : undefined}
      />
      {error && (
        <p role="alert" className="mt-4 rounded-w-sm bg-amber-bg px-4 py-3 text-amber">
          WISP can&apos;t reach its local service right now.
        </p>
      )}

      <Group title="Your health">
        <Item
          href="/you/health"
          icon="heart"
          title="Health profile"
          detail={profile ? `Conditions, medicines, mobility, ${profile.usual_gp}` : "Conditions, medicines, mobility, usual GP"}
        />
      </Group>

      <Group title="My usual">
        <Item
          href="/you/baseline"
          icon="movement"
          title="My usual"
          detail={baseline ? STATUS_WORDS[baselineStatus(baseline)].title : "Your healthy-day movement checks"}
        />
      </Group>

      <Group title="People you trust">
        <Item
          href="/you/caregivers"
          icon="family"
          title="Trusted people"
          detail={caregiver ? `${caregiver.name} (${caregiver.relationship})` : "No one added yet"}
        />
      </Group>

      <Group title="Preferences">
        <Item href="/you/language" icon="language" title="Language" detail={LANGUAGE_NAMES[language]} />
        <Item
          href="/you/accessibility"
          icon="accessibility"
          title="Accessibility"
          detail={[largeText ? "Larger text on" : "Standard text", reduceMotion ? "less motion" : null].filter(Boolean).join(" · ")}
        />
      </Group>

      <Group title="Your data">
        <Item href="/you/privacy" icon="lock" title="Privacy and your data" detail="What WISP keeps, what it shares, download or delete your data" />
      </Group>

      <section aria-label="About WISP" className="mt-7 rounded-w-lg bg-sage px-5 py-5">
        <h2 className="flex items-center gap-2 text-[1.2rem] text-forest">
          <Icon name="leaf" className="h-5 w-5" />
          About WISP
        </h2>
        <p className="mt-2 text-ink-soft">Gentle guidance when something feels off.</p>
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="font-semibold">How it works</dt>
            <dd className="text-ink-soft">
              You tell WISP how you feel. It checks for warning signs first, then decides whether a short movement check would help, and tells you what to do
              next.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Limitations</dt>
            <dd className="text-ink-soft">WISP is a prototype. It doesn&apos;t diagnose, and its movement check compares you only with your own healthy days.</dd>
          </div>
          <div>
            <dt className="font-semibold">Safety</dt>
            <dd className="text-ink-soft">Fixed safety rules, not the AI, decide how urgent things are. Any warning sign means getting help now.</dd>
          </div>
        </dl>
        <p className="mt-2 text-ink-soft">
          In an emergency, call <strong className="text-red-deep">995</strong>.
        </p>
      </section>
    </div>
  );
}
