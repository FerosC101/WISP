"use client";

import { useEffect, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WS_URL, api, post } from "@/lib/api";
import { Button, Card } from "./ui";

interface Port {
  port: string;
  description: string;
  likely_esp32: boolean;
}
interface Status {
  port: string;
  state: "streaming_csi" | "text_only" | "silent" | "error" | "needs_wifi" | "connecting";
  device: {
    firmware: string;
    last?: string;
    ssid?: string;
    channel?: string;
    ip?: string;
    rate_hz?: string;
    fw?: string;
    disconnect_reason?: number | null;
    networks?: { ssid: string; rssi: number; channel: number; auth: number }[] | null;
  };
  packets_per_second: number;
  total_packets: number;
  total_text_lines: number;
  rssi: number | null;
  uptime_s: number;
  error: string | null;
}
interface Frame {
  status: Status;
  frame: { amplitude: number[] | null; energy: number | null };
  text: string[];
}

// ESP-IDF wifi_err_reason_t → plain explanation
const WIFI_REASON: Record<number, string> = {
  201: "Network not found. The sensor can only see 2.4 GHz networks — check the name (it is case-sensitive) or pick it from the scan below.",
  202: "The router rejected the sign-in. Check the password.",
  15: "Wrong password (the security handshake timed out).",
  204: "Wrong password (the security handshake failed).",
  203: "The router refused the connection (it may block new devices or require a sign-in page).",
  200: "The router stopped responding. Move the sensor closer.",
  2: "Authentication expired. Check the password.",
  8: "The router disconnected the sensor.",
};
const AUTH = ["Open", "WEP", "WPA", "WPA2", "WPA/WPA2", "Enterprise", "WPA3", "WPA2/WPA3", "WAPI", "OWE", "WPA3-Ent", "WPA3-Ent", "WPA3-Ent"];

const HISTORY = 120; // 30 s at 4 frames/s
const STATE: Record<Status["state"], { label: string; cls: string; help: string }> = {
  streaming_csi: { label: "Streaming CSI", cls: "bg-forest text-white", help: "The board is sending Wi-Fi channel data. Move in front of it and watch the motion trace." },
  text_only: {
    label: "Connected — no CSI",
    cls: "bg-amber text-white",
    help: "The board is sending text, but no CSI_DATA lines. The firmware on it is not CSI firmware (see the device output below). Flash esp-csi (hardware/esp32/README.md).",
  },
  silent: {
    label: "Connected — silent",
    cls: "bg-slate text-white",
    help: "The port is open but nothing is arriving. Press “Reset board” to see its boot log and which firmware it runs.",
  },
  error: { label: "Error", cls: "bg-red text-white", help: "The serial port reported an error." },
  needs_wifi: {
    label: "WISP firmware — needs Wi-Fi",
    cls: "bg-teal text-white",
    help: "The board runs WISP CSI firmware and is waiting for your Wi-Fi details. Enter them below; they are sent only to the board over USB.",
  },
  connecting: { label: "Joining Wi-Fi…", cls: "bg-teal text-white", help: "The board is connecting to your router. Use a 2.4 GHz network." },
};

function Heatmap({ columns }: { columns: number[][] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !columns.length) return;
    const ctx = c.getContext("2d")!;
    const rows = columns[0].length;
    c.width = HISTORY;
    c.height = rows;
    let lo = Infinity;
    let hi = -Infinity;
    for (const col of columns) {
      for (const v of col) {
        if (v > 0) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    const img = ctx.createImageData(HISTORY, rows);
    const offset = HISTORY - columns.length;
    columns.forEach((col, x) =>
      col.forEach((v, y) => {
        // One-hue sequential ramp (light sage → deep forest) for amplitude.
        const t = hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0;
        const i = (y * HISTORY + x + offset) * 4;
        img.data[i] = Math.round(233 - t * (233 - 22));
        img.data[i + 1] = Math.round(239 - t * (239 - 58));
        img.data[i + 2] = Math.round(231 - t * (231 - 44));
        img.data[i + 3] = 255;
      }),
    );
    ctx.putImageData(img, 0, 0);
  }, [columns]);
  return <canvas ref={ref} className="h-40 w-full rounded-lg border border-line [image-rendering:pixelated]" aria-label="CSI amplitude heatmap, subcarriers by time" />;
}

