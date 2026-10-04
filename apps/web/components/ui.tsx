"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { SensingState } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-ink disabled:bg-ink-faint",
  secondary: "bg-card text-ink border-2 border-line hover:border-ink-soft",
  ghost: "text-ink-soft hover:bg-grey-bg",
  danger: "bg-red text-white hover:brightness-95",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  const sz = size === "lg" ? "min-h-16 px-8 text-[1.15rem]" : "min-h-12 px-5 text-base";
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:cursor-not-allowed ${sz} ${VARIANT[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = "", as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; "aria-label"?: string; "aria-labelledby"?: string }) {
  return (
    <Tag {...rest} className={`rounded-[var(--radius-card)] border border-line bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </Tag>
  );
}

const SENSING: Record<SensingState, { label: string; dot: string; text: string }> = {
  OFF: { label: "Physical sensing OFF", dot: "bg-ink-faint", text: "text-ink-soft" },
  ACTIVE: { label: "Physical sensing ACTIVE", dot: "bg-teal wisp-pulse", text: "text-teal" },
  COMPLETE: { label: "Physical sensing COMPLETE", dot: "bg-navy", text: "text-navy" },
  LOCKED: { label: "Physical sensing LOCKED for this check", dot: "bg-red", text: "text-red" },
};

export function SensingIndicator({ state }: { state: SensingState }) {
  const s = SENSING[state];
  return (
    <div role="status" aria-live="polite" className={`inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold ${s.text}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </div>
  );
}

export function RecordedBadge({ mode }: { mode: string | undefined }) {
  if (!mode || mode === "live") return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-md border-2 border-dashed border-ink-soft bg-grey-bg px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-ink">
      {mode === "synthetic_recorded" ? "Recorded sensor session · synthetic CSI" : "Recorded sensor session"}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">{children}</div>;
}
