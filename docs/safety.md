# Safety architecture

WISP's urgency decisions are made by deterministic, reviewable code in
`services/src/wisp/rules/`. The language model (WorkBuddy, or the built-in agent)
converts words into structured fields and explains results; it never decides urgency.

## Invariants

| ID | Rule | Where | Tests |
|---|---|---|---|
| SAFE-1 | Sensing may raise urgency, never lower it below the symptom floor: `final = more_urgent(floor, functional_tier)` | `care_tier.py` | `test_normal_sensor_cannot_lower_T2`, `test_final_tier_never_less_urgent_than_symptom_floor` (96 combinations) |
| SAFE-2 | Any red flag → T1, whatever any measurement (today's or a previous one) says | `care_tier.py`, `red_flags.py` | `test_every_red_flag_triggers_t1`, `test_new_red_flag_overrides_previous_normal_measurement` |
| SAFE-3 | An unreliable/rejected measurement is never used and never yields T4 | `care_tier.py`, `compare.py` | `test_low_sensor_confidence_abstains`, `test_multiple_people_invalidates_measurement` |
| SAFE-4 | Self-care (T4) requires a verified, reliable measurement within the person's usual range | `care_tier.py` | `test_self_care_only_with_reliable_normal_measurement`, `test_missing_baseline_cannot_support_self_care` |
| SAFE-5 | Abstention never routes to self-care | `care_tier.py` | `test_abstain_never_routes_to_self_care` |
| ORD-1 | No sensing before the red-flag screen passes | `service.py` | `test_no_sensing_before_red_flag_pass` |
| ORD-2 | Sensing requires a single-use, session-bound eligibility grant | `service.py`, `store.py` | `test_sensing_requires_grant`, `test_grant_is_single_use_and_session_bound` |
| ORD-3 | A red flag locks sensing for the rest of the session and cancels a pending check | `service.py` | `test_red_flag_locks_sensor` |
| ORD-4 | A reported red flag cannot be withdrawn in the same session (fail closed) | `service.py` | `test_red_flag_cannot_be_withdrawn` |
| SEC-1 | Agents cannot author measurements; measurements are HMAC-signed and bound to the session | `store.py`, `service.py` | `test_agent_cannot_fabricate_measurement`, `test_tampered_measurement_fails_verification`, `test_measurement_from_other_session_rejected` |

Run: `cd services && uv run pytest` (109 tests).

## Multilingual safety questions

Every red-flag question is asked with fixed answer buttons whose values (`yes` / `no` / `unsure` …) are
language-independent. Questions and buttons exist in English, Mandarin, Malay and Tamil
(`services/src/wisp/triage/i18n.py`); the rules only ever see the values, so emergency screening never depends on
free-text understanding in another language. Free-text extraction (English rules, optional LLM) is an additional
backstop, never the only safeguard. Translations are drafts pending native-speaker and clinical review
(see [clinical_review.md](clinical_review.md)).

## Red flags (→ T1, sensing locked)

sudden onset · chest pain · severe breathlessness · one-sided weakness/numbness/clumsiness ·
speech difficulty · new confusion or drowsiness (including reported by family) · fainting/blackout ·
fall with injury · sudden vision change.

A flag is **unknown** until asked. "Not sure" keeps it unknown and, if still unknown at the
end, the result is **ABSTAIN** — an emergency cannot be ruled out remotely.

## Symptom range (after the screen passes)

| Rule | Condition | Floor | Ceiling |
|---|---|---|---|
| SR-1 | Unable to keep fluids down | T2 | T2 |
| SR-2 | Normally stands unaided but doesn't feel steady now | T2 | T2 |
| SR-3 | Any of: eating/drinking less, fall without injury, fever, getting worse, ≥ 7 days | T3 | T2 |
| SR-0 | None of the above | T4 | T3 |

Sensing is only offered when floor ≠ ceiling (it could change the answer).

## Functional evidence

| Rule | Baseline comparison | Functional tier |
|---|---|---|
| FN-1 | Within (or quicker than) usual range | T4 |
| FN-2 | Mildly slower | T3 |
| FN-3a | Clearly slower, no other concerning finding | T3 |
| FN-3b | Clearly slower + concerning finding (SR-3) | T2 |
| FN-4 | Started but could not finish | T2 |
| FN-5 / SAFE-4 | No usable baseline, declined, or not done | — (floor raised to at least T3) |
| SAFE-3 | Measurement unreliable (multi-person, low confidence, tool failure) | ABSTAIN (unless symptom floor is already T2) |

"Clearly slower" = more than max(1.5 s, 12 % of median) beyond the usual maximum, or new arm use.
A noise allowance of max(0.5 s, 5 % of median) applies. Thresholds are prototype values, not clinically validated.

## Abstention triggers

Out-of-scope complaint · person does not normally stand unaided · unsure about a warning sign ·
contradictory answers · measurement unreliable · tool failure. Abstention advises speaking with
the family doctor, a nurse, or a caregiver **today**.

## Design trade-offs

- **Deterministic rules for urgency, not LLM reasoning** — safety-critical disposition must be predictable, reviewable and testable.
- **On-demand sensing, not continuous monitoring** — less privacy burden, less irrelevant data, smaller technical scope.
- **5xSTS, not a single chair rise** — stronger evidence base as a functional test and richer motion data.
- **Personal baseline** — WISP measures change from the person's own normal, not distance from population averages.
- **Wi-Fi, not camera** — contactless measurement without visual surveillance.
- **Sensor-independent tool interface** — the innovation is agent-directed physical evidence gathering, not one radio technology.

## Known limitations

- Rule thresholds are prototype values chosen for the demo; they need clinical review.
- **Automatic multi-person detection is experimental**, not a guaranteed protection. A single Wi-Fi link cannot always tell a passer-by from the participant (≈50 % rejection on synthetic crossings). The primary safeguard is procedural: before every check the patient is asked "Is anyone else moving around in the room?" and, if yes, asked to wait until the area is clear. Automatic detection is an additional check; when it fires, the reading is rejected ("I couldn't get a reliable reading, so I won't use that result") and WISP continues conservatively. Future work: second receiver / multi-link CSI.
- Arm use is self-reported, not sensed.
