# CODEX.md — Dune Browser Game

## Purpose

This is the canonical agent guidance file for this repository.
This is the single canonical guide. `CLAUDE.md` and `AGENTS.md` exist only because those
filenames are loaded by name, and are thin pointers here — there is nothing to keep in sync
with them, which is the point.

## Project Snapshot

- Theme: browser-based Dune strategy / adventure prototype
- Runtime: Node.js 20
- Language: TypeScript 5
- UI shell: React 18
- Game runtime: three.js
- Bundler: Vite 6
- Package manager: npm
- Lint: ESLint flat config
- Unit tests: Vitest
- E2E tests: Playwright

## Current Architecture

The current codebase is not organized as generic `features/` and `components/` folders.
Write against the repo as it exists today:

```text
src/
├── App.tsx                 # React shell layout
├── main.tsx                # React entry
├── EventBus.ts             # renderer <-> React event bridge
├── types.ts                # shared types and bus contracts
├── data/                   # static game data
├── game-engine/            # game state and simulation rules
├── game-render/            # three.js scene modes and rendering
├── ui/                     # React UI panels and store
└── shims/                  # browser/build compatibility shims
```

### Ownership Boundaries

- `src/game-engine/`: simulation and rules, no React imports
- `src/game-render/`: three.js scene modes, rendering, input wiring, emits bus events
- `src/ui/`: React panels and Zustand store, no scene creation logic
- `src/EventBus.ts`: the contract boundary between the renderer and React
- `src/data/`: static authored content only
- `vehicle-shop/<name>/`: standalone asset-workshop sub-apps — vehicles today, but the
  pattern hosts any asset type. Game code imports only a shop's public surface
  (`src/model/**`, `contracts.ts`, `spec.ts`) via the `@shop` alias, never a bare path;
  ESLint enforces the fence. See `docs/PRD/dune92/04-asset-pipeline.md`.
- `character-shop/<name>/`: the same workshop pattern, second root — one sub-project per
  named character, imported only via `@cast` under the same public-surface fence.
  Characters may not import each other, the vehicle root, or game src; loop contract in
  `character-shop/docs/gauntlet-loop.md`.
- `landscape-shop/<name>/`: the same workshop pattern, third root — one sub-project per
  static terrain set (no animation contract), imported only via `@land` under the same
  public-surface fence. Landscape sets may not import each other, the other two roots, or
  game src; loop contract in `landscape-shop/docs/gauntlet-loop.md`.

## Working Rules

### File Size

- `200` lines max per source-like file is a real enforced rule, not a suggestion
- The pre-commit hook rejects staged files above the limit
- If a file approaches the limit, split by responsibility instead of compressing readability

### Source of Truth

- Preserve the current event-driven architecture
- Prefer extending the existing `EventBus` flow over introducing a second coordination mechanism
- Keep state transitions in `game-engine`, not in React components
- Keep render concerns in three.js scene modes and visual components

### Style

- Prefer small, explicit functions over abstraction-heavy helpers
- Keep TypeScript strict; avoid `any` and `@ts-ignore`
- Match the current code style in the touched file
- Use ASCII unless the file already relies on symbols or unicode labels

### UI and Rendering

- The React shell is intentionally light; the heavy runtime is lazy-loaded
- `App.tsx` should stay small and shell-focused
- Be careful when changing `ThreeContainer`, the runtime driver, or the event bus, because those changes affect test stability

## Build and Test Commands

```bash
npm run lint
npx tsc --noEmit
npm run shop:check
npm run build
npm run test:unit
npm test

# scaffold a new asset workshop — not part of the verification gate above
npm run shop:new -- <name>
```

### What They Mean

- `npm run build` runs TypeScript, Vite production build, and bundle-budget enforcement
- `npm run test:unit` runs Vitest unit tests (fast, no browser, pure functions); this
  includes every `vehicle-shop/**/*.test.ts`, `character-shop/**/*.test.ts` and
  `landscape-shop/**/*.test.ts`, not just `src/`
- `npm test` runs Playwright E2E tests against `vite preview`
- `npm run shop:check` type-checks every shop under `vehicle-shop/`, `character-shop/` AND
  `landscape-shop/` against its own `tsconfig.json` — separate TS programs the root
  `tsc -b` never sees
- `npm run shop:new -- <name>` scaffolds a new `vehicle-shop/<name>/` dev harness (public
  surface, a passing seam test, registered npm scripts) — see
  `docs/PRD/dune92/04-asset-pipeline.md`
