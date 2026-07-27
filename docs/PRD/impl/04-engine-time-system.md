# 04 — Engine: Time System

## Goal

Implement the time system that advances game time, supports fast-forward, defines the DAY constant, and fires timed interval events.

## Prerequisites

- `01-project-structure.md` — directory structure in place.
- `02-engine-world-model.md` — `World` type defined.
- `05-engine-event-system.md` — `EventQueue` available (can run in parallel; use the `pushEvent` interface).

## Scope

- `TimeSystem` class in `src/game-engine/time-system.ts`.
- Continuous tick in seconds (fractional, float).
- `DAY` constant (in seconds).
- Interval triggers: fire events every DAY, every WEEK, etc.
- `timeScale` is read from `world.timeScale` — GameLoop applies it before calling `update()`.
- Time must be serializable: `world.time` is a plain number.

## Out of scope

- UI display of time (handled by the presentation layer, not this task).
- Fast-forward UI controls (presentation-layer concern).
- Calendar / named days — keep it as a number; formatting is for UI layer.
- Village production updates — those are triggered by day-tick events (task 06).

## Key types / interfaces

```ts
// src/game-engine/time-system.ts

import type { World } from './types/world.types'
import type { EventQueue } from './event-system'

/** Game seconds per in-game day. Tune to feel right (e.g. 60 real seconds = 1 day). */
export const DAY = 60        // seconds
export const WEEK = DAY * 7

/** Minimum interval between checks to avoid floating-point drift. */
const TICK_EPSILON = 0.001

export class TimeSystem {
  private eventQueue: EventQueue
  private lastDayTick = 0
  private lastWeekTick = 0

  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue
  }

  /**
   * Called by GameLoop.update() with already-scaled delta (seconds).
   * Note: GameLoop multiplies raw delta by timeScale before calling this.
   */
  update(world: World, scaledDeltaMs: number): void {
    const scaledDeltaSec = scaledDeltaMs / 1000
    world.time += scaledDeltaSec

    // Day tick
    const daysPassed = Math.floor(world.time / DAY)
    const lastDaysPassed = Math.floor(this.lastDayTick / DAY)
    if (daysPassed > lastDaysPassed) {
      this.onDayTick(world)
      this.lastDayTick = world.time
    }

    // Week tick
    const weeksPassed = Math.floor(world.time / WEEK)
    const lastWeeksPassed = Math.floor(this.lastWeekTick / WEEK)
    if (weeksPassed > lastWeeksPassed) {
      this.onWeekTick(world)
      this.lastWeekTick = world.time
    }
  }

  private onDayTick(world: World): void {
    // Enqueue day-tick event — village system and economy will handle it
    this.eventQueue.push({
      id: `day-tick-${world.time}`,
      type: "day-tick",
      targetId: "all",
      payload: { day: Math.floor(world.time / DAY) },
      scheduledAt: world.time,
      processed: false,
    })
  }

  private onWeekTick(world: World): void {
    this.eventQueue.push({
      id: `week-tick-${world.time}`,
      type: "week-tick" as any,
      targetId: "all",
      payload: { week: Math.floor(world.time / WEEK) },
      scheduledAt: world.time,
      processed: false,
    })
  }

  /** Restore interval tracking after loading a saved game. */
  restoreFromWorld(world: World): void {
    this.lastDayTick = world.time
    this.lastWeekTick = world.time
  }

  /** Current game time formatted as "Day N, HH:MM" for display. */
  static formatTime(time: number): string {
    const totalSeconds = Math.floor(time)
    const day = Math.floor(totalSeconds / DAY) + 1
    const secondsInDay = totalSeconds % DAY
    const hours = Math.floor((secondsInDay / DAY) * 24)
    const minutes = Math.floor(((secondsInDay / DAY) * 24 * 60) % 60)
    return `Day ${day}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
}
```

### Time scale controls

```ts
// Setting fast-forward from React (via engine dispatch or direct world mutation)
world.timeScale = 1    // normal speed
world.timeScale = 5    // 5× fast-forward
world.timeScale = 10   // 10× (max recommended)
```

`timeScale` lives on `world` so it is serializable and saved with the game state.

### Serialization

`world.time` is a plain `number`. `TimeSystem` internal state (`lastDayTick`, `lastWeekTick`) must be re-initialized on load:

```ts
// In save-system.ts (task 11) after loading:
const world = JSON.parse(savedJson) as World
timeSystem.restoreFromWorld(world)
```

## File locations

| File | Action |
|------|--------|
| `src/game-engine/time-system.ts` | Create |
| `src/game-engine/index.ts` | Export `TimeSystem`, `DAY`, `WEEK` |

## Acceptance criteria

- [ ] `TimeSystem` compiles with no TypeScript errors.
- [ ] After calling `update()` with `scaledDeltaMs = 60_000` (one day's worth of ms), a `"day-tick"` event is in the queue.
- [ ] After 7 days of ticks, a `"week-tick"` event fires.
- [ ] `world.time` increases by `scaledDeltaMs / 1000` each call.
- [ ] With `world.timeScale = 2`, the game advances 2 seconds of game time per real second (verified by checking `world.time` after two calls of `update(500)`).
- [ ] `TimeSystem.formatTime(0)` returns `"Day 1, 00:00"`.
- [ ] `TimeSystem.formatTime(DAY)` returns `"Day 2, 00:00"`.
- [ ] `restoreFromWorld()` prevents duplicate day-tick events after loading a save.
- [ ] `world.time` is a plain number — survives `JSON.stringify` / `JSON.parse` round-trip.
