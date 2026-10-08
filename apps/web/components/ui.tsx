"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { SensingState } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";

const VARIANT: Record<Variant, string> = {
  primary: "bg-forest text-white shadow-(--shadow-soft) hover:bg-forest-deep disabled:bg-ink-faint disabled:shadow-none",
  secondary: "bg-card text-ink border-[1.5px] border-line hover:border-forest/50 hover:bg-sage/40",
  soft: "bg-sage text-forest hover:bg-sage-deep",
  ghost: "!px-3 text-forest underline underline-offset-4 decoration-forest/40 hover:decoration-forest",
  danger: "bg-red text-white shadow-(--shadow-soft) hover:bg-red-deep",
};
const SIZE = { md: "min-h-12 px-5 text-[1rem]", lg: "min-h-14 px-7 text-[1.06rem]" } as const;

/** Classes for anything that should look like a button (also used on <Link>). */
export function buttonClass(variant: Variant = "primary", size: "md" | "lg" = "lg", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-w-md text-center font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${SIZE[size]} ${VARIANT[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  return <button type="button" {...rest} className={buttonClass(variant, size, className)} />;
}

export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag {...rest} className={`rounded-(--radius-card) border border-line bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`label text-ink-faint ${className}`}>{children}</div>;
}

const SENSING: Record<SensingState, { label: string; dot: string; text: string }> = {
  OFF: { label: "Physical sensing OFF", dot: "bg-ink-faint", text: "text-ink-soft" },
  ACTIVE: { label: "Physical sensing ACTIVE", dot: "bg-teal animate-pulse", text: "text-teal" },
  COMPLETE: { label: "Physical sensing COMPLETE", dot: "bg-forest", text: "text-forest" },
  LOCKED: { label: "Physical sensing LOCKED", dot: "bg-red", text: "text-red" },
};

/** Technical/explain views only. */
export function SensingIndicator({ state }: { state: SensingState }) {
  const s = SENSING[state];
  return (
    <div role="status" className={`inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold ${s.text}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </div>
  );
}

export function RecordedBadge({ mode }: { mode: string | undefined }) {
  if (!mode || mode === "live") return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-w-sm border border-dashed border-ink-faint/70 bg-slate-bg px-2.5 py-1 text-[0.8rem] font-medium text-ink-soft">
      {mode === "synthetic_recorded" ? "Recorded sensor session · synthetic" : "Recorded sensor session"}
    </div>
  );
}

export function Disclosure({ summary, children, className = "" }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-forest [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
        {summary}
      </summary>
      <div className="mt-1 wisp-fade-in">{children}</div>
    </details>
  );
}
