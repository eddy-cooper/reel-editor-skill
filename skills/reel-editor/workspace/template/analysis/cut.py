"""Cut a raw 4K talking-head clip to the clean takes, close pauses, crop for the bottom panel.

Run from the reel folder: uv run --no-project --with numpy --with soundfile python analysis/cut.py <clip.MP4>
Needs analysis/audio16k.wav and analysis/transcript.json (see transcribe.py).
Writes public/talk-cut.mov and public/words.json (times on the cut timeline).
KEEP, FIX, ONSET, CROP_X, GRADE and the gate are per clip; the values below are a worked example.
"""
import json, subprocess, sys
import numpy as np, soundfile as sf

SRC = sys.argv[1]
FPS = 25
CROP_W = 2333  # 1080x1000 panel: 2333x2160 of the 4K frame (v1 was 2084 for 1080x1120)
CROP_X = 2000 - CROP_W // 2  # head centred at about x = 2000 of 3840
GRADE = "eq=contrast=1.02:saturation=1.03"  # bright, even room: no lift needed
# Clean takes, in source seconds (by word start). Dropped: "Let's start with big tutoring, C tier" (retaken)
# and the aside "Is that too pluggy?".
KEEP = [
    (1.0, 6.4),      # VCE study method tier list as someone who got two 50s and a 99.95 ATAR.
    (10.3, 12.6),    # Big tutoring, easy C tier.
    (12.8, 24.2),    # These companies tend to feed off your anxiety ... in front of dozens of people.
    (24.7, 30.7),    # Some of their resources are good, but I think ... on VCE Hub's test maker.
    (38.9, 43.7),    # Study design tracking, A tier, but only if you used it to actually inform your study.
    (46.5, 51.9),    # Simply ticking boxes ... is useless.
    (55.8, 65.3),    # If you go on VCE Hub ... build a custom test out of it.
    (67.3, 68.7),    # Textbook, B tier.
    (70.6, 78.9),    # The textbook is severely underrated ... application style questions.
    (82.9, 95.6),    # Past exams, S tier ... log all your mistakes.
]
FIX = {"VCAR": "VCAA", "-tier.": "tier.", "-tier,": "tier,", "zoom": "Zoom", "Traffic": "traffic", "Light": "light"}
SENT_START = {"Big", "Study", "Textbook", "Past"}  # keep capitals at the start of a sentence

# Speech envelope (10 ms RMS) to drop breaths and silences whisper hid inside words.
a, sr = sf.read("analysis/audio16k.wav")
hop = sr // 100
env = np.array([np.sqrt((a[i:i + hop] ** 2).mean() + 1e-12) for i in range(0, len(a) - hop, hop)])
db = 20 * np.log10(env)
loud = db > -34  # gate for pauses; this room's floor is about -52 dB

words = json.load(open("analysis/transcript.json"))["words"]
ONSET = {}  # source start -> measured voiced start, for words whose whisper start sits on a blip
for w in words: w["s"] = ONSET.get(w["s"], w["s"])
for w in words:  # stretched word: start it at its first clearly voiced frame
    if w["e"] - w["s"] > 0.5:
        v = [i for i in range(int(w["s"] * 100), int(w["e"] * 100)) if db[i] > -24]
        if v and v[0] / 100 - w["s"] > 0.15: w["s"] = round(v[0] / 100 - 0.04, 3)
words = [w for w in words if any(a <= w["s"] < b for a, b in KEEP)]
# whisper merges: "99" ".95" -> "99.95", "90" "%" -> "90%"; stretched onsets
out = []
for w in words:
    t = w["w"]
    if t == ".95" and out: out[-1].update(w=out[-1]["w"] + ".95", e=w["e"]); continue
    if t == "%" and out: out[-1].update(w=out[-1]["w"] + "%", e=w["e"]); continue
    prev = out[-1]["w"] if out else "."
    if t in FIX and not (t in SENT_START and prev[-1] in ".?!"): t = FIX[t]
    if t == "easy" and prev[-1] in ".?!": t = "Easy"
    if t in ("Easy", "easy") and out and out[-1]["w"][-1] not in ".,?!":  # "Big tutoring. Easy C tier."
        out[-1]["w"] += "."; t = "Easy"
    if t == "B" and prev == "Textbook": out[-1]["w"] = "Textbook."
    out.append(dict(w, w=t))
words = out
for a, b in zip(words, words[1:]):  # close sentences whisper left open, so caption pages break there
    if b["w"] in ("Big", "Large") and a["w"][-1] not in ".,?!": a["w"] += "."


def voiced_runs(s, e, max_gap=0.3, pad=0.08):
    """Voiced intervals inside [s, e], splitting at silences longer than max_gap."""
    i0, i1 = int(s * 100), int(e * 100)
    runs, cur = [], None
    gap = 0
    for i in range(i0, i1):
        if loud[i]:
            if cur is None: cur = [i, i]
            cur[1] = i; gap = 0
        elif cur is not None:
            gap += 1
            if gap > max_gap * 100: runs.append(cur); cur = None; gap = 0
    if cur: runs.append(cur)
    return [[max(s, r[0] / 100 - pad), min(e, r[1] / 100 + 0.01 + pad + 0.04)] for r in runs]

segs = []
for s, e in KEEP:
    ws = [w for w in words if s <= w["s"] < e]
    lo, hi = ws[0]["s"] - 0.15, ws[-1]["e"] + 0.15
    segs += voiced_runs(max(s, lo), min(e, hi))
# snap to the frame grid so the video select and the audio trims stay in sync
q = lambda x: round(x * FPS) / FPS
segs = [[q(s), q(e)] for s, e in segs]
merged = []
for s, e in segs:
    if e - s < 0.08: continue
    if merged and s - merged[-1][1] < 0.12: merged[-1][1] = max(merged[-1][1], e)
    else: merged.append([s, e])
segs = merged

sel = "+".join(f"between(t,{s:.3f},{e - 0.001:.3f})" for s, e in segs)
v = f"[0:v]select='{sel}',setpts=N/FRAME_RATE/TB,crop={CROP_W}:2160:{CROP_X}:0,scale=1080:1000:flags=lanczos,{GRADE}[v]"
aparts = []
for i, (s, e) in enumerate(segs):
    d = e - s
    aparts.append(f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0, d - 0.015):.3f}:d=0.015[a{i}]")
acat = "".join(f"[a{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1[ar];[ar]highpass=f=80,afftdn=nf=-30,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,loudnorm=I=-15:TP=-2:LRA=7,aresample=48000[a]"
fc = ";".join([v] + aparts) + ";" + acat
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS),
                "-c:a", "pcm_s16le", "public/talk-cut.mov"], check=True)

offs, o = [], 0.0
for s, e in segs: offs.append(o); o += e - s
def m(t):
    for k, (s, e) in enumerate(segs):
        if t < s: return offs[k]
        if t <= e: return offs[k] + t - s
    return o
res = [{"w": w["w"], "s": round(m(w["s"]), 3), "e": round(m(w["e"]), 3)} for w in words]
for r in res:  # a word whose onset was silence starts where its voice starts
    if r["e"] - r["s"] < 0.05: r["e"] = round(r["s"] + 0.12, 3)
json.dump({"duration": round(o, 3), "words": res}, open("public/words.json", "w"), indent=1)
print(len(segs), "segments,", round(o, 2), "s")
print(" ".join(f"{x['w']}@{x['s']:.2f}" for x in res))
