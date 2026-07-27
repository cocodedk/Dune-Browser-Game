# 02 — Engine: World Model

## Goal

Define the central world state in a way that is serializable, engine-owned, and consistent with the current repo layout.

## Prerequisites

- `00-gate-poc-first.md` — gate passed
- `01-project-structure.md` — structure confirmed

## Scope

- Keep shared world and event types in `src/types.ts`
- Keep initial-state construction in `src/game-engine/GameState.ts`
- Keep authored seed data in `src/data/`
- Ensure world state is plain-data serializable even if authored data currently lives in TypeScript modules

## Out of Scope

- Game loop behavior
- Rendering concerns
- React store wiring
- Save/load implementation details beyond keeping the state serializable

## Design Rules

- World state should remain plain objects and arrays
- Avoid embedding behaviorful class instances inside world state
- Engine state should be usable without React or Phaser
- Seed data may come from `.ts` modules today; JSON is optional, not mandatory

## Current Repo Mapping

- `src/types.ts`: shared world, village, faction, dialogue, and event contracts
- `src/game-engine/GameState.ts`: `createInitialState()` and module-level world state
- `src/data/villages.ts`: authored village seed data
- `src/data/dialogues.ts`: authored dialogue seed data

## Acceptance Criteria

- [ ] Core world types are defined in one clear shared location
- [ ] Initial world creation happens in engine code, not UI code
- [ ] Authored data is separated from simulation logic
- [ ] World state remains serializable
- [ ] `tsc --noEmit` passes after changes

## Note

Older versions of this task referenced a missing `12-data-json-files.md` prerequisite and a deep `src/game-engine/types/` tree.
Those are not required for the current repository.
