# 03 — Time System

## Goal

Time progresses continuously and triggers village updates at day boundaries.

## Input

- Task 02 complete (`World` type and `update()` exist)

## Scope (PoC only — keep it small)

- Define `DAY` constant (e.g. `60` seconds of real time = 1 game day)
- Implement time tick: `world.time += delta` inside `update()`
- Trigger `updateVillages(world)` when a day boundary is crossed:
  ```ts
  const DAY = 60  // seconds

  function update(world: World, delta: number): void {
    const prevDay = Math.floor(world.time / DAY)
    world.time += delta
    const nextDay = Math.floor(world.time / DAY)
    if (nextDay > prevDay) {
      updateVillages(world)
    }
  }
  ```
- Implement a simple fast-forward toggle: `world.timeScale` multiplier (default `1`, fast = `5`)
  ```ts
  // Apply time scale before incrementing
  world.time += delta * world.timeScale
  ```
- Log to console when a new day starts: `console.log("Day", nextDay)`

## Out of Scope (don't build yet)

- In-game clock display (task 08)
- Calendar / season system
- Pause functionality
- Time-based events beyond village update

## Key Types / Interfaces

```ts
// Add to World type in src/game-engine/types.ts
type World = {
  // ... existing fields
  time: number        // seconds elapsed (real time × timeScale)
  timeScale: number   // 1 = normal, 5 = fast-forward
}

const DAY = 60  // seconds of real time per game day
```

## Acceptance Criteria

- [ ] `world.time` increments every update call
- [ ] Console logs "Day N" each time a day boundary is crossed
- [ ] `world.timeScale = 5` makes time pass 5x faster
- [ ] `updateVillages()` is called exactly once per day (not every frame)
- [ ] Spice value visibly increases in console output after a day passes (stub output acceptable)

## Timebox

2–4 hours
