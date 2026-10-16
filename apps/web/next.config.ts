import path from "node:path";
import type { NextConfig } from "next";

// On Vercel the WISP API runs elsewhere (see DEPLOY.md). Without NEXT_PUBLIC_API_URL the site is built as a
// labelled design preview that never calls an API; with it, it must be https (browsers block http APIs from HTTPS).
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const preview = !!process.env.VERCEL && !apiUrl;
if (process.env.VERCEL && apiUrl && !apiUrl.startsWith("https://")) {
  throw new Error(`NEXT_PUBLIC_API_URL must use https:// on Vercel (got ${apiUrl}); browsers block http APIs from an HTTPS site.`);
}
if (preview) console.warn("NEXT_PUBLIC_API_URL is not set: building a design preview with no backend (see DEPLOY.md).");

const nextConfig: NextConfig = {
  // Allow opening the dev server as 127.0.0.1 (or from an editor preview), not only "localhost".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: { root: path.join(__dirname) },
  // The e2e suite builds into its own directory so it never touches the dev server's output.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  env: { NEXT_PUBLIC_WISP_PREVIEW: preview ? "1" : "0" },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Voice input and "how far is my clinic" are the only device features WISP asks for.
          { key: "Permissions-Policy", value: "microphone=(self), geolocation=(self), camera=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
