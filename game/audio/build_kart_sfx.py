"""Original, deterministic Dlicom kart cues. No sampled third-party audio.

Run with Python's standard library; mono 24 kHz PCM keeps short cues small.
Motor audio remains the separately licensed real engine recording.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 24000
OUT = Path(__file__).resolve().parents[2] / 'assets' / 'audio' / 'sfx'
TAU = math.tau


def render(name, seconds, sample):
    rng = random.Random(7301)
    count = round(seconds * RATE)
    values = []
    low = 0.0
    for i in range(count):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        low += .14 * (noise - low)
        # Ten-millisecond fades prevent hard edges and tiny DC clicks.
        edge = min(1, t / .01, (seconds - t) / .015)
        values.append(sample(t, low, noise - low) * max(0, edge))
    peak = max(abs(v) for v in values) or 1
    pcm = b''.join(struct.pack('<h', round(v / peak * 22000)) for v in values)
    with wave.open(str(OUT / name), 'wb') as file:
        file.setparams((1, 2, RATE, count, 'NONE', 'not compressed'))
        file.writeframes(pcm)
    print(f'{name}: {seconds:.2f}s, {len(pcm) + 44:,} bytes')


def bell(t, frequency):
    return (math.sin(TAU * frequency * t) * math.exp(-8 * t)
            + .22 * math.sin(TAU * frequency * 2 * t) * math.exp(-16 * t))


def pickup(t, low, high):
    value = 0.0
    for delay, frequency in [(0, 660), (.075, 880), (.15, 1320)]:
        if t >= delay:
            value += bell(t - delay, frequency) * .25
    return value


def victory(t, low, high):
    # Rounded brass-like harmonics, a rising major figure and resolved chord.
    value = 0.0
    for delay, frequency in [(0, 392), (.14, 494), (.28, 587), (.48, 784), (.48, 494), (.48, 587)]:
        s = t - delay
        if s >= 0:
            env = min(1, s / .025) * math.exp(-2.8 * s)
            value += env * (math.sin(TAU * frequency * s) + .22 * math.sin(TAU * 2 * frequency * s) + .07 * math.sin(TAU * 3 * frequency * s)) * .13
    return value


def shield(t, low, high):
    # Rounded energy swell, rather than a gunshot or aggressive electrical zap.
    phase = TAU * (210 * t + 140 * t * t)
    return (math.sin(phase) * .22 + math.sin(phase * 1.5) * .1 + low * .16) * math.sin(math.pi * t / .65) ** 2


def boost(t, low, high):
    # Air rush with a low propulsion body; no long cinematic explosion.
    env = min(1, t / .045) * math.exp(-3.5 * t)
    return env * (low * .9 + high * .18 + math.sin(TAU * (80 * t + 80 * t * t)) * .12)


def missile(t, low, high):
    env = min(1, t / .012) * math.exp(-8 * t)
    return env * (low * .95 + high * .2 + math.sin(TAU * (125 * t - 45 * t * t)) * .2)


def impact(t, low, high):
    return math.exp(-15 * t) * (math.sin(TAU * (85 * t - 50 * t * t)) * .6 + low * .65 + high * .08)


if __name__ == '__main__':
    render('kart-pickup.wav', .55, pickup)
    render('kart-victory.wav', 1.8, victory)
    render('kart-shield.wav', .65, shield)
    render('kart-boost.wav', .85, boost)
    render('kart-missile.wav', .42, missile)
    render('kart-impact.wav', .32, impact)
    render('kart-landing.wav', .24, lambda t, lo, hi: impact(t, lo, hi) * .7)
    render('kart-drift.wav', .8, lambda t, lo, hi: (lo * .35 + hi * .12) * (.9 + .1 * math.sin(TAU * 30 * t)))
    render('kart-click.wav', .075, lambda t, lo, hi: math.exp(-65 * t) * (math.sin(TAU * 550 * t) * .5 + lo * .15))
    render('kart-back.wav', .11, lambda t, lo, hi: math.exp(-35 * t) * math.sin(TAU * (500 * t - 900 * t * t)) * .5)
