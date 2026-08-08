# CLAUDE.md — Dune Browser Game

**Read [`CODEX.md`](./CODEX.md).** It is the canonical agent guide: stack, layout,
architecture, working rules, build and test commands, enforced safeguards, and the
completion checklist.

This file exists because Claude Code loads `CLAUDE.md` by name. It used to restate
`CODEX.md`'s stack, layout, rules and verification steps, and carried a "Files to Keep in
Sync" list naming itself and `CODEX.md` — an admission that two copies of the same
instructions would drift, and a standing chore to stop them. Pointing at one document
removes the chore instead of scheduling it.

## The short version, if you read nothing else

- Simulation logic in `src/game-engine/` — pure, no three.js.
- Scene and rendering in `src/game-render/` — never mutates world state.
- React UI in `src/ui/`, with `EventBus` as the boundary between renderer and React.
- **200 lines max** per source-like file, enforced by `.githooks/pre-commit`. That hook
  runs the file-length check *before* the npm commands, so `npm run lint && npx tsc
  --noEmit && npm run build && npm run test:unit && npm test` can all pass and the commit
  still be rejected. Check line counts yourself.
- Explicit `import { describe, it, expect } from 'vitest'` — no globals. Unit tests have no
  WebGL or DOM, so anything touching `document` or a canvas belongs behind a guard or in a
  `DataTexture` (see `materials/neutralEnvMap.ts` for the house pattern).
- Never `--no-verify`.

Everything else, including the full verification sequence and the bundle budgets, is in
`CODEX.md`.

## Communication style

Use plain language per **ISO 24495-1:2023** in all communication with the user:
lead with what the reader needs first, keep sentences short, prefer everyday
words, explain any term the reader may not know, and structure messages so the
main point is findable at a glance.

## Where the work is tracked

[`docs/PRD/dune92/03-stage-index.md`](./docs/PRD/dune92/03-stage-index.md) is the live
status board. Per-stage specs sit in `docs/PRD/dune92/stages/`.
