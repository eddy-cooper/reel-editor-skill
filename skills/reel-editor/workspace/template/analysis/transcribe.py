import json, sys
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
m = WhisperModel("medium.en", device="cpu", compute_type="int8")
segs, info = m.transcribe(src, word_timestamps=True, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=300), beam_size=5)
words = []
for s in segs:
    for w in s.words:
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 2)})
json.dump({"duration": info.duration, "words": words}, open(out, "w"), indent=1)
print(" ".join(f"{x['w']}" for x in words))
