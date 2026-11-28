"""Procedural sound effects and mixing tools (numpy/scipy). Every function returns mono float32 @ SR.
Usage en ligne de commande :
    python 07_Scripts/sfx.py --type whoosh --out 01_Assets/whoosh.wav
    python 07_Scripts/sfx.py --type ding --out 01_Assets/ding.wav
    python 07_Scripts/sfx.py --list
"""
import sys
import os
import argparse
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
_rng = np.random.default_rng(7)


def t_(d): return np.arange(int(round(d * SR))) / SR   # rounds the same way as noise()
def env_exp(d, tau): return np.exp(-t_(d) / tau)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def noise(d): return _rng.standard_normal(int(round(d * SR)))
def norm(x, p=1.0):
    m = np.abs(x).max()
    return x * (p / m) if m > 0 else x


def brown(d):
    w = np.cumsum(noise(d))
    w -= np.linspace(w[0], w[-1], len(w))
    return norm(hp(w, 20))


# —— Bricks / toys / UI ——
def click(pitch=1.0, v=1.0):
    """Plastic click: very short noise transient + two high resonances + a little low end"""
    d = .06
    tt = t_(d)
    tr = hp(noise(d), 2500) * env_exp(d, .0015)
    res = sum(a * np.sin(2 * np.pi * f * pitch * tt + _rng.random() * 6) * env_exp(d, tau)
              for f, a, tau in [(2900, .6, .012), (4600, .4, .008), (1500, .35, .018)])
    body = np.sin(2 * np.pi * 190 * pitch * tt) * env_exp(d, .01) * .5
    return norm(tr * .8 + res + body) * v


def clack(pitch=1.0, v=1.0):
    """Mechanical clack: mids + highs"""
    d = .09
    tt = t_(d)
    p = pitch * (.85 + _rng.random() * .3)
    x = hp(noise(d), 1200) * env_exp(d, .004) + sum(a * np.sin(2 * np.pi * f * p * tt) * env_exp(d, tau)
        for f, a, tau in [(1200, .6, .02), (2300, .5, .012), (380, .5, .03)])
    return norm(x) * v


def crash(v=1.0):
    d = .9
    out = np.zeros(int(d * SR))
    for k in range(18):
        s = int((k / 18) ** 1.4 * .6 * SR)
        c = clack(.8 + _rng.random() * .6, .4 + _rng.random() * .6)
        out[s:s + len(c)] += c[:len(out) - s]
    out[:int(.2 * SR)] += lp(noise(.2), 400) * env_exp(.2, .05) * .8
    return norm(out) * v


def whoosh(d=.35, v=1.0):
    """Smooth aerodynamic whoosh / transition swipe"""
    n = noise(d)
    tt = t_(d)
    out = np.zeros_like(n)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480)
        f = 600 + 2600 * np.sin(np.pi * i / len(n))
        seg = bp(n[max(0, i - 2000):hi], f * .7, f * 1.3)[-(hi - i):]
        out[i:hi] = seg
    return norm(out * np.sin(np.pi * tt / d) ** 2) * v


def creak(v=1.0):
    d = .22
    tt = t_(d)
    f0 = 70 + _rng.random() * 40
    saw = 2 * ((tt * f0 * (1 + .3 * np.sin(2 * np.pi * 9 * tt))) % 1) - 1
    return norm(bp(saw, 400, 3000) * (np.abs(np.sin(2 * np.pi * 23 * tt)) ** 3) * np.sin(np.pi * tt / d)) * v


def thump(v=1.0, f=70):
    d = .35
    tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .3 * tt)) * env_exp(d, .07) + lp(noise(d), 300) * env_exp(d, .02) * .5) * v


def step(v=1.0):
    d = .05
    tt = t_(d)
    return norm(hp(noise(d), 1800) * env_exp(d, .004) + np.sin(2 * np.pi * 2200 * tt) * env_exp(d, .006) * .5) * v


