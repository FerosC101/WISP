# WISP API (FastAPI + deterministic safety engine) for a cloud container host.
# Build from this directory:  docker build -t wisp-api .
# Runs with recorded (replay) sensor sessions; live ESP32 sensing needs the API on the machine the board is plugged into.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first, so code changes don't reinstall them.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
RUN uv sync --frozen --no-dev

# Runtime data (SQLite, signing key, synthetic recordings) lives on a volume. The demo personas and
# synthetic recordings are created on first start.
ENV WISP_DATA_DIR=/data \
    WISP_SENSOR_MODE=replay \
    WISP_PUBLIC_DEPLOYMENT=1 \
    PORT=8787
VOLUME /data

RUN useradd --create-home --uid 10001 wisp && mkdir -p /data && chown wisp /data
USER wisp

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/api/health', timeout=4)"

# --proxy-headers: the host's HTTPS proxy terminates TLS (wss:// for live updates included).
# Seed first: personas, synthetic recordings, and demo baselines (idempotent; existing data is kept).
CMD ["sh", "-c", "/app/.venv/bin/python -m wisp.demo.seed && exec /app/.venv/bin/uvicorn wisp.api.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
