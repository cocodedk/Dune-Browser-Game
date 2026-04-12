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
./scripts/install-hooks.sh   # install pre-commit hooks
npm run dev                  # development server → http://localhost:5173
npm run build                # production build → dist/
```

**Smoke check:**
```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Architecture

```
src/
├── features/       # Game mechanics (spice, politics, combat, fremen)
├── components/     # Shared UI components
├── contexts/       # React context (game state)
├── hooks/          # Custom React hooks
├── types/          # TypeScript types
└── utils/          # Pure utility functions
website/            # Static marketing site (GitHub Pages)
```

| Layer      | Technology       |
|------------|------------------|
| UI         | React 18         |
| Language   | TypeScript 5     |
| Bundler    | Vite 5           |
| Container  | nginx (Docker)   |

## Author

**Babak Bandpey** — [cocode.dk](https://cocode.dk) | [LinkedIn](https://linkedin.com/in/babakbandpey) | [GitHub](https://github.com/cocodedk)

## License

Apache-2.0 | © 2026 [Cocode](https://cocode.dk) | Created by [Babak Bandpey](https://linkedin.com/in/babakbandpey)
