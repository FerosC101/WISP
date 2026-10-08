"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Illustration, type Scene } from "./Illustration";
import { WispLine } from "./WispLine";

/**
 * WISP patient UI kit: reusable building blocks so screens share one calm,
 * accessible language instead of one-off markup.
 */

/** Page heading: optional label, serif title, the WISP line, and a short lead. */
export function PageIntro({
  label,
  title,
  lead,
  line = true,
  id,
  as: H = "h1",
  size = "lg",
  className = "",
  headingRef,
}: {
  label?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  line?: boolean;
  id?: string;
  as?: "h1" | "h2";
  size?: "md" | "lg" | "xl";
  className?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const t = size === "xl" ? "text-[2.35rem] sm:text-[3rem]" : size === "lg" ? "text-[2rem] sm:text-[2.4rem]" : "text-[1.6rem] sm:text-[1.8rem]";
  return (
    <header className={className}>
      {label && <p className="label text-teal">{label}</p>}
      <H id={id} ref={headingRef} tabIndex={headingRef ? -1 : undefined} className={`${label ? "mt-1.5" : ""} ${t} leading-[1.12] text-forest focus:outline-none`}>
        {title}
      </H>
      {line && <WispLine variant="draw" className="mt-3 h-4 w-28 text-sage-mid" />}
      {lead && <p className="mt-3 max-w-prose text-[1.06rem] text-ink-soft">{lead}</p>}
    </header>
  );
}

/** A large, soft selectable tile (symptoms, durations, choices). */
export function LargeChoice({
  icon,
  label,
  detail,
  selected,
  onClick,
  disabled,
  role = "checkbox",
  tone = "sage",
}: {
  icon?: IconName;
  label: string;
  detail?: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  role?: "checkbox" | "radio" | "button";
  tone?: "sage" | "dusty" | "sand" | "plain";
}) {
  const toneBg = { sage: "bg-sage", dusty: "bg-dusty-bg", sand: "bg-sand-soft", plain: "bg-card" }[tone];
  return (
    <button
      type="button"
      role={role === "button" ? undefined : role}
      aria-checked={role === "button" ? undefined : !!selected}
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex h-full min-h-[4.5rem] w-full items-center gap-3.5 rounded-w-md border-[1.5px] px-4 py-3.5 text-left transition-all duration-200 disabled:opacity-60 ${
        selected ? "border-forest bg-card shadow-(--shadow-soft)" : `border-transparent ${toneBg} hover:border-forest/30`
      }`}
    >
      {icon && (
        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selected ? "bg-forest text-white" : "bg-card/80 text-forest"}`}>
          <Icon name={icon} className="h-6 w-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[1.06rem] font-semibold leading-snug text-ink">{label}</span>
        {detail && <span className="mt-0.5 block text-[0.92rem] leading-snug text-ink-soft">{detail}</span>}
      </span>
      {role !== "button" && (
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? "border-forest bg-forest text-white" : "border-ink-faint/50 bg-card"}`}
        >
          {selected && <Icon name="check-mark" className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}

/** Status shown with a dot *and* words — never colour alone. */
export function StatusLine({ tone, children }: { tone: "good" | "attention" | "neutral" | "urgent"; children: ReactNode }) {
  const dot = { good: "bg-forest", attention: "bg-amber-soft", neutral: "bg-ink-faint", urgent: "bg-red" }[tone];
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/** A quiet row that links somewhere: icon, title, detail, chevron. */
export function LinkRow({ href, icon, title, detail, right }: { href: string; icon?: IconName; title: ReactNode; detail?: ReactNode; right?: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3.5 rounded-w-md px-1 py-3 transition-colors hover:bg-sage/50">
      {icon && (
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[1.05rem] font-semibold">{title}</span>
        {detail && <span className="block text-[0.94rem] text-ink-soft">{detail}</span>}
      </span>
      {right}
      <Icon name="chevron-right" className="h-5 w-5 text-ink-faint" />
    </Link>
  );
}

/** Emergency actions: always obvious, never more than two. */
export function EmergencyAction({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <a href="tel:995" className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-w-md bg-red px-8 text-[1.3rem] font-bold text-white hover:bg-red-deep">
        <Icon name="phone" className="h-6 w-6" strokeWidth={2} />
        Call 995
      </a>
    </div>
  );
}

/** Empty state with a gentle illustration and one clear next step. */
export function EmptyState({ scene = "rest", title, body, action }: { scene?: Scene; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <section className="mx-auto max-w-md py-6 text-center">
      <Illustration scene={scene} decorative className="mx-auto max-w-[17rem] rounded-w-lg" />
      <h2 className="mt-6 text-[1.5rem] text-forest">{title}</h2>
      {body && <p className="mt-2 text-ink-soft">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
