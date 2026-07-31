# CODEX.md — Dune Browser Game

## Purpose

This is the canonical agent guidance file for this repository.
If `CLAUDE.md` and `CODEX.md` ever disagree, follow `CODEX.md` and bring `CLAUDE.md` back into sync.

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
npm run build
npm run test:unit
npm test
```

### What They Mean

- `npm run build` runs TypeScript, Vite production build, and bundle-budget enforcement
- `npm run test:unit` runs Vitest unit tests (fast, no browser, pure functions)
- `npm test` runs Playwright E2E tests against `vite preview`
- The pre-commit hook runs:
  1. file-length enforcement
  2. lint
  3. type-check
  4. build
  5. Vitest unit tests
  6. Playwright E2E tests

## Enforced Safeguards

### Pre-commit

- `.githooks/pre-commit` is intentionally stricter than the old docs implied
- It blocks commits if staged source-like files exceed `200` lines
- It also blocks commits on lint, type, build, Vitest, or Playwright failures

### Bundle Budgets

`npm run build` fails if output chunks exceed the configured budgets in `scripts/check-bundle-size.mjs`.

Current budget classes:

- `three-core-*.js`: `700_000` bytes
- `three-addons-*.js`: `200_000` bytes
- `react-vendor-*.js`: `250_000` bytes
- `game-*.js`: `200_000` bytes
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
- `CLAUDE.md`: secondary agent guide kept aligned with `CODEX.md`
- `.githooks/pre-commit`: enforced local quality gate
- `scripts/check-file-length.sh`: `200`-line enforcement
- `scripts/check-bundle-size.mjs`: bundle budget enforcement
- `vite.config.ts`: chunking rules
- `playwright.config.ts`: browser test setup