- `npm run cast:new -- <name>` scaffolds a `character-shop/<name>/` with the humanoid
  seed instead: proportion spec, armature group tree, and a seam test already guarding
  face-toward-−Z, height-within-1%, and the eye line
- `npm run land:new -- <name>` scaffolds a `landscape-shop/<name>/` with the static
  scenery seed instead: footprint spec, a massing/skirt/entrance placeholder, and a seam
  test already guarding footprint-within-1%, front-toward-−Z, and base-at-zero
- The pre-commit hook runs:
  1. file-length enforcement
  2. lint
  3. type-check
  4. shop type-check
  5. build
  6. Vitest unit tests
  7. Playwright E2E tests

## Enforced Safeguards

### Pre-commit

- `.githooks/pre-commit` is intentionally stricter than the old docs implied
- It blocks commits if staged source-like files exceed `200` lines
- It also blocks commits on lint, type, shop type-check, build, Vitest, or Playwright
  failures

### Bundle Budgets

`npm run build` fails if output chunks exceed the configured budgets in `scripts/check-bundle-size.mjs`.

Current budget classes:

- `three-core-*.js`: `700_000` bytes
- `three-addons-*.js`: `200_000` bytes
- `react-vendor-*.js`: `250_000` bytes
- `game-*.js`: `200_000` bytes
- `vehicle-*.js`: `150_000` bytes — one chunk per `vehicle-shop/<name>/` release
- `character-*.js`: `150_000` bytes — one chunk per `character-shop/<name>/` release
- `landscape-*.js`: `150_000` bytes — one chunk per `landscape-shop/<name>/` release,
  each budgeted separately. Usually one chunk; `vite.config.ts`'s `manualChunks` splits
  a shop's own baked geometry into `landscape-<name>-geo`/`landscape-<name>-index`
  alongside the default `landscape-<name>` (code + smaller bakes) when a single bake's
  quantized payload alone would not fit in one chunk (`landscape-cliff`'s massif bake
  is the first case — see `landscape-shop/cliff/tools/bake/quantize.mjs`).
- fallback `*.js`: `500_000` bytes

Do not "fix" a budget failure by only raising the threshold unless there is a clear, justified reason.
Prefer code-splitting, reducing eager imports, or changing chunk boundaries first.

## Vite and three.js Notes

- three.js is split into `three-core` and `three-addons` chunks so each can hold its own bundle budget
- Import three narrowly (`import { Scene } from 'three'`) so tree shaking works; never `import * as THREE`
- The renderer is lazy-loaded via `ThreeContainer`, keeping the 3D chunk out of the initial payload

## Testing Notes

- Vitest runs unit tests for pure engine functions; use explicit imports (`import { describe, it, expect } from 'vitest'`), do NOT set `globals: true`
- Test environment is `node`; test files are co-located with source as `*.test.ts` inside `src/`
- Playwright runs E2E tests against the real built app through `vite preview`
- If UI tests fail after a bundling or lazy-loading change, suspect a runtime boot failure first and inspect browser console errors before rewriting assertions

## When Changing Core Tooling

If you touch any of these, update docs in the same change:

- `package.json` scripts
- `.githooks/pre-commit`
- `scripts/check-file-length.sh`
- `scripts/check-bundle-size.mjs`
- `vite.config.ts`
- Playwright config or test strategy

## Completion Checklist

Before claiming work is done, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:unit
npm test
```

If your change affects commits, also consider:

```bash
sh .githooks/pre-commit
```

## Key Files

- `CODEX.md`: canonical repo instructions for coding agents
- `CLAUDE.md`, `AGENTS.md`: pointers to this file, not copies of it
- `docs/PRD/dune92/03-stage-index.md`: the live status board
- `.githooks/pre-commit`: enforced local quality gate
- `scripts/check-file-length.sh`: `200`-line enforcement
- `scripts/check-bundle-size.mjs`: bundle budget enforcement
- `scripts/check-shops.mjs`: shop type-check enforcement (`npm run shop:check`)
- `scripts/new-shop.mjs`: scaffolds a new `vehicle-shop/<name>/` (`npm run shop:new`)
- `docs/PRD/dune92/04-asset-pipeline.md`: the shop-to-game asset release pipeline
- `vite.config.ts`: chunking rules
- `playwright.config.ts`: browser test setup
