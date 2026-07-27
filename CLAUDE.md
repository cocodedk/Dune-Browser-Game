# CLAUDE.md — Dune Browser Game

`CODEX.md` is the canonical agent guide for this repository.
If this file and `CODEX.md` ever drift, follow `CODEX.md` and update this file to match.

## Current Stack

- Node.js 20
- TypeScript 5
- React 18
- three.js
- Vite 6
- npm
- ESLint
- Vitest (unit tests)
- Playwright (E2E tests)

## Current Layout

```text
src/
├── data/
├── game-engine/
├── game-render/
├── shims/
├── ui/
├── App.tsx
├── EventBus.ts
├── main.tsx
└── types.ts
```

## Important Rules

- `200` lines max per source-like file is enforced by pre-commit
- Keep simulation logic in `src/game-engine/`
- Keep three.js scene and rendering logic in `src/game-render/`
- Keep React UI logic in `src/ui/`
- Use `EventBus` as the renderer <-> React boundary
- Use explicit `import { describe, it, expect } from 'vitest'` in test files — do NOT rely on globals
- Unit tests (`.test.ts`) live next to source files in `src/`; `npm run test:unit` runs them

## Required Verification

Before calling work done, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:unit
npm test
```

If your change touches commit-time enforcement or repo tooling, also run:

```bash
sh .githooks/pre-commit
```

## Enforcement Summary

- `.githooks/pre-commit` runs file-length enforcement, lint, type-check, build, Vitest unit tests, and Playwright E2E tests
- `npm run build` includes bundle-budget enforcement via `scripts/check-bundle-size.mjs`
- three.js is split into `three-core` / `three-addons` chunks, each with its own bundle budget

## Files to Keep in Sync

- `CODEX.md`
- `CLAUDE.md`
- `package.json`
- `.githooks/pre-commit`
- `scripts/check-file-length.sh`
- `scripts/check-bundle-size.mjs`
- `vite.config.ts`
- `playwright.config.ts`
