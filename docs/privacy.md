# Privacy architecture

**Claim we make:** raw physical sensing stays local.
**Claim we do not make:** "everything stays local" — the conversation may pass through WorkBuddy / a cloud LLM depending on deployment.

```
┌──────────── HOME / LOCAL TRUST ZONE ────────────┐      PRIVACY       ┌──── WorkBuddy (agent) ────┐
│ ESP32 → raw CSI → signal processing → 5xSTS     │      BOUNDARY      │ receives only:            │
│ summary · encrypted baseline · audit log        │ ───────────────▶   │ · functional summary      │
│ raw CSI files (debug only, optional)            │                    │ · baseline label          │
└─────────────────────────────────────────────────┘                    │ · confidence              │
                                                                       │ · the conversation        │
                                                                       └───────────────────────────┘
```

| Data | Where | Protection |
|---|---|---|
| Raw CSI | `data/recorded_csi/live/` on this machine; never sent to any agent | Optional (`WISP_SAVE_RAW_CSI=0`), deletable from the Privacy page |
| Signal traces (energy/posture) | Local DB, developer view only | Never in agent-facing tool output |
| Personal baseline | Local SQLite, **Fernet-encrypted**; key in `data/.wisp_local.key` (0600) | Deletable |
| Measurements | Local SQLite, HMAC-signed | Summary only to agent |
| Profile | Local; agent sees a minimal subset (no medication list) | — |
| Conversation | WISP DB + WorkBuddy (if used) + optional LLM extraction endpoint | Shown in Privacy page |
| Caregiver summary | Only with explicit per-share consent; delivery simulated in the prototype | No sensor data |

Sensing activates only inside an assessment the patient started, only after the
deterministic gates pass, and only after the patient presses **I'm seated — start**.
The UI always shows the state: **Physical sensing OFF / ACTIVE / COMPLETE / LOCKED**.
