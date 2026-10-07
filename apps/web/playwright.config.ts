import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against an isolated stack: a freshly seeded API on :8788 with its
 * own data directory (fast recorded-sensor replay) and a production build of the web
 * app on :3100 built into `.next-e2e`. The demo's `data/`, :8787 and :3000 are never touched.
 */
const API_PORT = 8788;
const WEB_PORT = 3100;
const API = `http://127.0.0.1:${API_PORT}`;
const WEB = `http://127.0.0.1:${WEB_PORT}`;
const services = path.join(__dirname, "..", "..", "services");
const dataDir = path.join(__dirname, ".e2e", "data");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // one shared API; each test resets it
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `rm -rf "${dataDir}" && uv run python -m wisp.demo.seed && uv run uvicorn wisp.api.main:app --host 127.0.0.1 --port ${API_PORT} --log-level warning`,
      cwd: services,
      url: `${API}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        WISP_DATA_DIR: dataDir,
        WISP_SENSOR_MODE: "replay",
        WISP_REPLAY_SPEED: "8",
        WISP_SAVE_RAW_CSI: "0",
        WISP_CORS_ORIGINS: WEB,
      },
    },
    {
      command: `npm run build && npx next start --hostname 127.0.0.1 --port ${WEB_PORT}`,
      url: `${WEB}/today`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: API, NEXT_DIST_DIR: ".next-e2e" },
    },
  ],
});

export { API };
