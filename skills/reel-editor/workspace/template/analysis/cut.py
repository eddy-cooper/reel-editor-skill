"""Cut a raw talking-head clip to the clean takes, close pauses, crop for the bottom panel.

Works with landscape camera footage (e.g. 4K 3840x2160) and portrait phone footage (e.g. iPhone 1080x1920
or 2160x3840, any frame rate, HDR or SDR). The source size, rotation and HDR are read with ffprobe.

Run from the reel folder: uv run --no-project --with numpy --with soundfile python analysis/cut.py <clip>
Preview the crop first:   uv run --no-project --with numpy --with soundfile python analysis/cut.py <clip> --preview
  (writes analysis/crop-preview.png: 4 frames across the clip with the panel crop drawn in red; tune HEAD_X / HEAD_Y)
Needs analysis/audio16k.wav and analysis/transcript.json (see transcribe.py).
Writes public/talk-cut.mov and public/words.json (times on the cut timeline).
KEEP, FIX, ONSET, HEAD_X/HEAD_Y, GRADE and the gate are per clip; the values below are a worked example.
"""
import json, subprocess, sys
import numpy as np, soundfile as sf

SRC = sys.argv[1]
FPS = 25  # output grid; the source is resampled to it first, so 30/60 fps and variable-rate phone clips stay in sync
PANEL_W, PANEL_H = 1080, 1000  # bottom speaker panel (1920 - PANEL_H in src/props6.tsx)
# Where the speaker's head sits, as fractions of the (upright) frame. The crop is centred on it and clamped to the frame.
#   Landscape: the crop is full height and slides in x (HEAD_X; 2000/3840 was the worked example). HEAD_Y is ignored.
#   Portrait:  the crop is full width and slides in y (HEAD_Y; ~0.40 frames head and shoulders). HEAD_X is ignored.
HEAD_X = 2000 / 3840
HEAD_Y = 0.40
GRADE = "eq=contrast=1.02:saturation=1.03"  # bright, even room: no lift needed


def probe(src):
    """Upright width, height, transfer and duration. Phones store portrait as landscape + a rotation flag."""
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,color_transfer:stream_tags=rotate:stream_side_data=rotation:format=duration",
                        "-of", "json", src], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    s = j["streams"][0]
    rot = int(float(s.get("tags", {}).get("rotate", 0)))
    for d in s.get("side_data_list", []):
        if "rotation" in d: rot = int(float(d["rotation"]))
    w, h = s["width"], s["height"]
    if abs(rot) % 180 == 90: w, h = h, w  # ffmpeg auto-rotates on decode, so crop in upright coordinates
    return w, h, s.get("color_transfer", ""), float(j["format"]["duration"])


SRC_W, SRC_H, TRC, SRC_DUR = probe(SRC)
if SRC_W / SRC_H >= PANEL_W / PANEL_H:  # landscape: full height (3840x2160 -> 2333x2160)
    CROP_H, CROP_W = SRC_H, round(SRC_H * PANEL_W / PANEL_H)
else:  # portrait: full width (1080x1920 -> 1080x1000, 2160x3840 -> 2160x2000)
    CROP_W, CROP_H = SRC_W, round(SRC_W * PANEL_H / PANEL_W)
CROP_W -= CROP_W % 2; CROP_H -= CROP_H % 2
CROP_X = min(max(0, round(HEAD_X * SRC_W - CROP_W / 2)), SRC_W - CROP_W)
CROP_Y = min(max(0, round(HEAD_Y * SRC_H - CROP_H / 2)), SRC_H - CROP_H)
# iPhones record HDR (HLG / Dolby Vision) by default. Without a tone map it comes out flat and grey in SDR.
# Needs ffmpeg with zscale (the gyan.dev / winget Gyan.FFmpeg build has it). Re-check GRADE after the tone map.
HDR = TRC in ("arib-std-b67", "smpte2084")
TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,"
           "zscale=t=bt709:m=bt709:r=tv,format=yuv420p,") if HDR else ""
print(f"source {SRC_W}x{SRC_H}{' HDR' if HDR else ''} -> crop {CROP_W}x{CROP_H} at ({CROP_X},{CROP_Y}) -> {PANEL_W}x{PANEL_H}")

if "--preview" in sys.argv:
    step = max(SRC_DUR / 4, 0.5)
    vf = (f"fps=1/{step:.3f},{TONEMAP}drawbox=x={CROP_X}:y={CROP_Y}:w={CROP_W}:h={CROP_H}:color=red:t={max(4, SRC_W // 200)},"
          f"scale=-2:720,tile=4x1")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{step / 2:.3f}", "-i", SRC, "-vf", vf, "-frames:v", "1",
                    "analysis/crop-preview.png"], check=True)
    print("wrote analysis/crop-preview.png")
    sys.exit(0)
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
v = (f"[0:v]fps={FPS},select='{sel}',setpts=N/FRAME_RATE/TB,crop={CROP_W}:{CROP_H}:{CROP_X}:{CROP_Y},"
     f"scale={PANEL_W}:{PANEL_H}:flags=lanczos,{TONEMAP}{GRADE}[v]")
aparts = []
for i, (s, e) in enumerate(segs):
    d = e - s
    # first audio track only: newer iPhones add a spatial-audio (APAC) track that ffmpeg may not decode
    aparts.append(f"[0:a:0]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0, d - 0.015):.3f}:d=0.015[a{i}]")
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
