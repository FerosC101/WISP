"""Original score and UI sounds for the WISP demo film (composed in code).

Upbeat, warm, advertisement-style: 96 BPM, so one bar is exactly 2.5 s and every scene boundary
(20, 50, 80, 165, 200, 240, 260, 280 s) lands on a bar line. Soft kick, snaps, shaker, round bass,
plucked arpeggios and a warm pad. The emergency section (165-200 s) drops to a restrained pad with no
drums; the score builds through the roadmap and resolves to D major on the logo at 290.4 s.

The connected ElevenLabs connector offers speech and SFX only (no music), so the score is written here.
Run:  ../../services/.venv/bin/python -I scripts/make_music.py     (from video/wisp-demo)
Writes public/audio/music.wav and public/audio/sfx/{chime,settle,low,soft,whoosh,pop,riser}.wav
"""

from pathlib import Path

import numpy as np
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
DUR = 300.0
N = int(SR * DUR)
BPM = 96
BEAT = 60 / BPM          # 0.625 s
BAR = BEAT * 4           # 2.5 s
rng = np.random.default_rng(11)

NAMES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(note: str) -> float:
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((NAMES[name] + 12 * (octave + 1) - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


CH = {  # chord tones (root first), voiced around the middle register
    "D": ["D3", "F#3", "A3", "E4"], "A": ["A2", "E3", "A3", "C#4"], "Bm": ["B2", "F#3", "A3", "D4"],
    "G": ["G2", "D3", "B3", "F#4"], "Em": ["E3", "B3", "D4", "G4"], "F#m": ["F#2", "C#3", "A3", "E4"],
    "C": ["C3", "G3", "B3", "E4"], "Asus": ["A2", "E3", "A3", "D4"], "Bm9": ["B2", "F#3", "A3", "C#4"],
}
# (start s, end s, chords, bars per chord, drums: none | light | full, arps: 0..1)
SECTIONS = [
    (0, 20, ["Bm9", "G"], 2, "none", 0.0),
    (20, 30, ["Em", "C"], 2, "none", 0.6),
    (30, 37.5, ["C", "Asus", "C"], 1, "none", 0.8),
    (37.5, 50, ["G", "D", "Em", "A", "A"], 1, "light", 0.8),
    (50, 80, ["D", "A", "Bm", "G"], 1, "full", 1.0),
    (80, 130, ["D", "A", "Bm", "G"], 1, "full", 0.9),
    (130, 150, ["D", "Bm", "G", "A"], 1, "light", 1.0),
    (150, 165, ["G", "A", "D", "D"], 1, "full", 1.0),
    (165, 187.5, ["Bm", "F#m", "G", "Em"], 2, "none", 0.0),
    (187.5, 200, ["Em", "G", "A", "A", "A"], 1, "none", 0.5),
    (200, 240, ["D", "A", "Bm", "G"], 1, "full", 1.0),
    (240, 260, ["G", "D", "Em", "A"], 1, "light", 0.8),
    (260, 280, ["Bm", "G", "D", "A"], 1, "full", 1.0),
    (280, 290, ["G", "A", "Bm", "A"], 1, "full", 1.0),
]
FINAL = 290.4


def chord_at(t):
    for a, b, chords, per, _, _ in SECTIONS:
        if a <= t < b:
            i = int((t - a) // (BAR * per)) % len(chords)
            return chords[i]
    return "D"


def section_at(t):
    for sec in SECTIONS:
        if sec[0] <= t < sec[1]:
            return sec
    return None


def add(out, x, t, gain=1.0, pan=0.5):
    n0 = int(t * SR)
    if n0 >= N or n0 < 0:
        return
    n1 = min(N, n0 + len(x))
    out[n0:n1, 0] += x[: n1 - n0] * gain * (1 - pan) * 2
    out[n0:n1, 1] += x[: n1 - n0] * gain * pan * 2


def env(n, a=0.005, d=0.3):
    tt = np.arange(n) / SR
    return np.minimum(1, tt / a) * np.exp(-tt / d)


# ── instruments ────────────────────────────────────────────────────────────
def pad():
    out = np.zeros((N, 2))
    t = 0.0
    while t < FINAL:
        c = chord_at(t)
        sec = section_at(t)
        per = BAR * (sec[3] if sec else 1)
        n = int((per + 1.4) * SR)
        tt = np.arange(n) / SR
        e = np.minimum(1, tt / 0.6) * np.minimum(1, np.maximum(0, (per + 1.4 - tt) / 1.4))
        quiet = 0.75 if sec and sec[4] == "none" and t >= 165 else 1.0
        for k, note in enumerate(CH[c]):
            f0 = hz(note)
            for det, pan in ((-0.003, 0.3), (0.003, 0.7)):
                ph = rng.uniform(0, 2 * np.pi)
                v = sum((1 / h**1.6) * np.sin(2 * np.pi * f0 * (1 + det) * h * tt + ph * h) for h in range(1, 6))
                add(out, v * e * 0.032 * quiet, t, 1, pan)
        t += per
    # final D chord, long ring
    n = int(9.6 * SR)
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / 0.05) * np.exp(-tt / 3.2)
    for k, note in enumerate(["D2", "A2", "D3", "F#3", "A3", "E4", "F#4"]):
        v = sum((1 / h**1.7) * np.sin(2 * np.pi * hz(note) * h * tt) for h in range(1, 6))
        add(out, v * e * 0.05, FINAL, 1, 0.3 + 0.06 * k)
    return lp(out, 3200)


def felt(f0, dur=1.2, vel=1.0, decay=0.35):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    v = sum(a * np.sin(2 * np.pi * f0 * h * tt) * np.exp(-tt / (decay / h)) for h, a in ((1, 1.0), (2, 0.45), (3, 0.18), (4, 0.08)))
    return v * np.minimum(1, tt / 0.004) * vel


def arps():
    out = np.zeros((N, 2))
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    step = BEAT / 2  # 8ths
    t, i = 0.0, 0
    while t < FINAL - 0.01:
        sec = section_at(t)
        amt = sec[5] if sec else 0
        if amt > 0:
            notes = CH[chord_at(t)]
            f0 = hz(notes[pattern[i % 8]]) * 2
            accent = 1.0 if i % 2 == 0 else 0.7
            add(out, felt(f0, 0.9, accent, 0.22), t, 0.05 * amt, 0.3 + 0.4 * ((i % 4) / 3))
        t += step
        i += 1
    return lp(out, 4200)


def piano_intro():
    # sparse felt piano for the quiet sections (intro and the emergency break)
    out = np.zeros((N, 2))
    for a, b in ((0.8, 20), (165, 187.5)):
        t = a
        k = 0
        while t < b - 0.5:
            notes = CH[chord_at(t)]
            add(out, felt(hz(notes[(k * 2 + 1) % len(notes)]) * 2, 3.0, 0.8, 0.9), t, 0.045, 0.4)
            t += BEAT * (3 if k % 2 else 2)
            k += 1
    return out


def bass():
    out = np.zeros((N, 2))
    t = 0.0
    while t < FINAL:
        sec = section_at(t)
        drums = sec[4] if sec else "none"
        if drums != "none" or (187.5 <= t < 200):
            root = hz(CH[chord_at(t)][0]) / (2 if hz(CH[chord_at(t)][0]) > 120 else 1)
            n = int(BEAT * 0.95 * SR)
            tt = np.arange(n) / SR
            v = (np.sin(2 * np.pi * root * tt) + 0.3 * np.sin(2 * np.pi * root * 2 * tt)) * env(n, 0.006, 0.28)
            add(out, v, t, 0.11 if drums == "full" else 0.08, 0.5)
            add(out, v * 0.6, t + BEAT / 2, 0.11 if drums == "full" else 0.08, 0.5)
        t += BEAT
    return lp(out, 700)


def kick():
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    f = 45 + 80 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt / 0.16) * np.minimum(1, tt / 0.002)


def snap():
    n = int(0.3 * SR)
    x = rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR / 0.06)
    return bp(x, 1400, 5200) * 0.8


