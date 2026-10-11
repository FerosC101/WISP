"""Original instrumental bed for the WISP promo, plus the final mix.

The connected ElevenLabs connector has no music generation, so the bed is composed here:
a warm detuned pad whose chords change on the scene cuts, a soft felt-mallet note on each
sit-to-stand marker (rising through the chord), a very quiet pulse under the sensing and
decision scenes, a little air, and a final D-major chord that rings out by 20 s.

Run with the services venv:  ../../../services/.venv/bin/python -I make_music.py
Writes audio/music.wav (bed alone) and audio/mix.wav (narration + SFX + ducked bed).
"""

import numpy as np
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 20.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def hz(note: str) -> float:
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octave + 1) - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ── chords, one per scene ────────────────────────────────────────────────────
CHORDS = [
    (0.00, 5.25, ["B2", "F#3", "A3", "C#4", "D4"]),     # S1 uncertainty: Bm9
    (5.25, 7.85, ["G2", "D3", "B3", "D4", "F#4"]),      # S2 safety: Gmaj7
    (7.85, 11.00, ["E2", "B2", "G3", "D4", "F#4"]),     # S3 sensing: Em9
    (11.00, 13.50, ["A2", "E3", "A3", "D4", "E4"]),     # S4 baseline: Asus4 …
    (13.50, 17.00, ["D2", "A2", "F#3", "C#4", "E4"]),   # S5 decision: Dmaj9
    (17.00, 20.00, ["D2", "A2", "F#3", "A3", "E4"]),    # S6 brand: D add9, rings out
]


def pad_voice(f0, n0, n1):
    """Detuned, soft-harmonic voice between sample n0 and n1."""
    tt = t[n0:n1]
    out = np.zeros((n1 - n0, 2))
    for det, pan in ((-0.0025, 0.3), (0.0025, 0.7)):
        f = f0 * (1 + det)
        ph = rng.uniform(0, 2 * np.pi)
        v = sum((1 / h ** 1.7) * np.sin(2 * np.pi * f * h * tt + ph * h) for h in range(1, 7))
        v *= 1 + 0.05 * np.sin(2 * np.pi * 0.23 * tt + ph)
        out[:, 0] += v * (1 - pan)
        out[:, 1] += v * pan
    return out


pad = np.zeros((N, 2))
for i, (a, b, notes) in enumerate(CHORDS):
    last = i == len(CHORDS) - 1
    n0, n1 = int(max(0, a - 0.45) * SR), int(min(DUR, b + (0 if last else 0.9)) * SR)
    seg = np.zeros((n1 - n0, 2))
    for k, note in enumerate(notes):
        f = hz(note)
        # Asus4 resolves to A major halfway through the baseline scene
        if i == 3 and note == "D4":
            s0 = pad_voice(f, n0, n1)
            s1 = pad_voice(hz("C#4"), n0, n1)
            x = smoothstep((t[n0:n1] - 12.35) / 0.5)[:, None]
            v = s0 * (1 - x) + s1 * x
        else:
            v = pad_voice(f, n0, n1)
        seg += v * (0.9 if k == 0 else 0.55)
    tt = t[n0:n1]
    env = smoothstep((tt - (a - 0.45)) / (0.9 if i else 1.4))
    if last:
        env *= np.exp(-np.clip(tt - 17.6, 0, None) / 1.05)   # ring out: about -31 dB by 20 s, then a tail fade
    else:
        env *= 1 - smoothstep((tt - b) / 0.9)
    pad[n0:n1] += seg * env[:, None]
pad = np.stack([lp(pad[:, c], 1500) for c in range(2)], 1)

# sub: the chord root, an octave down, very soft
sub = np.zeros(N)
for i, (a, b, notes) in enumerate(CHORDS):
    f = hz(notes[0]) / 2
    e = smoothstep((t - (a - 0.3)) / 0.6) * (1 - smoothstep((t - b) / 0.6) if i < len(CHORDS) - 1 else np.exp(-np.clip(t - 17.6, 0, None) / 1.0))
    sub += np.sin(2 * np.pi * f * t) * e * (t >= a - 0.3)
sub = lp(sub, 140) * 0.35


# ── felt mallet ──────────────────────────────────────────────────────────────
def mallet(f, at, gain, decay=0.9):
    n0 = int(at * SR)
    L = int(min(DUR - at, decay * 5) * SR)
    tt = np.arange(L) / SR
    v = np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * f * 3.97 * tt) * np.exp(-tt / 0.08) + 0.12 * np.sin(2 * np.pi * f * 2 * tt)
    v *= np.exp(-tt / decay) * smoothstep(tt / 0.006)
    out = np.zeros(N)
    out[n0 : n0 + L] = lp(v, 3200) * gain
    return out


mal = np.zeros(N)
# one note per sit-to-stand marker (peaks at 8.6, 9.1, … 10.6), rising through Em9
for k, note in enumerate(["E4", "G4", "B4", "D5", "F#5"]):
    mal += mallet(hz(note), 8.6 + 0.5 * k + 0.02, 0.16 + 0.02 * k, 0.75)
# the two baseline rows settle
mal += mallet(hz("A4"), 11.55, 0.12, 0.9) + mal * 0
mal += mallet(hz("E5"), 11.85, 0.10, 0.9)
# recommendation lands
mal += mallet(hz("F#4"), 13.72, 0.14, 1.1) + mallet(hz("A4"), 13.97, 0.10, 1.1)

