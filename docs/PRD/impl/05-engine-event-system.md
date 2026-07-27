# 05 — Engine: Event System

## Goal

Implement a queue-based event system that decouples producers (time, AI, player actions) from consumers (village system, dialogue, React UI).

## Prerequisites

- `01-project-structure.md` — directory structure in place.
- `02-engine-world-model.md` — `World` and `GameEvent` types defined.

## Scope

- `EventQueue` class in `src/game-engine/event-system.ts`.
- All engine-internal event types: `dialogue`, `attack`, `alliance`, `rebellion`, `spice-delivery`, `arrival`, `day-tick`.
- `process()` method called by GameLoop — dispatches events to registered handlers.
- Events fired by: time system, AI system, player actions (travel arrival, dialogue choices).
- React layer subscribes via the event bridge (task 16) — this task only implements the engine side.

## Out of scope

- React event bridge implementation (task 16) — that bridges Phaser ↔ React separately.
- Individual handler logic (village system handles `day-tick`, dialogue system handles `dialogue` — those are tasks 06 and 08).
- Persistence — the queue is cleared after processing; unprocessed events persist via `world.eventQueue`.

## Key types / interfaces

```ts
// src/game-engine/types/event.types.ts  (defined in task 02, expanded here)

export type GameEventType =
  | "dialogue"
  | "attack"
  | "alliance"
  | "rebellion"
  | "spice-delivery"
  | "arrival"
  | "day-tick"
  | "week-tick"
  | "loyalty-change"
  | "faction-pressure"

export type GameEvent = {
  id: string
  type: GameEventType
  targetId: string           // village id, character id, faction id, or "all"
  payload: Record<string, unknown>
  scheduledAt: number        // world.time when to fire; 0 = next process() call
  processed: boolean
}

export type EventHandler = (event: GameEvent, world: World) => void
```

```ts
// src/game-engine/event-system.ts

import type { World } from './types/world.types'
import type { GameEvent, GameEventType, EventHandler } from './types/event.types'

let _idCounter = 0

export function makeEventId(): string {
  return `evt-${++_idCounter}`
}

export class EventQueue {
  private handlers: Map<GameEventType, EventHandler[]> = new Map()

  /**
   * Register a handler for a specific event type.
   * Multiple handlers can be registered per type — all fire in registration order.
   */
  on(type: GameEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)!.push(handler)
  }

  /**
   * Push an event into the world's queue.
   * Events with scheduledAt > 0 are held until world.time reaches scheduledAt.
   */
  push(event: GameEvent): void {
    // Avoid duplicate ids
    world_push_deferred(event)   // see note below — queue is on world, not here
  }

  /**
   * Process all due events. Called by GameLoop.update() after all systems update.
   * Mutates world.eventQueue — removes processed events.
   */
  process(world: World): void {
    const queue = world.eventQueue
    for (let i = 0; i < queue.length; i++) {
      const event = queue[i]
      if (event.processed) continue
      if (event.scheduledAt > 0 && event.scheduledAt > world.time) continue

      // Fire all handlers for this event type
      const handlers = this.handlers.get(event.type)
      if (handlers) {
        for (let j = 0; j < handlers.length; j++) {
          handlers[j](event, world)
        }
      }
      event.processed = true
    }

    // Compact the queue — remove processed events
    // Keep unprocessed future events
    world.eventQueue = queue.filter(e => !e.processed)
  }

  /** Push an event directly onto the world queue (used by all systems). */
  static enqueue(world: World, event: Omit<GameEvent, 'id' | 'processed'>): void {
    world.eventQueue.push({
      ...event,
      id: makeEventId(),
      processed: false,
    })
  }
}
```

### Usage examples

```ts
// Time system pushes a day-tick:
EventQueue.enqueue(world, {
  type: "day-tick",
  targetId: "all",
  payload: { day: 5 },
  scheduledAt: 0,
})

// Travel system schedules an arrival event in the future:
EventQueue.enqueue(world, {
  type: "arrival",
  targetId: player.destinationId!,
  payload: { playerId: "player" },
  scheduledAt: player.arrivalTime!,
})

// Village system registers to handle day-tick:
eventQueue.on("day-tick", (event, world) => {
  world.villages.forEach(v => updateVillageProduction(v, world.time))
})

// Dialogue system registers to handle dialogue events:
eventQueue.on("dialogue", (event, world) => {
  startDialogue(world, event.targetId)
})
```

### React subscription (preview — handled by the app bridge layer)

```ts
// A bridge layer listens on certain event types
// and forward them to React via Phaser's event emitter or Zustand:
eventQueue.on("rebellion", (event, world) => {
  phaserEventBus.emit("rebellion", { villageId: event.targetId })
})
```

## File locations

| File | Action |
|------|--------|
| `src/game-engine/event-system.ts` | Create |
| `src/game-engine/types/event.types.ts` | Expand (was stub in task 02) |
| `src/game-engine/index.ts` | Export `EventQueue`, `makeEventId` |

## Acceptance criteria

- [ ] `EventQueue` compiles with no TypeScript errors.
- [ ] `EventQueue.enqueue(world, {...})` adds an event to `world.eventQueue`.
- [ ] `eventQueue.process(world)` fires handlers for all events with `scheduledAt <= world.time`.
- [ ] Events with `scheduledAt > world.time` are NOT fired — they remain in the queue.
- [ ] After `process()`, all fired events are removed from `world.eventQueue`.
- [ ] Multiple handlers for the same type all fire in registration order.
- [ ] `on("day-tick", handler)` — handler is called whenever a `day-tick` event is processed.
- [ ] `world.eventQueue` survives `JSON.stringify` / `JSON.parse` (all fields are serializable primitives).
- [ ] No imports from `game-render` or `ui`.
