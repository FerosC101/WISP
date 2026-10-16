import { ImageResponse } from "next/og";

// Link preview image (shared links in chat apps and social posts).
export const alt = "WISP: know what to do next. Gentle guidance when something feels off.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 96px", background: "#faf7ee", color: "#2f4f3e" }}>
        <svg width="360" height="60" viewBox="0 0 400 60">
          <path d="M4 44 C 70 44, 96 14, 170 16 S 280 54, 352 40" fill="none" stroke="#a7b89f" strokeWidth="6" strokeLinecap="round" />
          <circle cx="372" cy="36" r="10" fill="#e3b567" />
        </svg>
        <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -2, marginTop: 28 }}>WISP</div>
        <div style={{ fontSize: 52, marginTop: 8, color: "#183c31" }}>Know what to do next.</div>
        <div style={{ fontSize: 28, marginTop: 36, color: "#5c6a64" }}>Self-triage and care navigation · Healthcare prototype, not a diagnosis</div>
      </div>
    ),
    size,
  );
}
