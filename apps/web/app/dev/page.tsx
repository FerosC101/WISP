"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card } from "@/components/ui";
import { api, post } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { AuditEvent, FunctionalAssessment, Persona, Snapshot } from "@/lib/types";

interface SensorInfo {
  name: string;
  mode: string;
  available: boolean;
  live_counts: boolean;
  sensor_mode: string;
  recordings?: string[];
  manifest?: Record<string, { baseline: string[]; today?: string; interference?: string }>;
  next_override?: string | null;
  speed?: number;
}
interface MeasurementDetail {
  measurement: FunctionalAssessment;
  debug: {
    trace?: { t: number[]; energy: number[]; posture: number[] };
    features?: Record<string, number>;
    onset_s?: number;
    offset_s?: number;
    stand_peaks_s?: number[];
    error?: string;
  };
}
interface Evaluation {
  n_sessions: number;
  n_failures: number;
  mae_seconds: number | null;
  median_abs_error_seconds: number | null;
  mean_confidence: number | null;
  rows: { measurement_id: string; ground_truth_seconds: number; wisp_seconds: number | null; method: string; provider_mode: string; success: boolean }[];
  note: string;
}

const INK = "#1f4d3a";

const DEMOS = [
  { n: 1, title: "Agent uses sensing", user: "mdm_tan", text: "I've felt weak for two days." },
  { n: 2, title: "Agent refuses sensing", user: "mr_lim", text: "This morning I suddenly felt dizzy and my left hand feels clumsy." },
  { n: 3, title: "Dynamic reassessment (day 1)", user: "mdm_siti", text: "I'm tired and don't feel like myself." },
];