# very quiet pulse on the half-second grid, sensing through decision
pulse = np.zeros(N)
for k in range(19):
    at = 8.1 + 0.5 * k
    if at > 16.7:
        break
    n0 = int(at * SR)
    L = int(0.18 * SR)
    tt = np.arange(L) / SR
    click = rng.standard_normal(L) * np.exp(-tt / 0.012)
    thump = np.sin(2 * np.pi * 72 * tt) * np.exp(-tt / 0.06)
    pulse[n0 : n0 + L] += bp(click, 1800, 5200) * 0.05 + thump * 0.10
pulse_env = smoothstep((t - 7.9) / 0.6) * (1 - smoothstep((t - 15.8) / 1.0))
pulse *= pulse_env

# air: filtered noise that breathes with the story
air = bp(rng.standard_normal(N), 2500, 7000)
air *= (0.010 + 0.012 * smoothstep((t - 7.6) / 0.8) * (1 - smoothstep((t - 13.2) / 1.0))) * (1 - smoothstep((t - 18.5) / 1.4))

mono_extra = mal + pulse + air + sub
bed = pad * 0.16 + np.stack([mono_extra, mono_extra], 1)


# ── reverb (synthetic decaying-noise impulse, stereo-decorrelated) ───────────
def impulse(seconds=2.4):
    L = int(seconds * SR)
    tt = np.arange(L) / SR
    ir = rng.standard_normal((L, 2)) * np.exp(-tt / 0.55)[:, None]
    ir = np.stack([lp(ir[:, c], 5000) for c in range(2)], 1)
    ir[: int(0.012 * SR)] = 0
    return ir / np.abs(ir).sum(0).max() * 6


IR = impulse()
wet = np.stack([fftconvolve(bed[:, c], IR[:, c])[:N] for c in range(2)], 1)
music = bed * 0.75 + wet * 0.45

# end: a clean, gentle tail into silence at exactly 20.0 s
music *= (1 - smoothstep((t - 19.55) / 0.45))[:, None]
music *= smoothstep(t / 0.25)[:, None]


# ── load ElevenLabs stems ────────────────────────────────────────────────────
def load(name):
    sr, x = wavfile.read(f"audio/{name}.wav")
    assert sr == SR
    x = x.astype(np.float64) / 32768
    return x if x.ndim == 2 else np.stack([x, x], 1)


def place(x, at, gain):
    out = np.zeros((N, 2))
    n0 = int(at * SR)
    L = min(len(x), N - n0)
    out[n0 : n0 + L] = x[:L] * gain
    return out


def resample(x, ratio):
    """Pitch by ratio (duration changes accordingly)."""
    L = int(len(x) / ratio)
    src = np.arange(L) * ratio
    return np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in range(2)], 1)


VO_AT = 0.10
vo = place(load("vo_take1"), VO_AT, 1.0)
sfx_line = place(load("sfx_line"), 0.08, 1.4)
sfx_sense = place(load("sfx_sense"), 7.62, 0.36)
logo = resample(load("sfx_logo"), 440.0 / 498.3)            # retuned B4 → A4, the fifth of the final D chord
logo_wet = np.stack([fftconvolve(logo[:, c], IR[:, c]) for c in range(2)], 1)
logo = np.vstack([logo, np.zeros((len(logo_wet) - len(logo), 2))]) * 0.8 + logo_wet * 0.35
sfx_logo = place(logo, 17.47, 0.22)
sfx = sfx_line + sfx_sense + sfx_logo
sfx *= (1 - smoothstep((t - 19.55) / 0.45))[:, None]

# duck the bed under the voice (smoothed voice envelope, ~-7 dB at full speech)
v = np.abs(vo).mean(1)
win = int(0.05 * SR)
env = np.sqrt(np.convolve(v ** 2, np.ones(win) / win, mode="same"))
env = np.clip(env / 0.06, 0, 1)
k = int(0.35 * SR)
env = np.convolve(env, np.hanning(k) / np.hanning(k).sum(), mode="same")
duck = 1 - 0.68 * np.clip(env * 1.4, 0, 1)

MUSIC_GAIN = 0.25
mix = vo + sfx + music * MUSIC_GAIN * duck[:, None]

wavfile.write("audio/music.wav", SR, (np.clip(music / max(1e-9, np.abs(music).max()) * 0.8, -1, 1) * 32767).astype(np.int16))
peak = np.abs(mix).max()
wavfile.write("audio/mix.wav", SR, (np.clip(mix / peak * 0.89, -1, 1) * 32767).astype(np.int16))
print(f"mix peak before normalize {20*np.log10(peak):.1f} dBFS; music peak {20*np.log10(np.abs(music).max()):.1f}")

if __name__ == "__main__":
    def db(x):
        return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
    speech = env > 0.5
    m = music * MUSIC_GAIN * duck[:, None]
    print(f"under speech: voice {db(vo[speech]):.1f} dB, music {db(m[speech]):.1f} dB → voice is {db(vo[speech]) - db(m[speech]):.1f} dB above the bed")
    gaps = (~speech) & (t > 0.3) & (t < 17.3)
    print(f"in pauses: music {db(m[gaps]):.1f} dB")
