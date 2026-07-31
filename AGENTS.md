# AGENTS.md — Dune Browser Game

Instructions for coding agents working on this repository.
`CODEX.md` is the canonical guide; if this file and `CODEX.md` conflict, follow `CODEX.md` and update this file.

## Stack

- Node.js 20 / TypeScript 5 / React 18 / Phaser 3 / Vite 6 / npm
- ESLint (flat config) / Vitest (unit) / Playwright (E2E)

## Architecture

```text
src/
├── App.tsx                 # React shell layout
├── main.tsx                # React entry
├── EventBus.ts             # Phaser <-> React event bridge
├── types.ts                # shared types and bus contracts
├── data/                   # static game data (JSON, authored content)
├── game-engine/            # simulation and rules (no React imports)
├── game-render/            # Phaser scenes, rendering, input (emits bus events)
├── ui/                     # React panels + Zustand store (no Phaser scene creation)
└── shims/                  # browser/build compatibility shims
```

### Ownership boundaries (do not cross)

- `game-engine/`: state + rules only, zero React or Phaser imports
- `game-render/`: Phaser scenes, visuals, input — communicates outward via `EventBus`
- `ui/`: React panels + store — no Phaser scene creation logic
- `EventBus.ts`: the single coordination point between Phaser and React
- `data/`: static authored content only, no runtime mutation logic

## Agent Hierarchy

This project uses a two-tier agent model:

1. **Thinking model (you, the planner)** — reads the codebase, designs solutions, writes `GLM-PLAN.md`, assigns work items, and reviews results. Does not implement directly unless the task is trivial.
2. **Working models (sub-agents)** — execute implementation tasks assigned by the thinking model. Spawned via the `task` tool using these types:
   - `explore` — fast codebase search: find files, patterns, answer "where is X?"
   - `general` — multi-step execution: implement features, write tests, refactor code

**Workflow:**

1. Thinking model decomposes work into small, file-scoped tasks
2. Spawn one `general` sub-agent per task (or batch independent tasks in parallel)
3. Each sub-agent receives: what to implement, which files to touch, coding rules (200-line limit, no `any`, EventBus boundary, etc.), and which verification commands to run
4. Sub-agent implements, runs verification, and reports back
5. Thinking model reviews the diff — if it fails verification or breaks rules, re-spawn with corrective instructions
6. If a sub-agent hits a wall (e.g., architectural ambiguity, cross-module dependency), it escalates back to the thinking model for a decision

**When to spawn sub-agents:**

- Any implementation task that touches 2+ files
- Writing new modules, tests, or data files
- Refactoring across ownership boundaries
- Running the full verification suite after changes

**When the thinking model acts directly:**

- Reading/searching to understand the codebase
- Planning and updating `GLM-PLAN.md`
- Single-file edits that are trivial (typos, small config changes)
- Reviewing sub-agent output

## Hard Rules

- **200 lines max** per source file — enforced by pre-commit hook, not negotiable
- Split by responsibility when approaching the limit; never compress readability
- Use `EventBus` as the Phaser ↔ React boundary; do not introduce a second coordination mechanism
- Keep state transitions in `game-engine/`; never in React components
- No `any` or `@ts-ignore`; keep TypeScript strict
- Use explicit `import { describe, it, expect } from 'vitest'` in test files — no globals
- Unit tests (`*.test.ts`) live next to source files; `npm run test:unit` runs them
- Match the existing code style in the file you're touching
- Use ASCII unless the file already uses unicode/symbols

## Implementation Plan

See `GLM-PLAN.md` for the ordered checklist of remaining work items.

### Development Principles

- **TDD**: Write failing tests first, then implement the minimum code to pass. Every new module or feature starts with a `*.test.ts` file. Run `npm run test:unit` after each implementation step.
- **SOLID**: Single responsibility per module/file. Open for extension, closed for modification. Depend on abstractions (types, EventBus contracts), not concrete internals. Keep module boundaries as defined in the Architecture section.
- **DRY**: Extract shared logic into `game-engine/` pure functions or `data/` constants. Never duplicate faction logic, type definitions, or color constants across `game-render/` and `ui/`.
- **YAGNI**: Only implement what `GLM-PLAN.md` specifies. Don't pre-architect for hypothetical future features. If a module isn't in the plan, it doesn't exist yet.

## Verification (run before calling work done)

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

### What each command does

- `npm run build`: TypeScript + Vite production build + bundle-budget enforcement
- `npm run test:unit`: Vitest unit tests (node environment, pure functions)
- `npm test`: Playwright E2E against `vite preview`
- Pre-commit hook runs: file-length check → lint → type-check → build → Vitest → Playwright

## Bundle Budgets

Do not raise thresholds without justification. Prefer code-splitting or reducing eager imports.

| Chunk pattern | Max bytes |
|---|---|
| `phaser-*.js` | 550 000 |
| `react-vendor-*.js` | 250 000 |
| `game-*.js` | 200 000 |
| fallback `*.js` | 500 000 |

## Vite / Phaser quirks

- `phaser` is aliased to `phaser/src/phaser.js` for Rollup chunk splitting
- `phaser3spectorjs` is aliased to `src/shims/phaser3spectorjs.cjs`
- Rollup circular-chunk warnings from Phaser internals are informational — ignore unless runtime breaks

## E2E test tips

- Playwright runs against `vite preview` (real built app)
- If UI tests fail after bundling changes, check browser console for boot failures before rewriting assertions

## Files to keep in sync

When modifying these, update docs in the same change:

`CODEX.md` · `AGENTS.md` · `CLAUDE.md` · `package.json` · `.githooks/pre-commit` · `scripts/check-file-length.sh` · `scripts/check-bundle-size.mjs` · `vite.config.ts` · `playwright.config.ts`