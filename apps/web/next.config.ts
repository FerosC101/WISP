import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server as 127.0.0.1 (or from an editor preview), not only "localhost".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
