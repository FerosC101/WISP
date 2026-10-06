// Mirrors services/src/wisp/schemas.py. The UI renders these objects; it never
// invents its own interpretation of urgency.

export type Tier = "T1" | "T2" | "T3" | "T4" | "ABSTAIN";
export type SensingState = "OFF" | "ACTIVE" | "COMPLETE" | "LOCKED";

export interface RuleHit {
  rule_id: string;
  description: string;
  effect: string;
}

export interface RedFlagResult {
  status: "passed" | "triggered" | "incomplete";
  passed: boolean;
  triggered_flags: string[];
  missing: string[];
  uncertain: string[];
  tier: Tier | null;
  care_floor: Tier | null;
  care_ceiling: Tier | null;
  reasons: string[];
  rule_hits: RuleHit[];
}

export interface BaselineComparison {
  status: "within_usual_range" | "faster_than_usual" | "slower_than_usual" | "unable_to_compare" | "measurement_unreliable";
  severity: "none" | "mild" | "clear" | null;
  confidence: "high" | "medium" | "low";
  label: string;
  explanation: string;
  new_arm_use: boolean;
}

export interface CaseState {
  session_id: string;
  user_id: string;
  created_at: string;
  previous_session_id: string | null;
  complaint_text: string | null;
  complaint_summary: string | null;
  complaint_category: "functional" | "out_of_scope" | "unknown";
  onset: "sudden" | "gradual" | null;
  duration_days: number | null;
  red_flags: Record<string, boolean | null>;
  modifiers: Record<string, boolean | null>;
  uncertain_fields: string[];
  contradictions: string[];
  feels_safe_to_stand: boolean | null;
  others_present: boolean | null;
  arms_used: boolean | null;
  functional_status: string;
  sensing_state: SensingState;
  sensing_locked: boolean;
  measurement_id: string | null;
  comparison: BaselineComparison | null;
  finished: boolean;
}

export interface CareAction {
  kind: "call_995" | "emergency_department" | "gp_today" | "gp_soon" | "home_monitoring" | "speak_to_professional";
  label: string;
  detail: string;
}

export interface CareDisposition {
  tier: Tier;
  label: string;
  title: string;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  action: string;
  timeframe: string;
  actions: CareAction[];
  worsening_signs: string[];
  escalation: string;
  self_care: string[];
  recheck: { due_at: string; reason: string } | null;
  symptom_floor: Tier | null;
  functional_tier: Tier | null;
  decided_by: string;
  rule_hits: RuleHit[];
  sensing_used: boolean;
}

export interface FunctionalAssessment {
  measurement_id: string;
  session_id: string;
  assessment: "5xSTS";
  success: boolean;
  reason: string | null;
  total_time_seconds: number | null;
  rise_count: number | null;
  per_rise_seconds: number[];
  arms_used: boolean | null;
  arms_used_source: string;
  single_person_confidence: number;
  measurement_confidence: number;
  source: string;
  provider_mode: "live" | "recorded" | "synthetic_recorded";
  recording_id: string | null;
  timestamp: string;
  verified: boolean;
}

export interface AuditEvent {
  id: number | null;
  timestamp: string;
  session_id: string;
  actor: string;
  event: string;
  tool: string | null;
  result: string | null;
  data: Record<string, unknown>;
}

export interface DecisionTrace {
  session_id: string;
  current_concern: string | null;
  safety_screen: RedFlagResult;
  possible_range: { floor: Tier | null; ceiling: Tier | null; floor_label: string; ceiling_label: string } | null;
  missing_information: string[];
  available_actions: string[];
  selected_action: string | null;
  why: string | null;
  tool_calls: { tool: string; actor: string; result: string | null; timestamp: string; data: Record<string, unknown> }[];
  functional_result: FunctionalAssessment | null;
  comparison: BaselineComparison | null;
  decision_impact: string | null;
  disposition: CareDisposition | null;
  previous: {
    session_id: string;
    created_at: string;
    complaint: string | null;
    tier: Tier | null;
    title: string | null;
    functional_label: string | null;
    note: string;
  } | null;
  events: AuditEvent[];
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: number;
  ts: string;
  role: "agent" | "patient" | "system";
  text: string;
  data: { kind?: string; quick_replies?: QuickReply[]; question?: string; tier?: Tier; source?: string; why?: string };
}

export interface PublicProfile {
  user_id: string;
  display_name: string;
  age: number;
  lives_alone: boolean;
  usual_gp: string;
  /** Screen only (never sent to the agent). */
  usual_gp_details?: { address: string | null; lat: number | null; lng: number | null } | null;
  mobility_aid: string | null;
  normally_stands_unaided: boolean;
  conditions: string[];
  caregiver: { name: string; relationship: string } | null;
}

export interface Snapshot {
  session_id: string;
  version: number;
  agent: "local_agent" | "workbuddy";
  profile: PublicProfile | null;
  case: CaseState;
  messages: ChatMessage[];
  trace: DecisionTrace;
  disposition: CareDisposition | null;
  sensor: { name: string; mode: string; available: boolean; live_counts: boolean };
  baseline_available: boolean;
}

export interface SensingProgress {
  elapsed: number;
  rises_so_far: number;
  energy_tail: number[];
}

export interface Persona {
  user_id: string;
  display_name: string;
  age: number;
  lives_alone: boolean;
  baseline_sessions: number;
  latest_session_id: string | null;
  rechecks: { id: number; session_id: string; due_at: string; reason: string; status: string }[];
}

export interface HistoryItem {
  session_id: string;
  user_id: string;
  created_at: string;
  previous_session_id: string | null;
  complaint: string | null;
  tier: Tier | null;
  title: string | null;
  sensing_used: boolean;
}
