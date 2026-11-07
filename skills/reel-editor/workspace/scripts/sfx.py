"""Generate the reel SFX once via ElevenLabs sound generation, then convert them to 48 kHz wavs in template/public/sfx.

Run from the workspace root: python3 scripts/sfx.py [name ...]
Reads ELEVENLABS_API_KEY from .env. Skips any sound already on disk, so pass a name to add one.
"""
import json, pathlib, subprocess, sys, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
env = dict(l.split("=", 1) for l in (root / ".env").read_text().splitlines() if "=" in l and not l.startswith("#"))
key = env["ELEVENLABS_API_KEY"].strip()
raw = root / "sfx-raw"; raw.mkdir(parents=True, exist_ok=True)
wav = root / "template" / "public" / "sfx"; wav.mkdir(parents=True, exist_ok=True)
SFX = {
    "riser_hit":   ("short tense cinematic riser that ends in a deep punchy sub boom hit, modern social video", 1.6),
    "whoosh_in":   ("fast clean air whoosh swipe for a UI panel sliding in, short, no music", 0.6),
    "whoosh_soft": ("very soft subtle swoosh, gentle transition, short", 0.5),
    "pop":         ("crisp bubbly UI pop for a card appearing, single, clean, no reverb", 0.4),
    "pop_soft":    ("soft muted UI pop, subtle notification blip, single", 0.3),
    "click":       ("single crisp mouse click, close mic, dry", 0.2),
    "typing":      ("fast light laptop keyboard typing, short burst, close mic, dry", 1.4),
    "stamp":       ("heavy rubber stamp thud on paper desk, single, punchy", 0.5),
    "tick_roll":   ("rapid mechanical counter ticking, digits rolling up fast, accelerating", 1.2),
    "ding":        ("bright clean single bell ding, success chime, short", 0.8),
    "paper":       ("sheet of paper sliding quickly across a desk, short swish", 0.5),
    "scroll":      ("quick smooth scroll swish with soft mechanical wheel ticks, short", 0.7),
}
only = set(sys.argv[1:])
for name, (text, dur) in SFX.items():
    if only and name not in only: continue
    dst = raw / f"{name}.mp3"
    if not dst.exists():
        req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation", method="POST",
            headers={"xi-api-key": key, "Content-Type": "application/json"},
            data=json.dumps({"text": text, "duration_seconds": max(dur, 0.5), "prompt_influence": 0.6}).encode())
        with urllib.request.urlopen(req, timeout=120) as r: dst.write_bytes(r.read())
    out = wav / f"{name}.wav"
    if not out.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(dst), "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(out)], check=True)
    print("ok", name)