def ding(v=1.0):
    """Bright bell / success chime"""
    d = 1.6
    tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau) for f, a, tau in [(1318, 1, .6), (2637, .5, .35), (3951, .3, .2), (1976, .25, .5), (5274, .15, .1)])
    return norm(x) * v


def pop(v=1.0):
    """Playful pop / bubble effect"""
    d = .18
    tt = t_(d)
    f = 500 + 1400 * tt / d
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .05)) * v


def quindar(v=1.0, f=2525):
    """NASA quindar telemetry beep"""
    d = .25
    tt = t_(d)
    x = np.sin(2 * np.pi * f * tt)
    x[:240] *= np.linspace(0, 1, 240)
    x[-240:] *= np.linspace(1, 0, 240)
    return x * .5 * v


def rumble(d=1.5, v=1.0):
    return norm(lp(brown(d), 200)) * np.sin(np.pi * t_(d) / d / 2) ** 2 * v


def ignite(v=1.0):
    d = 1.8
    tt = t_(d)
    sub = np.sin(2 * np.pi * 45 * tt * (1 - .25 * tt)) * env_exp(d, .5)
    burst = lp(noise(d), 1200) * env_exp(d, .35)
    return norm(sub * .9 + burst) * v


def roar(d, v=1.0):
    tt = t_(d)
    b = lp(brown(d), 700)
    crack = hp(noise(d), 3000) * (_rng.random(len(tt)) > .995) * 3
    e = np.minimum(1, tt / .4) * np.minimum(1, (d - tt) / .6)
    return norm(b + lp(crack, 6000) * .3) * e * v


def heartbeat(v=1.0):
    return (thump(1, 55) + np.pad(thump(.7, 50), (int(.22 * SR), 0))[:len(thump(1, 55))]) * v


# Export WAV utility
def save_wav(filename, data, sr=SR):
    import wave
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    samples = np.clip(data, -1.0, 1.0)
    int16_data = (samples * 32767).astype(np.int16)
    with wave.open(filename, 'w') as wf:
        if int16_data.ndim == 1:
            wf.setnchannels(1)
        else:
            wf.setnchannels(int16_data.shape[1])
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(int16_data.tobytes())


SFX_REGISTRY = {
    "whoosh": whoosh,
    "ding": ding,
    "pop": pop,
    "click": click,
    "clack": clack,
    "crash": crash,
    "thump": thump,
    "step": step,
    "quindar": quindar,
    "rumble": rumble,
    "ignite": ignite,
    "creak": creak,
    "heartbeat": heartbeat,
}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Générateur procédural de Sound Effects (SFX)")
    parser.add_argument('--type', type=str, choices=list(SFX_REGISTRY.keys()), default='whoosh', help="Type d'effet sonore")
    parser.add_argument('--out', type=str, default='sfx_test.wav', help="Fichier de sortie (.wav)")
    parser.add_argument('--peak', type=float, default=0.35, help="Plafond d'amplitude maximal (0.0 - 1.0, défaut 0.35 pour éviter toute saturation)")
    parser.add_argument('--list', action='store_true', help="Lister tous les types de bruitages disponibles")

    args = parser.parse_args()

    if args.list:
        print("Bruitages synthétiques disponibles :")
        for k in SFX_REGISTRY.keys():
            print(f" - {k}")
        sys.exit(0)

    func = SFX_REGISTRY[args.type]
    audio_data = func()
    # Adoucissement passe-bas sur les sons secs/aigus (click, clack, ding, quindar, crash, step) pour zéro stridence
    if args.type in ('click', 'clack', 'ding', 'quindar', 'crash', 'step'):
        audio_data = lp(audio_data, 5200)
    peak = max(0.02, min(1.0, float(args.peak)))
    audio_data = norm(audio_data, p=peak)
    save_wav(args.out, audio_data)
    print(f"Effet '{args.type}' généré avec succès dans : {args.out} (peak={peak})")

