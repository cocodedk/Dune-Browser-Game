# Dune Browser Game

![CI](https://github.com/cocodedk/Dune-Browser-Game/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)

A browser-based strategy and adventure game set in Frank Herbert's Dune universe. Players control House Atreides, navigate the treacherous politics of Arrakis, harvest the precious spice Melange, forge Fremen alliances, and outmanoeuvre rival Houses in a battle for survival and supremacy.

## Website

- [English](https://cocodedk.github.io/Dune-Browser-Game/)
- [فارسی (Persian)](https://cocodedk.github.io/Dune-Browser-Game/fa/)

## Features

- Turn-based strategy on Arrakis
- Faction politics (Atreides, Harkonnen, Emperor)
- Spice economy — harvest Melange, fund your House
- Fremen alliances — earn trust through deeds
- Political intrigue — deals, betrayals, and assassination
- Browser-based — no installation required

## Play

Open the game directly in your browser — no installation needed.

[**Play Dune Browser Game**](https://cocodedk.github.io/Dune-Browser-Game/)

Or download the latest release to self-host:
[**Download Dune-Browser-Game.zip**](https://github.com/cocodedk/Dune-Browser-Game/releases/latest/download/Dune-Browser-Game.zip)

## Docker

```bash
docker pull ghcr.io/cocodedk/dune-browser-game:latest
docker run -p 8080:80 ghcr.io/cocodedk/dune-browser-game:latest
```

Then open http://localhost:8080

## Build from Source

**Prerequisites:** Node.js 20+, npm

```bash
git clone https://github.com/cocodedk/Dune-Browser-Game.git
cd Dune-Browser-Game
npm install
./scripts/install-hooks.sh   # install pre-commit hooks (enforces the full gate)
npm run dev                  # development server → http://localhost:5173
```

**Play a production build locally** (what release testing uses):

```bash
npm run build                # production build → dist/, with bundle budgets
npm run preview              # serves dist/ → http://localhost:4173
```

**The full verification gate** (the pre-commit hook runs all of this, plus a
200-line-per-file check, before any commit is accepted):

```bash
npm run lint
npx tsc --noEmit
npm run shop:check           # type-checks the asset workshops
npm run build
npm run test:unit            # Vitest — no browser, no DOM
npm test                     # Playwright end-to-end against a fresh preview build
```

**Balance simulation** (headless campaigns through the real engine — same
command handlers the UI calls, published 100-seed set):

```bash
npm run sweep                # regenerates docs/PRD/game-completion/baseline/wp04-sweep/sweep-report.md
```

## Debug and evidence tools

- `http://localhost:5173/?debug=1` attaches `window.__DUNE__` — read-only
  inspection (`inspect`, `hashState`, `parityHash`, `player`) plus labeled
  test affordances (`setTime`, `teleport`, `replay`). Production builds only
  attach it with the query param; plain URLs never do.
- `?seed=N` starts New Campaign from a fixed RNG seed (evidence runs;
  omitted = production default).

## Custom portraits

Drop square images at `public/assets/portraits/<characterId>.png` (512×512
suggested) and the dialogue UI prefers them over the procedural fallback.
`public/assets/portraits/README.md` lists every character id.

## Architecture

```
src/
├── game-engine/    # Simulation — pure rules, commands, seeded RNG, saves (no three.js)
│   └── sim/        # Headless campaign runner, strategy agents, seed sweep
├── game-render/    # three.js scene: planet, flight, locations (never mutates world state)
├── ui/             # React panels; EventBus is the renderer↔React boundary
├── runtime/        # Command wiring, game driver, auto-open hooks
└── data/           # Authored content: villages, dialogue, fields, characters
vehicle-shop/ character-shop/ landscape-shop/   # Asset workshops (own gauntlets, released via adapters)
website/            # Static marketing site (GitHub Pages)
```

| Layer      | Technology       |
|------------|------------------|
| UI         | React 18         |
| 3D         | three.js         |
| Language   | TypeScript 5     |
| Bundler    | Vite 6           |
| Tests      | Vitest + Playwright |
| Container  | nginx (Docker)   |

## Project status and docs

- `CODEX.md` — canonical repo guide: rules, budgets, enforced safeguards.
- `docs/PRD/game-completion/` — the completion initiative: contracts,
  work-package board (`08-execution-plan.md`), and the full audit trail
  (`progress.md`). Milestone M1 (coherent opening through the first tribute)
  reached 2026-08-12; five work packages verified through independent
  adversarial audits.

## Author

**Babak Bandpey** — [cocode.dk](https://cocode.dk) | [LinkedIn](https://linkedin.com/in/babakbandpey) | [GitHub](https://github.com/cocodedk)

## License

Apache-2.0 | © 2026 [Cocode](https://cocode.dk) | Created by [Babak Bandpey](https://linkedin.com/in/babakbandpey)
