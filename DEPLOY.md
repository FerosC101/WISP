# Deploying WISP

WISP has two parts, deployed separately:

| Part | What it is | Where it runs |
|---|---|---|
| **Web app** (`apps/web`) | Next.js patient app, plus the Technical (`/explain`) and Engineering (`/dev`) views | **Vercel** |
| **API** (`services`) | FastAPI with the deterministic safety engine, sensing pipeline, SQLite store and live updates over WebSockets | **A container host** (Docker) |

The API can't run on Vercel. It keeps WebSocket connections open, runs background sensing tasks, stores data on disk and, in live mode, reads the ESP32 over USB.

```
Browser ──HTTPS──▶ Vercel (web app) 
   └──────HTTPS + WSS──▶ your server: Caddy (TLS) ──▶ WISP API container (replay sensing, SQLite on a volume)
WorkBuddy ──MCP──▶ MCP server on your laptop ──HTTPS + token──▶ the same API
```

**What the cloud deployment does and doesn't do**
- **Sensing:** the cloud API uses **recorded, synthetic sensor sessions**. The app labels them **RECORDED SENSOR SESSION**. Live ESP32 sensing only works when the API runs on the computer the board is plugged into (`README.md`).
- **Shared demo data:** everyone using the deployment shares the same fictional demo personas. Anyone with the URL can use the Engineering view, including **Reset demo data**. Don't enter real health information.
- **Privacy notice:** the patient-facing privacy notice still applies. Raw sensing data never leaves the API. Symptom text only goes to an outside AI service if you set `WISP_LLM_*`.

---

## 1. Deploy the API (Docker)

### Option A: one cloud server with automatic HTTPS (recommended; for example Tencent Cloud Lighthouse or CVM)

Requirements:
- A Linux server with Docker, and ports **80 and 443** open.
- A hostname pointing at the server. If you don't have a domain, `sslip.io` works: a server at `203.0.113.10` is `203-0-113-10.sslip.io`.

```bash
git clone https://github.com/FerosC101/WISP.git && cd WISP/deploy
cp .env.example .env
#   WISP_API_DOMAIN   = api.example.com (or 203-0-113-10.sslip.io)
#   WISP_CORS_ORIGINS = https://<your-project>.vercel.app   (fill in after step 2 if you don't know it yet)
#   WISP_MCP_TOKEN    = $(openssl rand -hex 24)
docker compose up -d --build
curl https://api.example.com/api/health      # → {"ok":true,"sensor":{"name":"replay",...}}
```

Caddy gets the TLS certificate automatically and proxies both HTTPS and WebSockets. Data is kept in the `wisp-data` volume across restarts and updates. To update later:

```bash
git pull && docker compose up -d --build
```

### Option B: a managed container platform (Render, Railway, Fly.io, …)

- **Build:** point the platform at this repository with **root directory `services/`**; it uses `services/Dockerfile`.
- **HTTPS:** the platform provides it.
- **Environment:** set
  - `WISP_MCP_TOKEN` (required, 24+ characters)
  - `WISP_CORS_ORIGINS` (your Vercel URL)
  - optionally `WISP_CORS_ORIGIN_REGEX`
- **Port:** the platform sets `PORT`, and the image listens on it.
- **Storage:** attach a persistent disk at `/data`. Without one, check-ins reset when the container restarts.
- **Instances:** run **one instance**. State lives in a single SQLite file, and live updates are sent from the process that owns the session.

### API settings

| Variable | Required | Meaning |
|---|---|---|
| `WISP_MCP_TOKEN` | yes | Secret for the MCP tools API. The image **refuses to start** with the default token from this repo, or with any token shorter than 24 characters. |
| `WISP_CORS_ORIGINS` | yes | Comma-separated browser origins allowed to call the API. Use exact values, e.g. `https://wisp.vercel.app`. |
| `WISP_CORS_ORIGIN_REGEX` | no | Allows this project's Vercel preview URLs, e.g. `^https://wisp-[a-z0-9-]+\.vercel\.app$`. Never use `.*\.vercel\.app`, which would allow any Vercel site. |
| `WISP_REPLAY_SPEED` | no | `1.0` is real time (default); larger values speed up recorded sessions. |
| `WISP_LLM_BASE_URL`, `WISP_LLM_API_KEY`, `WISP_LLM_MODEL` | no | An OpenAI-compatible extractor such as Tencent Hunyuan. If set, **symptom text is sent to that service**. Safety decisions stay with the rules. |

The image sets `WISP_PUBLIC_DEPLOYMENT=1`, `WISP_SENSOR_MODE=replay` and `WISP_DATA_DIR=/data`. On every start, the container seeds the demo personas, the synthetic recordings and the demo baselines. Seeding is safe to repeat: existing check-ins and baselines are kept.

## 2. Deploy the web app (Vercel)

1. Vercel → **Add New → Project** → import `FerosC101/WISP`.
2. Set **Root Directory** to `apps/web`. Vercel detects Next.js; keep the default build settings.
3. Under **Environment Variables**, add `NEXT_PUBLIC_API_URL` = `https://api.example.com` (your API from step 1, with no trailing slash). Add it for Production and Preview.
4. Deploy.

The build **fails on purpose** if `NEXT_PUBLIC_API_URL` is missing or isn't `https://`. Browsers block an HTTPS site from calling an `http` API, so the deployment would otherwise be broken.

After the first deploy, put the Vercel URL into the API's `WISP_CORS_ORIGINS`, then restart the API:

```bash
docker compose up -d
```

`NEXT_PUBLIC_API_URL` is baked in at build time, so **redeploy on Vercel** whenever you change it.

### Check it works

- `https://<your-project>.vercel.app/today` greets Mdm Tan, rather than saying "WISP can't reach its local service". If you see that error, check `WISP_CORS_ORIGINS` and `NEXT_PUBLIC_API_URL`.
- Run a check-in through to a movement check. The movement screen should update live; that's the WebSocket through Caddy.
- `/dev` (Engineering view) shows **Sensor source: replay** and the **Assessment modules** card.

## 3. Optional: WorkBuddy against the cloud API

Keep the MCP server on the laptop that runs WorkBuddy, and point it at the cloud API:

```bash
cd services
WISP_API_URL=https://api.example.com WISP_MCP_TOKEN=<same token as the API> \
  uv run python -m wisp.mcp.server --http --port 8765
```

WorkBuddy's MCP config stays `http://127.0.0.1:8765/mcp` (`docs/workbuddy/README.md`). The token never goes to the browser or to Vercel.

## Local development is unchanged

```bash
./scripts/demo.sh            # API :8787 + web :3000, default local settings
```

The guard against the default token only applies when `WISP_PUBLIC_DEPLOYMENT=1`.