export function LiveSensor({ provider, onProviderChange }: { provider: { name: string; port?: string } | null; onProviderChange: () => void }) {
  const [ports, setPorts] = useState<Port[]>([]);
  const [port, setPort] = useState("");
  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [energy, setEnergy] = useState<{ i: number; e: number }[]>([]);
  const [columns, setColumns] = useState<number[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const consoleRef = useRef<HTMLPreElement>(null);
  const tick = useRef(0);
  const textLen = frame?.text.join("\n").length ?? 0;
  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [textLen]);

  useEffect(() => {
    api<{ ports: Port[] }>("/api/dev/sensor/ports").then((r) => {
      setPorts(r.ports);
      setPort((p) => p || r.ports.find((x) => x.likely_esp32)?.port || r.ports[0]?.port || "");
    });
    return () => wsRef.current?.close();
  }, []);

  function connect() {
    if (connected) {
      wsRef.current?.close();
      setConnected(false);
      return;
    }
    setError(null);
    setEnergy([]);
    setColumns([]);
    const ws = new WebSocket(`${WS_URL}/ws/sensor/live?port=${encodeURIComponent(port)}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === "error") return setError(m.message);
      setFrame(m);
      const i = tick.current++;
      if (m.frame.energy != null) setEnergy((prev) => [...prev.slice(-HISTORY + 1), { i, e: m.frame.energy }]);
      if (m.frame.amplitude) setColumns((prev) => [...prev.slice(-HISTORY + 1), m.frame.amplitude]);
    };
  }

  const st = frame?.status;
  const [ssid, setSsid] = useState("");
  const [pass, setPass] = useState("");
  const [wifiMsg, setWifiMsg] = useState<string | null>(null);
  async function sendWifi() {
    setWifiMsg(null);
    try {
      await post("/api/dev/sensor/wifi", { port, ssid, password: pass });
      setPass("");
      setWifiMsg("Sent to the sensor. It will restart and join the network.");
    } catch (e) {
      setWifiMsg((e as Error).message);
    }
  }
  const usingThis = provider?.name === "esp32" && provider.port === port;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Live sensor</h2>
          <p className="text-sm text-ink-soft">Reads the radio only while connected here. Data stays on this machine.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={port} onChange={(e) => setPort(e.target.value)} disabled={connected} className="min-h-11 rounded-xl border border-line bg-card px-3 text-sm" aria-label="Serial port">
            {ports.length === 0 && <option value="">No serial ports found</option>}
            {ports.map((p) => (
              <option key={p.port} value={p.port}>
                {p.port} {p.likely_esp32 ? "· ESP32?" : ""}
              </option>
            ))}
          </select>
          <Button onClick={connect} disabled={!port} variant={connected ? "secondary" : "primary"}>
            {connected ? "Disconnect" : "Connect"}
          </Button>
          {connected && (
            <Button variant="secondary" onClick={() => post("/api/dev/sensor/reset-board", { port })}>
              Reset board
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-bg px-3 py-2 text-sm text-red">{error}</p>}

      {connected && st && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATE[st.state].cls}`}>{STATE[st.state].label}</span>
            <span className="font-mono text-sm">{st.packets_per_second} pkt/s</span>
            <span className="font-mono text-sm">{st.total_packets} packets</span>
            <span className="font-mono text-sm">RSSI {st.rssi ?? "—"} dBm</span>
            <span className="font-mono text-sm text-ink-faint">{st.uptime_s}s</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{STATE[st.state].help}</p>
          {st.device?.firmware === "wisp" && (
            <p className="mt-1 font-mono text-xs text-ink-soft">
              WISP firmware{st.device.fw ? ` · ${st.device.fw}` : ""}
              {st.device.ssid && ` · network “${st.device.ssid}” · channel ${st.device.channel} · ${st.device.rate_hz} Hz pings`}
            </p>
          )}
          {st.device?.firmware === "wisp" && (
            <details className="mt-3 rounded-xl border border-line px-4 py-3" open={st.state === "needs_wifi"}>
              <summary className="cursor-pointer font-bold">Sensor Wi-Fi</summary>
              <p className="mt-2 text-sm text-ink-soft">
                The sensor joins your router and measures its replies. Details go from this page to the board over USB and are stored only on the board.
              </p>
              <form
                className="mt-3 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendWifi();
                }}
              >
                <input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Network name (2.4 GHz)" autoComplete="off" className="min-h-11 flex-1 rounded-xl border border-line px-3" aria-label="Wi-Fi network name" />
                <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Password" autoComplete="off" className="min-h-11 flex-1 rounded-xl border border-line px-3" aria-label="Wi-Fi password" />
                <Button type="submit" disabled={!ssid}>
                  Send to sensor
                </Button>
              </form>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => post("/api/dev/sensor/command", { port, command: "WISP_SCAN" })}>
                  Scan for networks
                </Button>
                <Button variant="secondary" onClick={() => post("/api/dev/sensor/command", { port, command: "WISP_STATUS" })}>
                  Ask for status
                </Button>
                <Button variant="secondary" onClick={() => post("/api/dev/sensor/command", { port, command: "WISP_FORGET" })}>
                  Forget Wi-Fi
                </Button>
              </div>
              {wifiMsg && <p className="mt-2 text-sm">{wifiMsg}</p>}
              {st.state !== "streaming_csi" && st.device.disconnect_reason != null && (
                <p className="mt-3 rounded-lg bg-amber-bg px-3 py-2 text-sm">
                  <strong>Can&apos;t join ({st.device.disconnect_reason}):</strong> {WIFI_REASON[st.device.disconnect_reason] ?? "The connection failed."}
                </p>
              )}
              {st.device.networks && (
                <div className="mt-3">
                  <p className="text-sm font-bold">Networks the sensor can see (2.4 GHz) — tap to use</p>
                  {st.device.networks.length === 0 ? (
                    <p className="text-sm text-ink-soft">None found. Is the router 2.4 GHz and nearby?</p>
                  ) : (
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {st.device.networks.map((n) => (
                        <li key={n.ssid + n.channel}>
                          <button
                            type="button"
                            onClick={() => setSsid(n.ssid)}
                            className={`rounded-full border px-3 py-1.5 text-sm ${ssid === n.ssid ? "border-forest bg-sage" : "border-line"}`}
                          >
                            {n.ssid} <span className="font-mono text-xs text-ink-faint">ch{n.channel} · {n.rssi} dBm · {AUTH[n.auth] ?? n.auth}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </details>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-sm font-bold text-ink-soft">Motion energy (last 30 s)</figcaption>
              <div className="h-40 rounded-lg border border-line">
                {energy.length > 1 ? (
                  <ResponsiveContainer>
                    <LineChart data={energy} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                      <XAxis dataKey="i" hide />
                      <YAxis tick={{ fontSize: 11, fill: "#767d8f" }} stroke="#d3ded0" width={44} />
                      <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(3) : String(v))} labelFormatter={() => ""} />
                      <Line type="monotone" dataKey="e" stroke="#1f4d3a" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-ink-faint">No CSI packets yet</p>
                )}
              </div>
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm font-bold text-ink-soft">CSI amplitude (subcarriers × time; darker = stronger)</figcaption>
              {columns.length ? <Heatmap columns={columns} /> : <p className="flex h-40 items-center justify-center rounded-lg border border-line text-sm text-ink-faint">No CSI packets yet</p>}
            </figure>
          </div>

          <figure className="mt-4">
            <figcaption className="mb-1 text-sm font-bold text-ink-soft">Device output (non-CSI lines)</figcaption>
            <pre ref={consoleRef} className="max-h-40 overflow-auto rounded-lg bg-ink px-3 py-2 font-mono text-xs leading-relaxed text-sage">
              {frame.text.length ? frame.text.join("\n") : "— nothing yet —"}
            </pre>
          </figure>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
        <span>
          Checks currently use: <strong>{provider?.name === "esp32" ? `live ESP32 (${provider.port})` : "recorded replay"}</strong>
        </span>
        {port && !usingThis && (
          <Button variant="secondary" onClick={async () => (await post("/api/dev/sensor", { provider: "esp32", port }), onProviderChange())}>
            Use this sensor for checks
          </Button>
        )}
        {provider?.name === "esp32" && (
          <Button variant="secondary" onClick={async () => (await post("/api/dev/sensor", { provider: "replay" }), onProviderChange())}>
            Switch back to recorded replay
          </Button>
        )}
      </div>
    </Card>
  );
}
