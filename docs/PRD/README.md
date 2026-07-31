# PRD Guide

Read this file first.

## What This Folder Is

`docs/PRD/` mixes three kinds of planning material:

- `game-plan.md`: long-form master plan and design rationale
- `reference/`: condensed reference extracts from the master plan
- `poc/`: proof-of-concept task pack
- `impl/`: post-PoC implementation backlog

## How To Use It

Use the docs in this order:

1. `reference/vision-and-goals.md`
2. `reference/architecture.md`
3. `reference/tech-stack.md`
4. `poc/README.md`
5. `impl/00-gate-poc-first.md`

## Current Status

This repository is no longer at the blank-scaffold stage that some older task docs assume.

The live codebase already has:

- React + Phaser integration
- a game loop
- UI panels
- Playwright tests
- enforced pre-commit checks
- bundle-budget enforcement

If a task doc conflicts with the current repo, follow the repo and update the doc.

## Reality Check

Current repo structure:

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

## Notes On Task Numbering

- PoC task numbers are historical and not all dependencies were documented cleanly originally.
- Impl task numbers are also historical and are not contiguous.
- Missing numbers do not imply missing files you must invent before proceeding.

## Planning Rules

- Treat `poc/` as the smallest validation loop.
- Treat `impl/` as backlog guidance, not as a mandate to rewrite the current repo into an older folder tree.
- Keep docs aligned with the actual repo architecture and tooling.
