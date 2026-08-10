# CLAUDE.md — Dune Browser Game

**Read [`CODEX.md`](./CODEX.md) first.** It is the canonical agent guide: stack, layout,
architecture, working rules, build and test commands, bundle budgets, enforced
safeguards, and the completion checklist. This file names only what you must not get
wrong even if you read nothing else.

## Non-negotiables

- Simulation logic in `src/game-engine/` — pure, no three.js.
- Scene and rendering in `src/game-render/` — never mutates world state.
- React UI in `src/ui/`; `EventBus` is the renderer↔React boundary.
- **200 lines max** per source-like file. `.githooks/pre-commit` checks file length
  *before* the npm commands — lint, typecheck, build, and both test suites can all
  pass and the commit still be rejected. Check line counts yourself.
- Explicit `import { describe, it, expect } from 'vitest'` — no globals. Unit tests
  have no WebGL or DOM: anything touching `document` or a canvas goes behind a guard
  or into a `DataTexture` (`materials/neutralEnvMap.ts` is the house pattern).
- Never `--no-verify`.

## Communication

Plain language per **ISO 24495-1:2023**: reader's need first, short sentences,
everyday words, explain unfamiliar terms, main point findable at a glance.

## Where the work is tracked

[`docs/PRD/dune92/03-stage-index.md`](./docs/PRD/dune92/03-stage-index.md) is the live
status board; per-stage specs sit in `docs/PRD/dune92/stages/`.
