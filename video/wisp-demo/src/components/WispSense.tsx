import React from "react";
import { C, SANS } from "../theme";

/*
 * WISP Sense — the proposed industrial-design concept for WISP's sensing device (an enclosure for the
 * existing ESP32-S3 Wi-Fi CSI prototype). Drawn natively in 2.5D from the concept reference:
 * a compact rounded vertical body in warm ivory matte, a forest-green base, a small green status LED,
 * a discreet leaf mark, a perforated top (antenna) and a USB-C port on the back of the base.
 *
 * It is a concept: it has not been fabricated or validated. Use <SenseTag/> wherever it appears.
 *
 * yaw: rotation about the vertical axis in radians (0 = front faces the viewer, π = back).
 */
export const WispSense: React.FC<{ height?: number; yaw?: number; led?: number; shadow?: boolean; id?: string }> = ({
  height = 420,
  yaw = -0.35,
  led = 1,
  shadow = true,
  id = "ws",
}) => {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  const R = 112; // body half-width at the base of the ivory shell
  const frontX = 150 + s * R * 0.78;
  const backX = 150 - s * R * 0.78;
  const hl = 0.3 - s * 0.16; // highlight drifts as it turns
  const front = c > 0;
  const showBack = c < 0.25;
  return (
    <svg viewBox="0 0 300 440" width={(height * 300) / 440} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0" stopColor="#CFC6B3" />
          <stop offset={Math.max(0.05, hl - 0.18)} stopColor="#EDE6D7" />
          <stop offset={hl} stopColor="#FBF8F1" />
          <stop offset={Math.min(0.9, hl + 0.32)} stopColor="#EAE3D3" />
          <stop offset="1" stopColor="#C8BFAB" />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="0" x2="1">
          <stop offset="0" stopColor="#24402F" />
          <stop offset={hl} stopColor="#4C6E58" />
          <stop offset="1" stopColor="#1E3628" />
        </linearGradient>
        <radialGradient id={`${id}-top`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#F4EFE3" />
          <stop offset="1" stopColor="#E2DACA" />
        </radialGradient>
        <radialGradient id={`${id}-led`}>
          <stop offset="0" stopColor="#B9F5B0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#7DDB7A" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M50 76 C50 34 86 22 150 22 C214 22 250 34 250 76 L260 352 C260 362 40 362 40 352 Z" />
        </clipPath>
        <clipPath id={`${id}-topclip`}>
          <ellipse cx={150} cy={40} rx={80} ry={12} />
        </clipPath>
      </defs>
      {shadow && <ellipse cx={150} cy={402} rx={150} ry={18} fill="#2b2216" opacity={0.16} />}
      {/* green base */}
      <path d="M36 344 C36 340 264 340 264 344 L268 384 C268 404 32 404 32 384 Z" fill={`url(#${id}-base)`} />
      <ellipse cx={150} cy={386} rx={118} ry={14} fill="#1B3125" opacity={0.6} />
      {/* ivory shell */}
      <path d="M50 76 C50 34 86 22 150 22 C214 22 250 34 250 76 L260 352 C260 362 40 362 40 352 Z" fill={`url(#${id}-body)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* matte texture */}
        <rect x={30} y={30} width={240} height={340} filter={`url(#${id}-grain)`} opacity={0.25} />
        {/* front marks ride the curved surface */}
        {front && (
          <g opacity={Math.min(1, c * 1.6)}>
            <g transform={`translate(${frontX} 196) scale(${Math.max(0.15, c)} 1)`}>
              <path d="M-14 16 C-16 -2 -2 -16 16 -20 C16 -2 4 14 -14 16 Z" fill="#5F8466" />
              <path d="M-12 14 C-4 4 4 -6 12 -16" stroke="#EAF0E4" strokeWidth={1.6} fill="none" opacity={0.6} />
            </g>
            <g transform={`translate(${frontX} 316) scale(${Math.max(0.15, c)} 1)`}>
              <circle r={22 * led} fill={`url(#${id}-led)`} />
              <rect x={-3} y={-11} width={6} height={22} rx={3} fill={led > 0.05 ? "#7FD87B" : "#A7B89F"} />
            </g>
          </g>
        )}
        {showBack && (
          <g opacity={Math.min(1, -c * 1.6 + 0.4)} transform={`translate(${backX} 196) scale(${Math.max(0.15, Math.abs(c))} 1)`}>
            {[-18, -9, 0, 9, 18].map((dx) => (
              <rect key={dx} x={dx - 2} y={-40} width={4} height={80} rx={2} fill="#8C8474" opacity={0.75} />
            ))}
          </g>
        )}
      </g>
      {/* perforated top */}
      <ellipse cx={150} cy={40} rx={82} ry={13} fill={`url(#${id}-top)`} />
      <g clipPath={`url(#${id}-topclip)`} fill="#B9B09D">
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 22 }).map((__, q) => {
            const x = 70 + q * 7.4 + (r % 2) * 3.7;
            const y = 29 + r * 2.8;
            return <circle key={`${r}-${q}`} cx={x} cy={y} r={1.25} />;
          }),
        )}
      </g>
      <path d="M60 56 C90 68 210 68 240 56" stroke="#fff" strokeOpacity={0.4} strokeWidth={2} fill="none" />
      {/* USB-C on the back of the base */}
      {showBack && (
        <g transform={`translate(${backX} 372) scale(${Math.max(0.2, Math.abs(c))} 1)`} opacity={Math.min(1, -c * 1.8 + 0.5)}>
          <rect x={-16} y={-6} width={32} height={12} rx={6} fill="#0F1D16" />
          <rect x={-10} y={-2} width={20} height={4} rx={2} fill="#6F8A79" />
        </g>
      )}
      <filter id={`${id}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="3" />
        <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0.5 0" />
      </filter>
    </svg>
  );
};

/** Honesty label for every appearance of the device. */
export const SenseTag: React.FC<{ dark?: boolean; short?: boolean; style?: React.CSSProperties }> = ({ dark, short, style }) => (
  <div
    style={{
      fontFamily: SANS,
      fontSize: 21,
      fontWeight: 600,
      letterSpacing: "0.02em",
      color: dark ? "#CFE0CC" : C.inkSoft,
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(255,253,248,0.92)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.16)" : C.line}`,
      borderRadius: 999,
      padding: "8px 18px",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {short ? "WISP Sense · design concept" : "WISP Sense · design concept around the ESP32-S3 prototype · not yet fabricated"}
  </div>
);
