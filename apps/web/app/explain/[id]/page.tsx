"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { RecordedBadge, SensingIndicator } from "@/components/ui";
import { WispLine } from "@/components/WispLine";
import { TIER_NAMES, TIER_STYLE } from "@/lib/tiers";
import { useSession } from "@/lib/useSession";
import type { AuditEvent, Snapshot } from "@/lib/types";

const FLAG: Record<string, string> = {
  sudden_onset: "Sudden onset",
  chest_pain: "Chest pain",
  severe_breathlessness: "Severe breathlessness",
  one_sided_weakness: "One-sided weakness",
  speech_difficulty: "Speech difficulty",
  confusion: "Confusion",
  loss_of_consciousness: "Fainting",
  recent_fall_with_injury: "Fall with injury",
  sudden_vision_change: "Sudden vision change",
};

const ACTOR: Record<string, { label: string; cls: string }> = {
  workbuddy: { label: "WorkBuddy", cls: "bg-teal text-white" },
  local_agent: { label: "AI agent (built-in)", cls: "bg-teal-bg text-teal" },
  rule_engine: { label: "Deterministic rule", cls: "bg-forest text-white" },
  sensing: { label: "Sensing service", cls: "bg-amber-bg text-amber" },
  patient: { label: "Patient", cls: "bg-slate-bg text-ink-soft" },
  system: { label: "System", cls: "bg-slate-bg text-ink-soft" },
};

function Tag({ actor }: { actor: string }) {
  const a = ACTOR[actor] ?? { label: actor, cls: "bg-slate-bg" };
  return <span className={`ml-2 inline-block rounded px-1.5 py-0.5 align-middle font-mono text-[0.62rem] font-bold uppercase ${a.cls}`}>{a.label}</span>;
}

function Step({ n, title, children, tone = "" }: { n: number; title: string; children: ReactNode; tone?: string }) {
  return (
    <li className="relative pl-10">
      <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-forest font-mono text-xs font-bold text-white">{n}</span>
      <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">{title}</h3>
      <div className={`mt-1 min-w-0 break-words text-[0.98rem] ${tone}`}>{children}</div>
    </li>
  );
}

