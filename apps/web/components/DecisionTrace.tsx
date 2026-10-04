"use client";

import { TIER_NAMES, TIER_STYLE, formatDate } from "@/lib/tiers";
import type { DecisionTrace as Trace, Snapshot } from "@/lib/types";

const FLAG_LABELS: Record<string, string> = {
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

const ACTOR_LABEL: Record<string, string> = {
  workbuddy: "WorkBuddy",
  local_agent: "AI agent",
  rule_engine: "Rule",
  sensing: "Sensor",
  patient: "Patient",
  system: "System",
};

function Row({ label, children, tone }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <dt className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className={`mt-1 text-[0.95rem] ${tone ?? "text-ink"}`}>{children}</dd>
    </div>
  );
}

function AgentTag({ actor }: { actor: string }) {
  const isRule = actor === "rule_engine";
  const isAI = actor === "workbuddy" || actor === "local_agent";
  return (
    <span
      className={`ml-1 inline-block rounded px-1.5 py-0.5 align-middle font-mono text-[0.65rem] font-bold uppercase ${
        isRule ? "bg-navy text-white" : isAI ? "bg-teal-bg text-teal" : "bg-grey-bg text-ink-soft"
      }`}
    >
      {ACTOR_LABEL[actor] ?? actor}
    </span>
  );
}

