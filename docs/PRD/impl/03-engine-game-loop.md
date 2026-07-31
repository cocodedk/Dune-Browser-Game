# 03 — Engine: Game Loop

## Goal

Implement the production game loop that drives all engine system updates at 30–60 FPS, driven by Phaser's `update()` hook.

## Prerequisites

- `01-project-structure.md` — directory structure in place.
- `02-engine-world-model.md` — `World` type defined.
- `04-engine-time-system.md` — `TimeSystem` available (can run in parallel; stub the interface if needed).
- `05-engine-event-system.md` — `EventQueue` available (can stub).
- `10-engine-ai-system.md` — `AISystem` available (can stub).

## Scope

- Implement `GameLoop` class in `src/game-engine/game-loop.ts`.
- The loop receives `delta` (milliseconds) from Phaser and distributes it to all systems.
- Systems are called in a fixed order: world → AI → events.
- Performance: avoid allocating new objects inside `update()`. Reuse arrays where possible.
- The game loop does NOT render — it only mutates `World`.

## Out of scope

- Phaser scene integration (that wires the loop in task 14).
- React — the loop has no knowledge of UI.
- Saving state (task 11).
- The individual system implementations — only the loop orchestration is here.

## Key types / interfaces

```ts
// src/game-engine/game-loop.ts

import type { World } from './types/world.types'
import type { TimeSystem } from './time-system'
import type { AISystem } from './ai-system'
import type { EventQueue } from './event-system'

export interface EngineSystem {
  update(world: World, delta: number): void
}

export class GameLoop {
  private world: World
  private timeSystem: TimeSystem
  private aiSystem: AISystem
  private eventQueue: EventQueue
  private extraSystems: EngineSystem[] = []

  constructor(
    world: World,
    timeSystem: TimeSystem,
    aiSystem: AISystem,
    eventQueue: EventQueue,
  ) {
    this.world = world
    this.timeSystem = timeSystem
    this.aiSystem = aiSystem
    this.eventQueue = eventQueue
  }

  /** Register additional systems (village, economy, travel, etc.) */
  addSystem(system: EngineSystem): void {
    this.extraSystems.push(system)
  }

  /**
   * Called by Phaser's scene.update(time, delta).
   * delta is in milliseconds.
   */
  update(delta: number): void {
    if (!this.world.isRunning) return

    // Apply time scale — all systems receive scaled delta
    const scaledDelta = delta * this.world.timeScale

    // 1. Advance world time (triggers day-tick events etc.)
    this.timeSystem.update(this.world, scaledDelta)

    // 2. Update all registered systems (village, economy, travel...)
    for (let i = 0; i < this.extraSystems.length; i++) {
      this.extraSystems[i].update(this.world, scaledDelta)
    }

    // 3. Run AI decisions
    this.aiSystem.update(this.world, scaledDelta)

    // 4. Process queued events (dialogue triggers, arrivals, etc.)
    this.eventQueue.process(this.world)
  }

  /** Start the game. */
  start(): void {
    this.world.isRunning = true
  }

  /** Pause the game (e.g. dialogue open, menu open). */
  pause(): void {
    this.world.isRunning = false
  }

  /** Resume after pause. */
  resume(): void {
    this.world.isRunning = true
  }

  getWorld(): World {
    return this.world
  }
}
```

### Phaser wiring (reference — implemented in task 14)

```ts
// Inside MainScene.ts (task 14)
class MainScene extends Phaser.Scene {
  private gameLoop!: GameLoop

  create() {
    // ... build world, systems
    this.gameLoop = new GameLoop(world, timeSystem, aiSystem, eventQueue)
    this.gameLoop.start()
  }

  update(_time: number, delta: number) {
    this.gameLoop.update(delta)
  }
}
```

### Performance guidelines

```ts
// BAD — allocates on every frame
update(delta: number) {
  const events = world.eventQueue.filter(e => !e.processed)  // new array each frame
}

// GOOD — iterate in place
update(delta: number) {
  for (let i = 0; i < world.eventQueue.length; i++) {
    if (!world.eventQueue[i].processed) { /* ... */ }
  }
}
```

- Do not use `Array.map`, `Array.filter`, or spread inside `update()` hot paths.
- Object pool pattern: if you need temporary objects inside update, allocate them once in the constructor.
- Target: `update()` completes in under 2ms at 60 FPS.

## File locations

| File | Action |
|------|--------|
| `src/game-engine/game-loop.ts` | Create |
| `src/game-engine/index.ts` | Export `GameLoop`, `EngineSystem` |

## Acceptance criteria

- [ ] `GameLoop` compiles with `tsc --noEmit` — no errors.
- [ ] `update(16)` calls `timeSystem.update`, all extra systems, `aiSystem.update`, and `eventQueue.process` in order.
- [ ] When `world.isRunning === false`, `update()` returns immediately (no mutations).
- [ ] `pause()` sets `isRunning = false`; `resume()` sets `isRunning = true`.
- [ ] `addSystem()` registers a system that is called on every subsequent `update()`.
- [ ] `scaledDelta = delta * world.timeScale` — with `timeScale = 2`, systems receive double the delta.
- [ ] No allocations of arrays or objects inside the hot `update()` path (verified by inspection or profiling).
- [ ] No imports from `game-render` or `ui`.
