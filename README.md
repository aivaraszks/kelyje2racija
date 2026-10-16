# RACIJA

The voice radio from the game _Kelyje 2_ as a phone-first web app: browse, search, play and share the game's radio phrases.

Live: https://aivaraszks.github.io/kelyje2racija/

Fan project, not affiliated with the game's developers.

## Development

Requires Node 26 and pnpm.

```
pnpm install
pnpm start       # http://localhost:4200
pnpm test:ci
pnpm build
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`). Project conventions and the dev workflow are in `CLAUDE.md`; plans and specs are in `docs/`.
