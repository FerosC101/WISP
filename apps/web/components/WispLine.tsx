/** THE WISP LINE: a soft flowing line — conversation → evidence → decision → care. */

export function WispLine({
  className = "",
  variant = "static",
  color = "currentColor",
}: {
  className?: string;
  variant?: "static" | "flow" | "draw";
  color?: string;
}) {
  const cls = variant === "flow" ? "wisp-line-flow" : variant === "draw" ? "wisp-line-draw" : "";
  return (
    <svg viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden className={className} fill="none">
      <path
        d="M2 26 C 60 26, 70 8, 130 10 S 200 34, 260 26 S 340 6, 398 14"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        className={cls}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function WispLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="text-[1.6rem] font-bold tracking-[0.04em] text-forest">wisp</span>
      <WispLine className="-mt-0.5 h-2 w-[3.2rem] text-teal" />
    </span>
  );
}
