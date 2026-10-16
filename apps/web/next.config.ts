import path from "node:path";
import type { NextConfig } from "next";

// On Vercel the WISP API runs elsewhere (see DEPLOY.md). Fail the build with a clear message rather than
// shipping a site that silently calls http://127.0.0.1 or an insecure API from an HTTPS page.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (process.env.VERCEL) {
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set. Point it at the deployed WISP API, e.g. https://api.example.com (see DEPLOY.md).");
  if (!apiUrl.startsWith("https://")) throw new Error(`NEXT_PUBLIC_API_URL must use https:// on Vercel (got ${apiUrl}); browsers block http APIs from an HTTPS site.`);
}

const nextConfig: NextConfig = {
  // Allow opening the dev server as 127.0.0.1 (or from an editor preview), not only "localhost".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: { root: path.join(__dirname) },
  // The e2e suite builds into its own directory so it never touches the dev server's output.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
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
