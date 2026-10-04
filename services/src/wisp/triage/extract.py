"""Natural language -> structured case fields.

Rule-based extraction always runs. If an OpenAI-compatible LLM endpoint is
configured (e.g. Tencent Hunyuan), its extraction is merged *conservatively*:
a warning sign reported by either extractor is kept. Free text can only ever
SET a red flag to true; denials come from explicit answers to a direct question.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

import httpx

from .. import config

NUM_WORDS = {"one": 1, "a": 1, "an": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "few": 3, "couple": 2, "several": 4}

FUNCTIONAL = re.compile(
    r"\b(weak|weaker|weakness|tired|tiredness|fatigue|fatigued|exhausted|slow|slower|sluggish|lethargic|no energy|low energy|"
    r"less energy|strength|not (feel )?(like )?myself|not myself|not quite right|unsteady|wobbly|drained|run down|no strength)\b",
    re.I,
)
OUT_OF_SCOPE = re.compile(r"\b(tooth|toothache|rash|itch|itchy|ear|sore throat|cough|eye drops|prescription|refill|insurance|appointment only)\b", re.I)

NEGATION = re.compile(r"\b(no|not|don't|dont|didn't|didnt|never|without|haven't|havent|isn't|isnt)\b[\w\s']{0,18}$", re.I)

RED_FLAG_PATTERNS: dict[str, re.Pattern] = {
    "sudden_onset": re.compile(r"\b(suddenly|sudden|all of a sudden|out of nowhere)\b", re.I),
    "chest_pain": re.compile(r"\b(chest (pain|tight|tightness|pressure|hurts?)|(pain|tightness|pressure) in (my )?chest)\b", re.I),
    "severe_breathlessness": re.compile(r"\b(can'?t breathe|cannot breathe|struggling to breathe|very (short of breath|breathless)|gasping)\b", re.I),
    "one_sided_weakness": re.compile(
        r"\b((left|right) (arm|hand|leg|side|foot)[\w\s]{0,20}(weak|numb|clumsy|heavy|dead|tingl)|"
        r"(weak|numb|clumsy|heavy)[\w\s]{0,12}(left|right) (arm|hand|leg|side)|one side|face (droop|drooping)|drooping face)",
        re.I,
    ),
    "speech_difficulty": re.compile(r"\b(slurred|slurring|can'?t (speak|talk)|trouble (speaking|talking)|words (are )?(jumbled|wrong))\b", re.I),
    "confusion": re.compile(r"\b(confus\w*|disorient\w*|unusually drowsy|very drowsy|can'?t think straight|didn'?t know where)\b", re.I),
    "loss_of_consciousness": re.compile(r"\b(faint(ed)?|black(ed)? out|passed out|lost consciousness|collapsed)\b", re.I),
    "recent_fall_with_injury": re.compile(r"\b(fell|fall)[\w\s]{0,25}(hit my head|hurt|injur|bleed|broke)", re.I),
    "sudden_vision_change": re.compile(r"\b(lost (my )?vision|can'?t see|double vision|sudden(ly)? blurr?y)\b", re.I),
}

MODIFIER_PATTERNS: dict[str, re.Pattern] = {
    "reduced_intake": re.compile(r"\b(not eating|eating less|eat less|no appetite|poor appetite|lost (my )?appetite|not drinking|drinking less|skipp(ing|ed) meals)\b", re.I),
    "fever": re.compile(r"\b(fever|feverish|high temperature)\b", re.I),
    "getting_worse": re.compile(r"\b(getting worse|worse and worse|worsening)\b", re.I),
    "fall_without_injury": re.compile(r"\b(fell|had a fall|i fall)\b", re.I),
}


@dataclass
class Extraction:
    complaint_category: str | None = None
    duration_days: float | None = None
    onset: str | None = None
    red_flags: dict[str, bool] = field(default_factory=dict)
    modifiers: dict[str, bool] = field(default_factory=dict)
    summary: str | None = None
    source: str = "rules"


def _negated(text: str, start: int) -> bool:
    return bool(NEGATION.search(text[max(0, start - 30):start]))


def parse_duration(text: str) -> float | None:
    t = text.lower()
    if re.search(r"\b(this morning|today|just now|since this)\b", t):
        return 0.5
    if re.search(r"\b(since yesterday|yesterday|last night|overnight)\b", t):
        return 1
    m = re.search(r"\b(\d+|" + "|".join(NUM_WORDS) + r")\s*(days?|weeks?|months?)\b", t)
    if m:
        n = float(m.group(1)) if m.group(1).isdigit() else NUM_WORDS[m.group(1)]
        unit = m.group(2)
        return n * (30 if unit.startswith("month") else 7 if unit.startswith("week") else 1)
    if re.search(r"\b(a while|some time|long time)\b", t):
        return 14
    return None


def summarise_complaint(text: str) -> str | None:
    t = text.lower()
    parts = []
    if re.search(r"\b(weak|weaker|weakness|strength)\b", t):
        parts.append("weaker than usual")
    if re.search(r"\b(tired|fatigue|exhausted|no energy|low energy|less energy|drained)\b", t):
        parts.append("tired")
    if re.search(r"\b(slow|slower|sluggish)\b", t):
        parts.append("slower than usual")
    if re.search(r"not (feel )?(like )?myself|not quite right", t):
        parts.append("not like yourself")
    if not parts:
        return None
    return " and ".join(parts[:2]) if len(parts) <= 2 else ", ".join(parts[:2]) + " and " + parts[2]


def extract_rules(text: str) -> Extraction:
    ex = Extraction()
    if FUNCTIONAL.search(text):
        ex.complaint_category = "functional"
    elif OUT_OF_SCOPE.search(text):
        ex.complaint_category = "out_of_scope"
    ex.duration_days = parse_duration(text)
    for k, pat in RED_FLAG_PATTERNS.items():
        for m in pat.finditer(text):
            if not _negated(text, m.start()):
                ex.red_flags[k] = True
                break
    for k, pat in MODIFIER_PATTERNS.items():
        for m in pat.finditer(text):
            if not _negated(text, m.start()):
                ex.modifiers[k] = True
                break
    if ex.red_flags.get("recent_fall_with_injury"):
        ex.modifiers.pop("fall_without_injury", None)
    if ex.red_flags.get("sudden_onset"):
        ex.onset = "sudden"
    elif re.search(r"\b(gradual|gradually|slowly|bit by bit|over (the )?(past|last) (few )?(days|week))\b", text, re.I):
        ex.onset = "gradual"
    ex.summary = summarise_complaint(text)
    return ex


LLM_SYSTEM = """You convert an older adult's words into JSON fields for a triage rules engine.
Only report what the person actually says. Do not diagnose. Do not decide urgency.
Return JSON with keys:
 complaint_category: "functional" (weakness, tiredness, slowness, not feeling like themselves) | "out_of_scope" | "unknown"
 duration_days: number or null
 onset: "sudden" | "gradual" | null
 red_flags: object with any of these keys set to true ONLY if clearly reported (including by family):
   sudden_onset, chest_pain, severe_breathlessness, one_sided_weakness, speech_difficulty, confusion,
   loss_of_consciousness, recent_fall_with_injury, sudden_vision_change
 modifiers: object with any of: reduced_intake, fever, getting_worse, fall_without_injury set to true if reported
 summary: short phrase completing "You've been feeling ..." or null"""


def extract_llm(text: str) -> Extraction | None:
    if not (config.LLM_BASE_URL and config.LLM_API_KEY):
        return None
    try:
        r = httpx.post(
            f"{config.LLM_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {config.LLM_API_KEY}"},
            json={
                "model": config.LLM_MODEL,
                "messages": [{"role": "system", "content": LLM_SYSTEM}, {"role": "user", "content": text}],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=12,
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        data = json.loads(content[content.find("{"): content.rfind("}") + 1])
    except Exception:  # noqa: BLE001 - LLM is optional; fall back to rules
        return None
    rf = {k: True for k, v in (data.get("red_flags") or {}).items() if v is True and k in RED_FLAG_PATTERNS}
    mods = {k: True for k, v in (data.get("modifiers") or {}).items() if v is True and k in MODIFIER_PATTERNS}
    dur = data.get("duration_days")
    return Extraction(
        complaint_category=data.get("complaint_category") if data.get("complaint_category") in ("functional", "out_of_scope") else None,
        duration_days=float(dur) if isinstance(dur, (int, float)) else None,
        onset=data.get("onset") if data.get("onset") in ("sudden", "gradual") else None,
        red_flags=rf,
        modifiers=mods,
        summary=data.get("summary") if isinstance(data.get("summary"), str) else None,
        source="llm",
    )


def extract(text: str) -> Extraction:
    ex = extract_rules(text)
    llm = extract_llm(text)
    if llm is None:
        return ex
    # Conservative merge: union of positive findings; rules take precedence for the rest.
    ex.red_flags = {**llm.red_flags, **ex.red_flags}
    ex.modifiers = {**llm.modifiers, **ex.modifiers}
    ex.complaint_category = ex.complaint_category or llm.complaint_category
    ex.duration_days = ex.duration_days if ex.duration_days is not None else llm.duration_days
    ex.onset = "sudden" if "sudden" in (ex.onset, llm.onset) else (ex.onset or llm.onset)
    ex.summary = ex.summary or llm.summary
    ex.source = "rules+llm"
    return ex


YES = re.compile(r"^\s*(yes|yeah|yep|ya|yah|y|correct|i do|i have|i did|i am|sure|ok|okay|right)\b", re.I)
NO = re.compile(r"^\s*(no|nope|nah|n|not really|i don'?t|i haven'?t|i didn'?t|i'?m not|none|never)\b", re.I)
UNSURE = re.compile(r"\b(not sure|unsure|don'?t know|dunno|maybe|perhaps|can'?t tell|i think so)\b", re.I)


def parse_yes_no(text: str) -> bool | None | str:
    """Return True / False, 'unsure', or None if not understood."""
    if UNSURE.search(text):
        return "unsure"
    if NO.search(text):
        return False
    if YES.search(text):
        return True
    return None
