"""Demo personas (fictional) and their synthetic sensor sessions."""

from __future__ import annotations

from ..schemas import Caregiver, UserProfile

PERSONAS: list[UserProfile] = [
    UserProfile(
        user_id="mdm_tan",
        display_name="Mdm Tan",
        age=78,
        sex="female",
        lives_alone=True,
        usual_gp="Demo Family Clinic (Toa Payoh)",
        normally_stands_unaided=True,
        conditions=["hypertension"],
        medications=["amlodipine"],
        caregiver=Caregiver(name="Daniel", relationship="son"),
    ),
    UserProfile(
        user_id="mr_lim",
        display_name="Mr Lim",
        age=72,
        sex="male",
        lives_alone=False,
        usual_gp="Demo Polyclinic (Bedok)",
        normally_stands_unaided=True,
        conditions=["type 2 diabetes", "high cholesterol"],
        caregiver=Caregiver(name="Mrs Lim", relationship="wife"),
    ),
    UserProfile(
        user_id="mdm_siti",
        display_name="Mdm Siti",
        age=80,
        sex="female",
        preferred_language="ms",
        lives_alone=True,
        usual_gp="Demo Family Clinic (Jurong West)",
        normally_stands_unaided=True,
        conditions=["osteoarthritis (knees)"],
        caregiver=Caregiver(name="Nurul", relationship="daughter"),
    ),
]

# Synthetic 5xSTS sessions per persona: per-rise durations (s), seed, optional walker.
SESSIONS: dict[str, dict[str, dict]] = {
    "mdm_tan": {
        "tan_baseline_1": {"cycles": [2.3, 2.4, 2.35, 2.4, 2.45], "seed": 11},
        "tan_baseline_2": {"cycles": [2.4, 2.45, 2.4, 2.5, 2.45], "seed": 12},
        "tan_baseline_3": {"cycles": [2.2, 2.35, 2.3, 2.4, 2.35], "seed": 13},
        "tan_today": {"cycles": [2.7, 2.9, 3.2, 3.6, 4.0], "seed": 14},
        "tan_interference": {"cycles": [2.7, 2.9, 3.2, 3.6, 4.0], "seed": 0, "walker": (6.0, 4.0)},
    },
    "mr_lim": {
        "lim_baseline_1": {"cycles": [2.0, 2.1, 2.05, 2.1, 2.1], "seed": 21},
        "lim_baseline_2": {"cycles": [2.1, 2.1, 2.15, 2.2, 2.1], "seed": 22},
        "lim_baseline_3": {"cycles": [2.0, 2.05, 2.1, 2.1, 2.15], "seed": 23},
        "lim_today": {"cycles": [2.1, 2.1, 2.2, 2.15, 2.2], "seed": 24},
    },
    "mdm_siti": {
        "siti_baseline_1": {"cycles": [2.6, 2.7, 2.65, 2.8, 2.7], "seed": 31},
        "siti_baseline_2": {"cycles": [2.7, 2.75, 2.7, 2.8, 2.75], "seed": 32},
        "siti_baseline_3": {"cycles": [2.55, 2.65, 2.7, 2.7, 2.65], "seed": 33},
        "siti_today": {"cycles": [2.6, 2.75, 2.65, 2.8, 2.7], "seed": 34},
        "siti_interference": {"cycles": [2.6, 2.75, 2.65, 2.8, 2.7], "seed": 3, "walker": (2.0, 3.5)},
    },
}

# Personas whose baseline is enrolled at seed time (Mr Lim enrols live in the demo).
PRE_ENROLLED = {"mdm_tan", "mdm_siti"}
