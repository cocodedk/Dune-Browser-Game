# 01 — Project Structure

## Goal

Establish and protect the production folder structure without forcing a rewrite away from the working PoC layout.

## Prerequisites

- `00-gate-poc-first.md` — PoC gate passed

## Scope

Use the current four-layer split already present in the repo:

```text
src/
  data/
  game-engine/
  game-render/
  shims/
  ui/
  App.tsx
  EventBus.ts
  main.tsx
  types.ts
```

The objective is to keep responsibilities clear, not to create a larger directory tree for its own sake.

## Out of Scope

- Renaming files purely to match an older planning draft
- Creating empty menu, save/load, or scene folders before they are needed
- Converting working TypeScript data files to JSON unless there is a concrete need

## Ownership Boundaries

- `src/game-engine/`: simulation rules and world updates
- `src/game-render/`: Phaser scenes and rendering concerns
- `src/ui/`: React panels and store
- `src/EventBus.ts`: bridge between Phaser and React
- `src/data/`: authored game content
- `src/shims/`: build and browser compatibility shims only

## Acceptance Criteria

- [ ] The current four-layer split remains clear and intentional
- [ ] No engine module imports React
- [ ] No UI module creates or owns Phaser scenes directly
- [ ] Cross-layer communication goes through explicit contracts such as `EventBus`
- [ ] `npm run dev` starts without structural import errors

## Note

Older drafts of this task described extra folders such as `components/`, `hooks/`, `event-bridge/`, `UIScene`, and root `src/main.ts`.
Treat those as historical ideas, not required outcomes for this repository.
