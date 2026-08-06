# Kelyje – Garsai (Angular)

Mobiliam pritaikyta Angular web aplikacija su MP3 garsais. Galima klausytis naršyklėje ir **dalintis kaip MP3 failu** (pvz. per Messenger, WhatsApp, Telegram).

## Funkcijos

- Angular (standalone komponentai)
- Grojimas naršyklėje
- **Dalintis** mygtukas – mobiliajame atidaro sistemos „Share“ langą su MP3 failu
- Automatinis deploy į GitHub Pages

## Pridėti naujus garsus

1. Įdėk `.wav` arba `.mp3` failus į `src/assets/sounds/`
2. Atnaujink `src/assets/sounds.json`:

```json
[
  {
    "id": "labas-ryte",
    "title": "Labas ryte!",
    "file": "sounds/labas-ryte.mp3",
    "description": "Pasveikinimas ryte"
  }
]
```

| Laukas        | Aprašymas |
|---------------|-----------|
| `id`          | Unikalus identifikatorius |
| `title`       | Rodomas pavadinimas |
| `file`        | Kelias nuo `src/assets/` (pvz. `sounds/xxx.mp3`) |
| `description` | Neprivalomas aprašymas |

## Vietinis paleidimas

```bash
npm install
npm start
```

Atidaryk `http://localhost:4200/`

## Build (GitHub Pages)

```bash
npm run build
```

Production build naudoja `baseHref: /kelyje2racija/`. Jei repo pavadinimas kitoks – pakeisk `angular.json` → `projects.kelyje.architect.build.configurations.production.baseHref`.

## GitHub Pages diegimas

1. Įkelk kodą į GitHub repozitoriją (`main` šaka)
2. **Settings → Pages → Build and deployment → Source:** GitHub Actions
3. Push į `main` automatiškai subuildins ir deployins

Svetainė: `https://aivaraszks.github.io/kelyje2racija/`

> Dalinimosi funkcija veikia per **HTTPS** ir dažniausiai tik **mobiliajame** (Android Chrome, iOS Safari).
