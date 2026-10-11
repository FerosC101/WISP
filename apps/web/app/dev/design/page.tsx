"use client";

import { ICON_NAMES, Icon } from "@/components/Icon";
import { Illustration, type Scene } from "@/components/Illustration";
import { WispJourney, WispLine, WispLogo } from "@/components/WispLine";

/** Design-system reference (Engineering area): tokens, type, the WISP line, icons, illustrations. */
const SWATCHES = [
  ["Ivory", "bg-ivory", "#FAF7EE"],
  ["Card", "bg-card", "#FFFDF8"],
  ["Sand", "bg-sand", "#EFE4CF"],
  ["Sage surface", "bg-sage", "#E4EBDD"],
  ["Sage", "bg-sage-mid", "#A7B89F"],
  ["Muted teal", "bg-teal-soft", "#6E8F8F"],
  ["Dusty blue", "bg-dusty", "#8EA9C7"],
  ["Forest", "bg-forest", "#2F4F3E"],
  ["Deep forest", "bg-forest-deep", "#183C31"],
  ["Amber", "bg-amber-soft", "#E3B567"],
  ["Soft emergency", "bg-red-bg", "#F8E0DB"],
  ["Emergency", "bg-red", "#B94335"],
] as const;

const SCENES: Scene[] = ["rise", "room", "calm", "share", "healthy", "rest"];

export default function Design() {
  return (
    <div className="space-y-12 pb-16">
      <header>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-teal">Engineering view · design system</p>
        <h1 className="mt-1 text-[2rem] text-forest">WISP design reference</h1>
        <p className="text-ink-soft">Soft on the surface. Serious underneath.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-[1.5rem]">Wordmark</h2>
        <div className="flex flex-wrap items-end gap-10">
          <WispLogo size="xl" />
          <WispLogo size="lg" />
          <WispLogo />
        </div>
        <p className="font-serif text-[1.6rem] italic text-ink-soft">Gentle guidance when something feels off.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.5rem]">Colour</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([n, cls, hex]) => (
            <li key={n} className="rounded-w-md border border-line bg-card p-2">
              <div className={`h-16 rounded-[10px] ${cls}`} />
              <p className="mt-2 text-sm font-semibold">{n}</p>
              <p className="font-mono text-xs text-ink-faint">{hex}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.5rem]">Type</h2>
        <p className="display text-[3rem] text-forest">How are you feeling today?</p>
        <h2 className="text-[2rem]">Lora, for headings</h2>
        <p className="text-[1.1rem]">Inter for everything you read and press. Body text is 18 px, with generous line height.</p>
        <p className="label text-ink-soft">Section label · sentence case, never tiny capitals</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[1.5rem]">The WISP line</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {(["static", "draw", "flow", "breathe"] as const).map((v) => (
            <div key={v} className="rounded-w-md border border-line bg-card p-5">
              <p className="label text-ink-soft">{v}</p>
              <WispLine variant={v} className="mt-3 h-10 w-full text-forest" />
            </div>
          ))}
        </div>
        <div className="rounded-w-md border border-line bg-card p-5">
          {[0, 1, 2, 3].map((i) => (
            <WispJourney key={i} current={i} className="mb-4" />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.5rem]">Icons</h2>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {ICON_NAMES.map((n) => (
            <li key={n} className="flex flex-col items-center gap-1 rounded-w-sm border border-line bg-card py-3 text-forest">
              <Icon name={n} className="h-7 w-7" />
              <span className="text-[0.7rem] text-ink-faint">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.5rem]">Illustrations</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SCENES.map((s) => (
            <li key={s}>
              <Illustration scene={s} className="rounded-[22px]" />
              <p className="mt-1 font-mono text-xs text-ink-faint">{s}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
