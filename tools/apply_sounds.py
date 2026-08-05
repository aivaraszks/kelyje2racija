"""Apply transcription results: delete effects, rename speech files, update catalog."""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "sounds"
TARGET_DIR = ROOT / "src" / "assets" / "sounds"
CATALOG_PATH = ROOT / "src" / "assets" / "sounds.json"
TRANSCRIPTIONS = Path(__file__).resolve().parent / "transcription_results.json"

# * Manual corrections for clearer Lithuanian titles (Whisper mistranscriptions).
TITLE_OVERRIDES: dict[str, str] = {
    "01f.wav": "Gal susitarsim, viršininke?",
    "01m.wav": "Gal susitarsim, viršininke?",
    "02f.wav": "Bandėtai, lipant, kuo nors pagelbėk, viršininke.",
    "02m.wav": "Bandėtai, lipant, kuo nors pagelbėk, viršininke.",
    "03f.wav": "Viršininke, prispaus konkurentą.",
    "03m.wav": "Viršininke, prispaus konkurentą.",
    "04f.wav": "Iki kito karto.",
    "04m.wav": "Iki kito karto?",
    "05f.wav": "Sutarta.",
    "05m.wav": "Sutarta.",
    "06f.wav": "Brangoka, viršininke.",
    "06m.wav": "Brangoka, viršininke.",
    "07f.wav": "Vaikinai, man nereikia nemalonumų.",
    "07m.wav": "Vaikinai, man nereikia nemalonumų.",
    "08f.wav": "Verčiau papurti kitą mano konkurentą.",
    "08m.wav": "Verčiau papurti kitą mano konkurentą?",
    "09f.wav": "Nori pakeisti ratus?",
    "09m.wav": "Nori pakeisti ratus?",
    "10f.wav": "Ir iš čia po to.",
    "10m.wav": "Ir iš čia po to.",
    "11f.wav": "Ok.",
    "11m.wav": "Ok.",
    "12f.wav": "Atleisk, nepatampysiu.",
    "12m.wav": "Atleisk, nepatampysiu.",
    "13f.wav": "Skambink, drauge, atsiskaitysim.",
    "13m.wav": "Skambink, drauge, atsiskaitysim.",
    "14f.wav": "Mes krovinį susitarsim.",
    "14m.wav": "Mes krovinį susitarsim.",
    "15f.wav": "Pamerk.",
    "15m.wav": "Pamerk.",
    "16f.wav": "Tvarka!",
    "16m.wav": "Tvarka!",
    "17f.wav": "Labai daug nori.",
    "17m.wav": "Labai daug nori.",
    "18f.wav": "Problemos su mašina, padėsi?",
    "18m.wav": "Problemos su mašina, padėsi?",
    "19f.wav": "Noriu užsakyti mašiną.",
    "19m.wav": "Noriu užsakyti mašiną?",
    "20f.wav": "Iki pasimatimo.",
    "20m.wav": "Iki pasimatimo!",
    "21f.wav": "Sutinku.",
    "21m.wav": "Sutinku.",
    "22f.wav": "Pamerk.",
    "22m.wav": "Pamerk.",
    "23f.wav": "Įmušyta.",
    "23m.wav": "Įmušyta.",
    "24f.wav": "Gerai, kitą kartą.",
    "24m.wav": "Gerai, kitą kartą!",
    "driver1_f.wav": "Klausau!",
    "driver1_m.wav": "Klausau!",
    "driver2_f.wav": "Nesijaudink.",
    "driver2_m.wav": "Nesijaudink.",
    "driver3_f.wav": "Priekyje.",
    "driver3_m.wav": "Priekyje.",
    "driver4_f.wav": "Ir neprašyk.",
    "driver4_m.wav": "Ir neprašyk.",
    "driver5_f.wav": "Rinkis!",
    "driver5_m.wav": "Rinkis!",
    "mafia1_f.wav": "Turi problemų?",
    "mafia1_m.wav": "Turi problemų?",
    "mafia2_f.wav": "Klok babkes!",
    "mafia2_m.wav": "Klok babkes!",
    "mafia3_f.wav": "Rinkis!",
    "mafia3_m.wav": "Rinkis!",
    "oponent1_f.wav": "Korekė!",
    "oponent1_m.wav": "Korekė!",
    "oponent2_f.wav": "Be šansų!",
    "oponent2_m.wav": "Be šansų!",
    "oponent3_f.wav": "Mokėk!",
    "oponent3_m.wav": "Mokėk!",
    "police1_f.wav": "Kas nutiko?",
    "police1_m.wav": "Kas nutiko?",
    "police2_f.wav": "Mokėk, didvyri!",
    "police2_m.wav": "Mokėk, didvyri!",
    "police_01.wav": "Tuoj jau sustabdysite automobilį?",
    "police_02.wav": "Tuoj jau sustabdykite automobilį arba mes šausime.",
}

# * Spoken lines that Whisper misclassified.
FORCE_SPEECH = {"11f.wav", "11m.wav"}


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
    return text.strip("-")[:70]


def gender_suffix(gender: str) -> str:
    return {
        "moteris": "moteris",
        "vyras": "vyras",
        "robotas": "robotas",
    }.get(gender, "nezinoma")


def main() -> None:
    data = json.loads(TRANSCRIPTIONS.read_text(encoding="utf-8"))
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    used_names: set[str] = set()
    catalog: list[dict[str, str]] = []
    deleted = 0
    kept = 0

    for item in data:
        source = SOURCE_DIR / item["file"]
        if not source.exists():
            continue

        is_speech = item["has_speech"] or item["file"] in FORCE_SPEECH
        if not is_speech or item["file"] in {"youwin.wav", "youlost.wav"}:
            source.unlink(missing_ok=True)
            deleted += 1
            continue

        title = TITLE_OVERRIDES.get(item["file"], item["text"].strip())
        if not title:
            source.unlink(missing_ok=True)
            deleted += 1
            continue

        gender = gender_suffix(item["gender"])
        display_title = f"{title} ({gender})"
        base_slug = slugify(title)
        slug = f"{base_slug}-{gender}"
        counter = 2
        while slug in used_names:
            slug = f"{base_slug}-{gender}-{counter}"
            counter += 1
        used_names.add(slug)

        target_name = f"{slug}.wav"
        target_path = TARGET_DIR / target_name
        shutil.copy2(source, target_path)
        source.unlink(missing_ok=True)
        kept += 1

        catalog.append({
            "id": slug,
            "title": display_title,
            "file": f"sounds/{target_name}",
        })

    catalog.sort(key=lambda entry: entry["title"].lower())
    CATALOG_PATH.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    gitkeep = TARGET_DIR / ".gitkeep"
    if gitkeep.exists() and kept > 0:
        gitkeep.unlink()

    print(f"Kept speech files: {kept}")
    print(f"Deleted effect files: {deleted}")
    print(f"Catalog entries: {len(catalog)}")


if __name__ == "__main__":
    main()