def shaker():
    n = int(0.09 * SR)
    x = rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR / 0.025)
    return hp(x, 6000)


def drums():
    out = np.zeros((N, 2))
    K, S, H = kick(), snap(), shaker()
    t, b = 0.0, 0
    while t < FINAL - 0.01:
        sec = section_at(t)
        mode = sec[4] if sec else "none"
        if mode == "full":
            if b % 4 in (0, 2):
                add(out, K, t, 0.30, 0.5)
            if b % 4 in (1, 3):
                add(out, S, t, 0.11, 0.55)
        elif mode == "light":
            if b % 4 == 0:
                add(out, K, t, 0.18, 0.5)
            if b % 4 in (1, 3):
                add(out, S, t, 0.07, 0.55)
        if mode != "none":
            for k in range(4):  # 16th shaker, offbeats louder
                add(out, H, t + k * BEAT / 4, (0.035 if k % 2 else 0.018) * (1 if mode == "full" else 0.7), 0.65)
        t += BEAT
        b += 1
    # snap roll into the final chorus
    for k in range(16):
        add(out, S, 277.5 + k * BEAT / 4, 0.03 + 0.05 * k / 16, 0.55)
    return out


def riser(dur=2.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = rng.normal(0, 1, n)
    out = np.zeros(n)
    seg = int(0.05 * SR)
    for i in range(0, n, seg):
        p = i / n
        lo = 300 + 3500 * p
        out[i:i + seg] = bp(x[i:i + seg], lo, lo * 1.8)
    return out * (tt / dur) ** 2


music = pad() + arps() + piano_intro() + bass() + drums()
for t in (18.0, 48.0, 78.0, 198.0, 278.0, 288.4):
    r = riser(2.0)
    add(music, r, t, 0.05, 0.5)
t = np.arange(N) / SR
fade = np.clip(t / 1.5, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
music *= fade[:, None]
music /= np.max(np.abs(music)) / 0.7
(ROOT / "public/audio/sfx").mkdir(parents=True, exist_ok=True)
wavfile.write(ROOT / "public/audio/music.wav", SR, (music * 32767).astype(np.int16))


# ── UI sounds, tuned to the score ──────────────────────────────────────────
def write(name, x):
    x = x / (np.max(np.abs(x)) / 0.8)
    st = np.stack([x, x], axis=1) if x.ndim == 1 else x
    wavfile.write(ROOT / f"public/audio/sfx/{name}.wav", SR, (st * 32767).astype(np.int16))


def tone(notes, dur, gap=0.09):
    n = int(dur * SR)
    out = np.zeros(n)
    for k, nt in enumerate(notes):
        x = felt(hz(nt), dur, 0.9, 0.8)
        o = int(k * gap * SR)
        out[o:] += x[: n - o]
    return lp(out, 5000)


write("chime", tone(["A5", "D6"], 2.0, 0.11))
write("settle", tone(["D4", "A4", "F#5"], 2.6, 0.08))
write("low", tone(["D3", "A3"], 2.8, 0.0))
write("soft", tone(["E5", "B4"], 2.0, 0.16))
# whoosh: a band of air that sweeps down and fades
n = int(0.7 * SR)
tt = np.arange(n) / SR
x = rng.normal(0, 1, n)
w = np.zeros(n)
seg = int(0.02 * SR)
for i in range(0, n, seg):
    p = i / n
    lo = 2600 - 2000 * p
    w[i:i + seg] = bp(x[i:i + seg], lo, lo * 2.2)
w *= np.sin(np.pi * np.clip(tt / 0.7, 0, 1)) ** 1.5
write("whoosh", w)
# pop: a soft round click for UI elements
n = int(0.18 * SR)
tt = np.arange(n) / SR
pop = np.sin(2 * np.pi * (900 - 500 * tt / 0.18) * tt) * np.exp(-tt / 0.03)
write("pop", pop)
write("riser", riser(2.0))
print("score + UI sounds written")
