"""Re-transcribe the RACIJA voice clips with faster-whisper large-v3.

Usage: python tools/transcribe-phrases.py
Reads tools/sounds-src/*.wav, writes tools/transcripts/large-v3.json.
"""
import json
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "sounds-src"
OUT = ROOT / "transcripts" / "large-v3.json"

# Domain hint for a truck-driving game; biases spelling, not content.
PROMPT = "Racija, sunkvežimio vairuotojas kalba su viršininku. Šansų, viršininke, policija."


def main() -> None:
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")
    results = []
    files = sorted(SRC.glob("*.wav"))
    for i, path in enumerate(files, 1):
        segments, info = model.transcribe(
            str(path), language="lt", beam_size=5, vad_filter=False,
            initial_prompt=PROMPT, condition_on_previous_text=False,
        )
        segs = list(segments)
        text = " ".join(s.text.strip() for s in segs).strip()
        logprob = min((s.avg_logprob for s in segs), default=None)
        results.append({"file": path.name, "text": text,
                         "min_avg_logprob": None if logprob is None else round(logprob, 3),
                         "duration": round(info.duration, 2)})
        print(f"[{i}/{len(files)}] {path.name}: {text}", flush=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