function SignalChart({ title, data, dataKey, detail }: { title: string; data: Record<string, number>[]; dataKey: string; detail: MeasurementDetail["debug"] }) {
  return (
    <figure>
      <figcaption className="mb-1 text-sm font-bold text-ink-soft">{title}</figcaption>
      <div className="h-44">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#ece7de" vertical={false} />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 11, fill: "#737b90" }} tickFormatter={(v) => `${v}s`} stroke="#d8d2c6" />
            <YAxis tick={{ fontSize: 11, fill: "#737b90" }} stroke="#d8d2c6" width={48} />
            {detail.onset_s != null && detail.offset_s != null && (
              <ReferenceArea x1={detail.onset_s} x2={detail.offset_s} fill="#e2f1ef" fillOpacity={0.6} />
            )}
            {detail.stand_peaks_s?.map((p) => <ReferenceLine key={p} x={p} stroke="#737b90" strokeDasharray="3 3" />)}
            <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(3) : String(v))} labelFormatter={(l) => `t = ${l}s`} />
            <Line type="monotone" dataKey={dataKey} stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export default function DevPage() {
  const { devMode, setDevMode, agentMode, setAgentMode, userId, setUserId, language } = usePrefs();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [auditFilter, setAuditFilter] = useState<"all" | "workbuddy">("all");
  const [sensor, setSensor] = useState<SensorInfo | null>(null);
  const [measurements, setMeasurements] = useState<FunctionalAssessment[]>([]);
  const [selected, setSelected] = useState<MeasurementDetail | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [gt, setGt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);
  useEffect(() => {
    Promise.all([
      api<SensorInfo>("/api/dev/sensor"),
      api<FunctionalAssessment[]>("/api/dev/measurements"),
      api<AuditEvent[]>("/api/audit"),
      api<Evaluation>("/api/evaluation/sensor"),
      api<Persona[]>("/api/personas"),
    ]).then(([s, m, a, e, ps]) => {
      setPersonas(ps);
      setSensor(s);
      setMeasurements(m.reverse());
      setAudit(a.slice(-200).reverse());
      setEvaluation(e);
    });
  }, [reloadKey]);

  const runDemo = async (user: string, text: string) => {
    setUserId(user);
    const snap = await post<Snapshot>("/api/sessions", { user_id: user, agent: agentMode, language, text: agentMode === "workbuddy" ? undefined : text });
    router.push(`/session/${snap.session_id}`);
  };
  const update = async (body: Record<string, unknown>) => setSensor(await post<SensorInfo>("/api/dev/sensor", body));
  const open = async (id: string) => setSelected(await api<MeasurementDetail>(`/api/dev/measurements/${id}`));

  const tr = selected?.debug.trace;
  const series = tr ? tr.t.map((t, i) => ({ t, energy: tr.energy[i], posture: tr.posture[i] ?? 0 })) : [];

  return (
    <div className="space-y-6 font-[system-ui]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-teal">Engineering view</p>
          <h1 className="text-2xl font-bold text-forest">Sensing, agent &amp; demo diagnostics</h1>
          <p className="text-sm text-ink-soft">Not linked from the patient app. Raw CSI-derived signals are only shown here.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} className="h-5 w-5" />
          Demo mode (shows the DEMO bar and demo controls in the patient app)
        </label>
      </div>

      <Card>
        <h2 className="font-bold">Demo setup</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>Patient profile:</span>
          {personas.map((p) => (
            <button
              key={p.user_id}
              onClick={() => setUserId(p.user_id)}
              aria-pressed={userId === p.user_id}
              className={`rounded-full px-3 py-1.5 ${userId === p.user_id ? "bg-forest text-white" : "border border-line bg-card"}`}
            >
              {p.display_name} · {p.age} · baseline {p.baseline_sessions}/3
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {DEMOS.map((d) => (
            <div key={d.n} className="rounded-2xl border border-line p-4">
              <p className="font-mono text-xs text-ink-faint">DEMO {d.n}</p>
              <p className="font-bold">{d.title}</p>
              <p className="mt-1 text-sm text-ink-soft">“{d.text}”</p>
              <Button className="mt-3 w-full" variant="secondary" onClick={() => runDemo(d.user, d.text)}>
                Start as {personas.find((p) => p.user_id === d.user)?.display_name ?? d.user}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Demo 3 day 2: after the home-monitoring result, use “Simulate next day” and type “My daughter said I seemed confused last night.” With WorkBuddy selected, the
          session opens empty and WorkBuddy attaches via get_active_session. <Link className="underline" href="/explain">Technical view index</Link>
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Sensor source</h2>
          {sensor && (
            <div className="mt-3 space-y-3 text-sm">
              <p>
                Provider: <code className="rounded bg-slate-bg px-1">{sensor.name}</code> · mode{" "}
                <strong className={sensor.mode === "live" ? "text-teal" : "text-amber"}>{sensor.mode === "live" ? "LIVE SENSOR" : "RECORDED REPLAY"}</strong> ·{" "}
                {sensor.available ? "available" : "unavailable"}
              </p>
              <p className="text-ink-faint">
                Switch with <code>WISP_SENSOR_MODE=esp32 WISP_SERIAL_PORT=/dev/tty…</code> when starting the API. Replayed sessions are always labelled as recorded.
              </p>
              {sensor.recordings && (
                <>
                  <label className="block">
                    Next check plays:
                    <select
                      className="ml-2 rounded border border-line bg-card px-2 py-1"
                      value={sensor.next_override ?? ""}
                      onChange={(e) => update({ next_override: e.target.value || null })}
                    >
                      <option value="">persona default (today)</option>
                      {sensor.recordings.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => update({ next_override: "tan_interference" })}>
                      Queue “someone walks through” (Mdm Tan)
                    </Button>
                    <Button variant="secondary" onClick={() => update({ next_override: "siti_interference" })}>
                      Queue interference (Mdm Siti)
                    </Button>
                  </div>
                  <label className="block">
                    Replay speed:
                    <select className="ml-2 rounded border border-line bg-card px-2 py-1" value={sensor.speed} onChange={(e) => update({ speed: Number(e.target.value) })}>
                      {[1, 2, 4, 8].map((s) => (
                        <option key={s} value={s}>
                          {s}×
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sensor.live_counts} onChange={(e) => update({ live_counts: e.target.checked })} className="h-5 w-5" />
                Show live rise count (1/5…5/5) to the patient — only if validated as reliable
              </label>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-bold">Agent</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(["local_agent", "workbuddy"] as const).map((m) => (
              <label key={m} className="flex items-start gap-2">
                <input type="radio" name="agent" checked={agentMode === m} onChange={() => setAgentMode(m)} className="mt-1 h-4 w-4" />
                <span>
                  {m === "workbuddy" ? (
                    <>
                      <strong>Tencent WorkBuddy via MCP</strong> — new assessments wait for WorkBuddy to attach with <code>get_active_session</code>. Conversation happens in WorkBuddy;
                      this screen shows the check, trace and result.
                    </>
                  ) : (
                    <>
                      <strong>Built-in agent</strong> — offline stand-in that calls the same tools (for rehearsal / no network).
                    </>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                if (!confirm("Delete all demo sessions and re-seed personas, recordings and baselines?")) return;
                await post("/api/dev/reset");
                setMsg("Demo data reset.");
                load();
              }}
            >
              Reset demo data
            </Button>
            {msg && <span className="self-center text-sm text-forest">{msg}</span>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">Measurements</h2>
          <button className="text-sm text-forest underline" onClick={load}>
            Refresh
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-ink-faint">
              <tr>
                <th className="py-1 pr-3">id</th>
                <th className="pr-3">session</th>
                <th className="pr-3">ok</th>
                <th className="pr-3">total s</th>
                <th className="pr-3">per rise</th>
                <th className="pr-3">conf</th>
                <th className="pr-3">1-person</th>
                <th className="pr-3">mode</th>
                <th className="pr-3">recording</th>
              </tr>
            </thead>
            <tbody>
              {measurements.slice(0, 25).map((m) => (
                <tr key={m.measurement_id} className={`cursor-pointer border-t border-line hover:bg-slate-bg ${selected?.measurement.measurement_id === m.measurement_id ? "bg-teal-bg" : ""}`} onClick={() => open(m.measurement_id)}>
                  <td className="py-1 pr-3">{m.measurement_id}</td>
                  <td className="pr-3">{m.session_id}</td>
                  <td className="pr-3">{m.success ? "✓" : `✗ ${m.reason}`}</td>
                  <td className="pr-3">{m.total_time_seconds ?? "—"}</td>
                  <td className="pr-3">{m.per_rise_seconds.join(", ")}</td>
                  <td className="pr-3">{m.measurement_confidence.toFixed(2)}</td>
                  <td className="pr-3">{m.single_person_confidence.toFixed(2)}</td>
                  <td className="pr-3">{m.provider_mode}</td>
                  <td className="pr-3">{m.recording_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3">
              {series.length > 0 ? (
                <>
                  <SignalChart title="Motion energy (PCA of CSI amplitude) — shaded: detected test window" data={series} dataKey="energy" detail={selected.debug} />
                  <SignalChart title="Posture signal (distance from seated state) — dashed: detected standing phases" data={series} dataKey="posture" detail={selected.debug} />
                </>
              ) : (
                <p className="text-sm text-ink-soft">No signal trace stored{selected.debug.error ? `: ${selected.debug.error}` : "."}</p>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <h3 className="font-bold">Pipeline features</h3>
              <dl className="grid grid-cols-2 gap-x-3 font-mono text-xs">
                {Object.entries(selected.debug.features ?? {}).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-faint">{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="pt-2 font-bold">Record ground truth</h3>
              <p className="text-xs text-ink-faint">Stopwatch or phone-video time for this session (seconds).</p>
              <div className="flex gap-2">
                <input value={gt} onChange={(e) => setGt(e.target.value)} inputMode="decimal" className="w-28 rounded border border-line px-2 py-1" aria-label="Ground truth seconds" />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setEvaluation(await post<Evaluation>("/api/evaluation/validation", { measurement_id: selected.measurement.measurement_id, ground_truth_seconds: Number(gt), method: "stopwatch" }));
                    setGt("");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {evaluation && (
        <Card>
          <h2 className="font-bold">Sensor validation (ground truth recorded in this deployment)</h2>
          <p className="mt-1 text-xs text-ink-faint">{evaluation.note}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {[
              ["Sessions", evaluation.n_sessions],
              ["Failures", evaluation.n_failures],
              ["MAE (s)", evaluation.mae_seconds ?? "—"],
              ["Median abs err (s)", evaluation.median_abs_error_seconds ?? "—"],
              ["Mean confidence", evaluation.mean_confidence ?? "—"],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg bg-slate-bg px-3 py-2">
                <dt className="text-xs text-ink-faint">{k}</dt>
                <dd className="font-mono text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {evaluation.rows.some((r) => r.provider_mode !== "live") && (
            <p className="mt-2 text-xs font-bold text-amber">Includes recorded/synthetic sessions — do not report these as real-world accuracy.</p>
          )}
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Audit log</h2>
          <div className="flex gap-1 text-sm">
            {(["all", "workbuddy"] as const).map((f) => (
              <button key={f} onClick={() => setAuditFilter(f)} className={`rounded-full px-3 py-1 ${auditFilter === f ? "bg-forest text-white" : "border border-line"}`}>
                {f === "all" ? "All events" : "WorkBuddy tool calls"}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-3 max-h-96 space-y-1 overflow-y-auto font-mono text-xs">
          {audit.filter((e) => auditFilter === "all" || e.actor === "workbuddy").slice(0, 80).map((e) => (
            <li key={e.id} className="border-b border-line pb-1">
              <span className="text-ink-faint">{new Date(e.timestamp).toLocaleTimeString()}</span> {e.session_id} <strong>{e.actor}</strong> {e.event}
              {e.tool && <> · {e.tool}</>}
              {e.result && <span className="text-teal"> → {e.result}</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
