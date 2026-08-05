"""Transcribe sound files and classify speech vs effects."""
import json
import re
import sys
from pathlib import Path

from faster_whisper import WhisperModel

SOUNDS_DIR = Path(__file__).resolve().parent.parent / "sounds"
OUTPUT = Path(__file__).resolve().parent / "transcription_results.json"

# * Known effect filenames (no speech expected).
KNOWN_EFFECTS = {
    "alarm.wav", "antiradar.wav", "applause.wav",
    "blowgazstation0.wav", "blowgazstation1.wav", "blowgazstation2.wav", "blowgazstation3.wav",
    "blowkapot0.wav", "blowkapot1.wav", "blowkapot2.wav", "blowkapot3.wav",
    "break.wav", "burning0.wav", "burning1.wav", "carhorn.wav",
    "crash2.wav", "crash4a.wav", "crash9.wav",
    "explos.wav", "extcar.wav",
    "gear.wav", "helicopt.wav",
    "hit.wav", "hit_bullet.wav", "hit_def1.wav", "hit_def2.wav", "hit_def_fara.wav",
    "hit_explosion.wav", "hit_gluh_squeak.wav", "hit_ironpillar.wav", "hit_sign.wav",
    "hit_suspension.wav", "hitgrnd.wav", "hitme.wav",
    "horn.wav", "hornupgr.wav",
    "idle.wav", "jidle.wav", "kriak.wav",
    "mine.wav",
    "ovation.wav", "ovation1.wav",
    "pager.wav", "photo.wav", "police.wav",
    "pss.wav", "pss2.wav",
    "rain.wav", "refuel.wav", "repair.wav", "sea.wav", "shield.wav", "shoot.wav",
    "splash.wav", "squeak.wav",
    "start.wav", "start0.wav", "startgloch.wav", "stones.wav", "stop_eng.wav",
    "thunder.wav", "timeout.wav",
    "wa_fall.wav", "wind.wav", "wipers.wav",
}


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = text.replace("'", "")
    replacements = {
        "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s",
        "ų": "u", "ū": "u", "ž": "z",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:80]


def infer_gender(filename: str) -> str:
    name = filename.lower()
    if name.endswith("_f.wav") or re.search(r"\df\.wav$", name):
        return "moteris"
    if name.endswith("_m.wav") or re.search(r"\dm\.wav$", name):
        return "vyras"
    if "hit_gluh_r" in name:
        return "robotas"
    return "nezinoma"


def main() -> int:
    files = sorted(SOUNDS_DIR.glob("*.wav"))
    if not files:
        print("No wav files found", file=sys.stderr)
        return 1

    print(f"Loading whisper model for {len(files)} files...")
    model = WhisperModel("small", device="cpu", compute_type="int8")

    results = []
    for index, path in enumerate(files, start=1):
        print(f"[{index}/{len(files)}] {path.name}")
        segments, info = model.transcribe(
            str(path),
            language="lt",
            vad_filter=True,
            beam_size=5,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        text = re.sub(r"\s+", " ", text)

        has_speech = len(text) >= 3 and not re.fullmatch(r"[\W_]+", text)
        if path.name in KNOWN_EFFECTS:
            has_speech = False

        results.append({
            "file": path.name,
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "has_speech": has_speech,
            "gender": infer_gender(path.name),
            "suggested_slug": slugify(text) if has_speech else None,
        })

    OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    speech_count = sum(1 for item in results if item["has_speech"])
    effect_count = len(results) - speech_count
    print(f"Done. Speech: {speech_count}, effects: {effect_count}")
    print(f"Results written to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
