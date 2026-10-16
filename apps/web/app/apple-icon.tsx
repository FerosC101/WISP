import { ImageResponse } from "next/og";

// Home-screen icon for iPhone: the WISP line on forest green.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#2f4f3e" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M11 41 C 21 27, 33 22, 45 26" fill="none" stroke="#faf7ee" strokeWidth="5" strokeLinecap="round" />
          <circle cx="51" cy="27" r="4.5" fill="#e3b567" />
        </svg>
      </div>
    ),
    size,
  );
}
