# WISP evaluation report

Generated 2026-10-05 00:10. Sample sizes are small and stated for every result.

## 1. Triage vignettes (end-to-end conversations)

**15/15 passed** (expected tier and whether sensing was used).

| ID | Complaint | Expected | Got | Sensing exp/got | Pass |
|---|---|---|---|---|---|
| V01 | I've felt weak for two days. | T2 | T2 | True/True | ✓ |
| V02 | This morning I suddenly felt dizzy and my left hand feels clumsy. | T1 | T1 | False/False | ✓ |
| V03 | I'm tired and don't feel like myself. | T4 | T4 | True/True | ✓ |
| V04 | My daughter said I seemed confused last night. | T1 | T1 | False/False | ✓ |
| V05 | I feel weak. | ABSTAIN | ABSTAIN | False/False | ✓ |
| V06 | I feel weak. | T1 | T1 | False/False | ✓ |
| V07 | I feel slower today. | T2 | T2 | False/False | ✓ |
| V08 | I feel tired. | T3 | T3 | False/False | ✓ |
| V09 | I feel tired since yesterday. | T3 | T3 | False/False | ✓ |
| V10 | My tooth hurts. | ABSTAIN | ABSTAIN | False/False | ✓ |
| V11 | I feel weak. | T2 | T2 | False/False | ✓ |
| V12 | I feel weak. | ABSTAIN | ABSTAIN | False/False | ✓ |
| V13 | I feel weaker than usual. | T2 | T2 | True/True | ✓ |
| V14 | I'm tired. | T3 | T3 | True/True | ✓ |
| V15 | I fell this morning and hit my head, now I feel weak. | T1 | T1 | False/False | ✓ |

## 2. Fairness: tier flip rate under non-clinical changes

**Overall flip rate: 0/51 = 0.0%**

| Attribute | Variants run | Flips | Details |
|---|---|---|---|
| phrasing | 18 | 0 | — |
| age_band | 9 | 0 | — |
| sex | 6 | 0 | — |
| living_arrangement | 6 | 0 | — |
| language | 12 | 0 | — |

Synthetic vignettes only. This shows the rules ignore demographics by construction and measures sensitivity to *phrasing*; it does not establish population-level fairness. Physical sensing fairness must be evaluated separately with real participants.

## 3. Red-flag extraction from free text (rules only)

18 statements · 15 expected flags · **missed 1** · false positives 0

Free-text extraction is a backstop: every warning sign is also asked as a direct yes/no question, and 'not sure' leads to abstention.

| Statement | Expected | Got | Missed |
|---|---|---|---|
| Suddenly my left arm feels numb | sudden_onset, one_sided_weakness | one_sided_weakness, sudden_onset |  |
| My right leg is weak and heavy | one_sided_weakness | one_sided_weakness |  |
| my face is drooping on one side | one_sided_weakness | one_sided_weakness |  |
| I have chest pain when I walk | chest_pain | chest_pain |  |
| There's a tightness in my chest | chest_pain | chest_pain |  |
| I can't breathe properly | severe_breathlessness | severe_breathlessness |  |
| My words are coming out slurred | speech_difficulty | speech_difficulty |  |
| My daughter said I seemed confused last night | confusion | confusion |  |
| I blacked out in the kitchen | loss_of_consciousness | loss_of_consciousness |  |
| I fainted this morning | loss_of_consciousness | loss_of_consciousness |  |
| I fell and hit my head | recent_fall_with_injury | recent_fall_with_injury |  |
| Suddenly I have double vision | sudden_onset, sudden_vision_change | sudden_onset, sudden_vision_change |  |
| No chest pain, just tired | — | — |  |
| I'm not confused, only weak | — | — |  |
| I feel weak and tired for three days | — | — |  |
| Never fainted, but I feel slow | — | — |  |
| I feel a bit breathless climbing stairs | — | — |  |
| Saya keliru semalam | confusion | — | confusion |

## 4. Sensor pipeline on SYNTHETIC CSI (not real-world accuracy)

- Single-person sessions: 80 · accepted 73 · false rejects 7
- Total-time error vs generator ground truth: MAE 0.206 s · median 0.19 s · bias -0.206 s · max 0.49 s
- Second person crossing the room: 30/60 rejected (50%). Undetected crossings are a known limitation of a single Wi-Fi link.

## 5. Sensor accuracy with real participants

No trials recorded in `trials.csv` yet. Collect them with `scripts/collect_trials.py`.
