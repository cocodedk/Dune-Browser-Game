# 02 — Engine World State

## Goal

Minimal world state and game loop running in isolation — no React, no Phaser.

## Input

- Task 01 complete (project scaffolded, folder structure exists)

## Scope (PoC only — keep it small)

- Define core types in `src/game-engine/types.ts`
- Implement `World` with exactly 3 villages, 1 player, 1 AI faction
- Implement `update(delta: number): void` that mutates world state
- Game loop runs independently of React and Phaser (pure TypeScript module)
- Export `createWorld()` factory function that returns a fresh world

```ts
// src/game-engine/types.ts

type Village = {
  id: string
  name: string
  population: number
  spice: number
  loyalty: number     // 0–100
  status: "neutral" | "friendly" | "rebelling"
}

type Player = {
  id: "player"
  currentVillageId: string | null
  state: "idle" | "traveling"
  travelTarget: string | null
  travelTimeRemaining: number   // seconds
  spice: number
}

type Faction = {
  id: string
  name: string
  lastDecision: "attack" | "ally" | "ignore" | null
  targetVillageId: string | null
}

type World = {
  time: number          // seconds elapsed
  villages: Village[]   // exactly 3
  player: Player
  faction: Faction      // exactly 1
  eventLog: string[]    // recent game events, max 20 entries
}
```

- `update(world, delta)` must:
  - Increment `world.time`
  - Stub village update (no-op for now — implemented in task 05)
  - Stub AI trigger (no-op for now — implemented in task 07)

## Out of Scope (don't build yet)

- Spice production logic (task 05)
- Travel logic (task 04)
- AI decision logic (task 07)
- React state management
- Persistence / save-load

## Key Types / Interfaces

See Scope section above — all types defined there.

## Acceptance Criteria

- [ ] `src/game-engine/types.ts` exists with all types above
- [ ] `src/game-engine/world.ts` exports `createWorld()` returning a valid `World`
- [ ] `src/game-engine/loop.ts` exports `update(world: World, delta: number): void`
- [ ] Calling `update()` in a plain Node script (or browser console) does not throw
- [ ] `world.time` increments correctly after multiple `update()` calls
- [ ] TypeScript compiles with no errors

## Timebox

4–6 hours