function Record({ s }: { s: Snapshot }) {
  const t = s.trace;
  const rf = t.safety_screen;
  const d = t.disposition;
  const decisions = t.events.filter((e) => e.event === "agent_decision");
  const last = decisions[decisions.length - 1];
  const fr = t.functional_result;
  const sensingCalls = t.tool_calls.filter((c) => c.tool === "run_functional_assessment");
  let n = 0;

  return (
    <ol className="space-y-6">
      <Step n={++n} title="Current concern">
        {t.current_concern ? `“${t.current_concern}”` : <span className="text-ink-faint">Waiting for the patient…</span>}
        {t.previous && (
          <p className="mt-1 text-[0.85rem] text-ink-soft">
            Previous check: {t.previous.title ?? "—"}
            {t.previous.functional_label && ` · ${t.previous.functional_label}`}. {t.previous.note}
          </p>
        )}
      </Step>

      <Step n={++n} title="Safety screen" tone={rf.status === "triggered" ? "font-bold text-red" : rf.status === "passed" ? "font-bold text-forest" : "text-ink-soft"}>
        {rf.status === "triggered" && <>Triggered: {rf.triggered_flags.map((f) => FLAG[f] ?? f).join(", ")}</>}
        {rf.status === "passed" && <>Passed — no emergency warning signs</>}
        {rf.status === "incomplete" && (
          <>
            In progress · {9 - rf.missing.length} / 9 warning signs answered
            {rf.uncertain.length > 0 && <span className="text-amber"> · unsure: {rf.uncertain.map((f) => FLAG[f]).join(", ")}</span>}
          </>
        )}
        <Tag actor="rule_engine" />
      </Step>

      <Step n={++n} title="Possible care range">
        {t.possible_range?.floor ? (
          <>
            <span className={`font-bold ${TIER_STYLE[t.possible_range.floor].fg}`}>{t.possible_range.floor_label}</span>
            {t.possible_range.floor !== t.possible_range.ceiling && (
              <>
                {" "}
                ↔ <span className={`font-bold ${TIER_STYLE[t.possible_range.ceiling!].fg}`}>{t.possible_range.ceiling_label}</span>
              </>
            )}
            <span className="ml-2 font-mono text-xs text-ink-faint">
              floor {t.possible_range.floor} · ceiling {t.possible_range.ceiling}
            </span>
          </>
        ) : (
          <span className="text-ink-faint">Not yet known</span>
        )}
      </Step>

      <Step n={++n} title="Missing information">
        {t.missing_information.length ? (
          <ul className="list-disc pl-5 text-ink-soft">
            {t.missing_information.slice(0, 5).map((m) => (
              <li key={m}>{m}</li>
            ))}
            {t.missing_information.length > 5 && <li>+{t.missing_information.length - 5} more</li>}
          </ul>
        ) : (
          <span className="text-ink-faint">None outstanding</span>
        )}
      </Step>

      <Step n={++n} title="Options considered">
        <ul className="space-y-1">
          {t.available_actions.map((a) => {
            const selected = t.selected_action === a || (t.selected_action === "Escalate now" && a === "Recommend care now");
            const blocked = a === "Physical function check" && s.case.sensing_locked;
            return (
              <li key={a} className={`flex items-center gap-2 ${blocked ? "text-ink-faint line-through" : selected ? "font-bold text-forest" : "text-ink-soft"}`}>
                <span aria-hidden className={`h-2 w-2 rounded-full ${selected ? "bg-forest" : "border border-ink-faint"}`} />
                {a}
                {blocked && <span className="no-underline">(locked)</span>}
              </li>
            );
          })}
        </ul>
        {s.case.sensing_locked && (
          <div className="mt-3 rounded-xl border-2 border-red bg-red-bg px-4 py-3">
            <div className="text-sm font-bold uppercase tracking-wider text-red">Sensing not requested</div>
            <div className="text-[0.92rem]">Emergency warning sign already determines the disposition. Sensing tools locked for this session.</div>
          </div>
        )}
      </Step>

      <Step n={++n} title="Selected action · why">
        {t.selected_action ? (
          <>
            <span className="font-bold">{t.selected_action}</span>
            {last && <Tag actor={last.actor} />}
            {t.why && <p className="mt-1 text-ink-soft">“{t.why}”</p>}
          </>
        ) : (
          <span className="text-ink-faint">Not yet decided</span>
        )}
      </Step>

      <Step n={++n} title="Tool called">
        {sensingCalls.length ? (
          <code className="break-all rounded bg-slate-bg px-2 py-1 font-mono text-[0.85rem]">run_functional_assessment(&quot;5xSTS&quot;)</code>
        ) : (
          <span className="text-ink-faint">No physical assessment requested</span>
        )}
      </Step>

      <Step n={++n} title="Sensor result">
        {fr ? (
          <div className="space-y-1">
            {fr.success ? (
              <p>
                5 rises · total <strong>{fr.total_time_seconds?.toFixed(1)} s</strong> · per rise {fr.per_rise_seconds.join(" / ")} s
              </p>
            ) : (
              <p className="font-bold text-amber">Rejected: {fr.reason?.replaceAll("_", " ")} — not used</p>
            )}
            <p className="font-mono text-xs text-ink-faint">
              measurement conf {fr.measurement_confidence.toFixed(2)} · single-person {fr.single_person_confidence.toFixed(2)} · {fr.source} · verified{" "}
              {String(fr.verified)} · arms {fr.arms_used == null ? "—" : fr.arms_used ? "used" : "not used"} ({fr.arms_used_source})
            </p>
            <RecordedBadge mode={fr.provider_mode} />
          </div>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </Step>

      <Step n={++n} title="Baseline result">
        {t.comparison ? (
          <>
            <span className="font-bold">{t.comparison.label}</span>
            <span className="ml-2 font-mono text-xs text-ink-faint">
              {t.comparison.status} · severity {t.comparison.severity ?? "—"} · confidence {t.comparison.confidence}
            </span>
            <p className="text-[0.9rem] text-ink-soft">{t.comparison.explanation}</p>
          </>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </Step>

      <Step n={++n} title="Care-tier change" tone="font-bold text-forest">
        {t.decision_impact ?? <span className="font-normal text-ink-faint">—</span>}
      </Step>

      <Step n={++n} title="Final disposition">
        {d ? (
          <>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLE[d.tier].chip}`}>{TIER_NAMES[d.tier]}</span>
            <Tag actor="rule_engine" />
            <span className="ml-2 text-sm text-ink-soft">confidence {d.confidence}</span>
            <ul className="mt-2 space-y-1 text-[0.85rem]">
              {d.rule_hits.map((h) => (
                <li key={h.rule_id + h.description}>
                  <span className="font-mono font-bold">{h.rule_id}</span> <span className="text-ink-soft">{h.description}</span> → {h.effect}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span className="text-ink-faint">Pending</span>
        )}
      </Step>
    </ol>
  );
}

function Timeline({ events }: { events: AuditEvent[] }) {
  // Re-screening after every answer is routine; only show screens that changed the state.
  const routine = (e: AuditEvent) => e.tool === "screen_red_flags" && e.result === "incomplete";
  const shown = events.filter(
    (e) => !routine(e) && (e.tool || ["agent_decision", "sensing_locked", "assessment_selected", "patient_ready_for_check", "sensing_active"].includes(e.event)),
  );
  return (
    <ol className="space-y-2 font-mono text-[0.74rem]">
      {shown.map((e) => (
        <li key={e.id} className="border-b border-line pb-1.5">
          <span className="text-ink-faint">{new Date(e.timestamp).toLocaleTimeString("en-SG")}</span>
          <Tag actor={e.actor} />
          <div className="mt-0.5 break-words">
            {e.tool ?? e.event}
            {e.result && <span className="text-teal"> → {e.result}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ExplainPage() {
  const { id } = useParams<{ id: string }>();
  const { snapshot: s, error } = useSession(id);
  if (error && !s) return <p className="py-10 text-center text-ink-soft">{error}</p>;
  if (!s) return <WispLine variant="flow" className="mx-auto my-20 h-8 w-48 text-teal" />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-teal">Technical view · structured decision record</p>
          <h1 className="mt-1 text-[1.8rem] font-bold text-forest">
            {s.profile?.display_name} · {s.case.previous_session_id ? "follow-up" : "check-in"}
          </h1>
          <p className="text-sm text-ink-soft">
            Agent: {s.agent === "workbuddy" ? "Tencent WorkBuddy via MCP" : "built-in agent (offline stand-in)"} · session <code className="break-all">{s.session_id}</code> · not model
            chain-of-thought
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SensingIndicator state={s.case.sensing_state} />
          <Link href={`/session/${s.session_id}`} className="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold text-forest">
            Patient view
          </Link>
        </div>
      </div>
      <WispLine className="my-6 h-4 w-full text-sage-deep" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-(--radius-card) border border-line bg-card p-4 sm:p-6">
          <Record s={s} />
        </section>
        <aside className="rounded-(--radius-card) border border-line bg-card p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
          <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-faint">Tool calls &amp; decisions</h2>
          <Timeline events={s.trace.events} />
        </aside>
      </div>
    </div>
  );
}