export function DecisionTrace({ snapshot }: { snapshot: Snapshot }) {
  const t: Trace = snapshot.trace;
  const rf = t.safety_screen;
  const locked = snapshot.case.sensing_locked;
  const decisions = t.events.filter((e) => e.event === "agent_decision");
  const lastDecision = decisions[decisions.length - 1];
  const sensingCalls = t.tool_calls.filter((c) => ["check_assessment_eligibility", "run_functional_assessment", "compare_to_baseline", "decide_care_tier"].includes(c.tool));
  const d = t.disposition;

  return (
    <div aria-label="Decision trace" className="text-ink">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-navy">Decision trace</h2>
        <span className="text-[0.7rem] text-ink-faint">structured record · not AI reasoning text</span>
      </div>
      <dl>
        {t.previous && (
          <Row label="Previous check">
            {formatDate(t.previous.created_at, { weekday: "short", day: "numeric", month: "short" })}: {t.previous.title ?? "—"}
            {t.previous.functional_label && <span className="text-ink-soft"> · chair-rise: {t.previous.functional_label.toLowerCase()}</span>}
            <div className="mt-1 text-[0.8rem] text-ink-soft">{t.previous.note}</div>
          </Row>
        )}

        <Row label="Current concern">{t.current_concern ? `“${t.current_concern}”` : <span className="text-ink-faint">Waiting for the patient…</span>}</Row>

        <Row label="Safety screen" tone={rf.status === "triggered" ? "text-red font-bold" : rf.status === "passed" ? "text-green font-bold" : "text-ink-soft"}>
          {rf.status === "triggered" && <>Emergency warning sign: {rf.triggered_flags.map((f) => FLAG_LABELS[f] ?? f).join(", ")}</>}
          {rf.status === "passed" && <>No emergency warning signs detected</>}
          {rf.status === "incomplete" && (
            <>
              In progress · {9 - rf.missing.length} of 9 warning signs checked
              {rf.uncertain.length > 0 && <div className="text-amber">Unsure: {rf.uncertain.map((f) => FLAG_LABELS[f]).join(", ")}</div>}
            </>
          )}
          <AgentTag actor="rule_engine" />
        </Row>

        <Row label="Possible care range">
          {t.possible_range?.floor ? (
            t.possible_range.floor === t.possible_range.ceiling ? (
              <span className={`font-bold ${TIER_STYLE[t.possible_range.floor].fg}`}>{t.possible_range.floor_label}</span>
            ) : (
              <span className="inline-flex flex-col">
                <span className={`font-bold ${TIER_STYLE[t.possible_range.ceiling!].fg}`}>{t.possible_range.ceiling_label}</span>
                <span aria-label="to" className="text-ink-faint">
                  ↕
                </span>
                <span className={`font-bold ${TIER_STYLE[t.possible_range.floor].fg}`}>{t.possible_range.floor_label}</span>
              </span>
            )
          ) : (
            <span className="text-ink-faint">Not yet known</span>
          )}
        </Row>

        {t.missing_information.length > 0 && !d && (
          <Row label="Missing information">
            <ul className="list-disc pl-5 text-ink-soft">
              {t.missing_information.slice(0, 4).map((m) => (
                <li key={m}>{m}</li>
              ))}
              {t.missing_information.length > 4 && <li>+{t.missing_information.length - 4} more</li>}
            </ul>
          </Row>
        )}

        <Row label="Available actions">
          <ul className="space-y-1">
            {t.available_actions.map((a) => {
              const selected = t.selected_action === a || (t.selected_action === "Escalate now" && a === "Recommend care now");
              const blocked = a === "Physical function check" && locked;
              return (
                <li key={a} className={`flex items-center gap-2 ${blocked ? "text-ink-faint line-through" : selected ? "font-bold text-navy" : "text-ink-soft"}`}>
                  <span aria-hidden className={`h-2 w-2 rounded-full ${selected ? "bg-navy" : "border border-ink-faint"}`} />
                  {a}
                  {selected && <span className="sr-only">(selected)</span>}
                </li>
              );
            })}
          </ul>
        </Row>

        {locked && (
          <div className="my-2 rounded-xl border-2 border-red bg-red-bg px-4 py-3">
            <div className="text-sm font-bold uppercase tracking-wider text-red">Sensing not requested</div>
            <div className="mt-1 text-[0.9rem] text-ink">Emergency warning sign already determines the care recommendation.</div>
          </div>
        )}

        {t.selected_action && (
          <Row label="Selected action">
            <span className="font-bold">{t.selected_action}</span>
            {lastDecision && <AgentTag actor={lastDecision.actor} />}
            {t.why && <div className="mt-1 text-ink-soft">Why: “{t.why}”</div>}
          </Row>
        )}

        {sensingCalls.length > 0 && (
          <Row label="Tools called">
            <ul className="space-y-1 font-mono text-[0.75rem]">
              {sensingCalls.map((c, i) => (
                <li key={i} className="break-words">
                  {c.tool === "run_functional_assessment" ? 'run_functional_assessment(type="5xSTS")' : `${c.tool}()`}{" "}
                  <span className="text-ink-faint">→ {c.result}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}

        {t.functional_result && (
          <Row label="Physical check result">
            {t.functional_result.success ? (
              <>
                Five chair rises measured
                {snapshot.case.arms_used != null && <> · arms {snapshot.case.arms_used ? "used" : "not used"} (self-report)</>}
              </>
            ) : (
              <span className="text-amber">Rejected: {t.functional_result.reason?.replaceAll("_", " ")} — not used</span>
            )}
            <div className="text-[0.8rem] text-ink-faint">
              confidence {t.functional_result.measurement_confidence.toFixed(2)} · single person {t.functional_result.single_person_confidence.toFixed(2)} · {t.functional_result.provider_mode.replace("_", " ")}
            </div>
          </Row>
        )}

        {t.comparison && (
          <Row label="Compared with usual">
            <span className="font-bold">{t.comparison.label}</span>
            <div className="text-[0.85rem] text-ink-soft">{t.comparison.explanation}</div>
          </Row>
        )}

        {t.decision_impact && (
          <Row label="Decision impact" tone="font-bold text-navy">
            {t.decision_impact}
          </Row>
        )}

        {d && (
          <Row label="Final recommendation">
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLE[d.tier].chip}`}>
              {d.tier} · {TIER_NAMES[d.tier]}
            </span>
            <AgentTag actor="rule_engine" />
            <ul className="mt-2 space-y-1 text-[0.8rem] text-ink-soft">
              {d.rule_hits.map((h) => (
                <li key={h.rule_id + h.description}>
                  <span className="font-mono font-bold text-ink">{h.rule_id}</span> {h.description} → {h.effect}
                </li>
              ))}
            </ul>
          </Row>
        )}
      </dl>
    </div>
  );
}
