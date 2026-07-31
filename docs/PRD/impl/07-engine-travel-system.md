# 07 — Engine: Travel System

## Goal

Implement node-based map travel: player moves between villages along a fixed distance graph, travel takes in-game time, and arrival fires an event.

## Prerequisites

- `02-engine-world-model.md` — `Player`, `World` types defined.
- `05-engine-event-system.md` — `EventQueue` for `arrival` events.
- Village data available with `position` coordinates if distances are derived from data.

## Scope

- `TravelSystem` class in `src/game-engine/travel-system.ts`.
- Distance graph: either loaded from data or computed from village `position` coordinates.
- `travel(world, fromId, toId)` — validates, sets player state, schedules arrival event.
- Player cannot interact (dialogue, bribe, collect spice) while `player.state === "traveling"`.
- Arrival fires `arrival` event, sets player location, calls `VillageSystem.onPlayerVisit()`.
- Implements `EngineSystem` — checks for arrival each frame.

## Out of scope

- Free movement / pathfinding (game uses node graph only).
- Rendering the player token movement (task 14).
- React UI for travel controls (task 14 handles click-to-travel via Phaser).
- Combat during travel (not in scope for this game version).

## Key types / interfaces

```ts
// src/game-engine/travel-system.ts

import { EventQueue } from './event-system'
import type { World } from './types/world.types'
import type { EngineSystem } from './game-loop'

/** Travel speed factor: game-seconds per distance unit. */
const TRAVEL_SECONDS_PER_UNIT = 10

/**
 * Hardcoded adjacency + distance map.
 * Key: "fromId:toId" (order-independent). Value: distance units.
 * Replace with data-driven approach once villages.json has distances.
 */
const DISTANCES: Record<string, number> = {
  "sietch_tabr:arrakeen": 5,
  "sietch_tabr:carthag": 8,
  "arrakeen:carthag": 4,
  "arrakeen:imperial_basin": 3,
  "carthag:smuggler_den": 6,
  "imperial_basin:deep_desert": 7,
  // Add all village connections here
}

function distanceKey(a: string, b: string): string {
  return [a, b].sort().join(":")
}

export class TravelSystem implements EngineSystem {
  private eventQueue: EventQueue
  private onArrivalCallback?: (world: World, villageId: string) => void

  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue

    eventQueue.on("arrival", (event, world) => {
      this.handleArrival(world, event.targetId)
    })
  }

  /**
   * Callback to call on arrival — injected to avoid circular dep with VillageSystem.
   * TravelSystem calls this → VillageSystem.onPlayerVisit().
   */
  onArrival(cb: (world: World, villageId: string) => void): void {
    this.onArrivalCallback = cb
  }

  /** Called every frame by GameLoop. Checks if arrival time has been reached. */
  update(world: World, _delta: number): void {
    const player = world.player
    if (player.destinationId === null || player.arrivalTime === null) return

    // Arrival time is checked by the scheduled event — nothing to do per-frame
    // (EventQueue processes arrival events when world.time >= scheduledAt)
  }

  /**
   * Initiate travel from current player location to destination.
   * Returns an error string if travel is not possible, or null on success.
   */
  travel(world: World, toId: string): string | null {
    const player = world.player

    if (player.destinationId !== null) {
      return "Already traveling."
    }

    if (player.locationId === toId) {
      return "Already at destination."
    }

    const key = distanceKey(player.locationId, toId)
    const distance = DISTANCES[key]
    if (distance === undefined) {
      return `No route from ${player.locationId} to ${toId}.`
    }

    const travelTime = distance * TRAVEL_SECONDS_PER_UNIT
    player.destinationId = toId
    player.arrivalTime = world.time + travelTime

    // Schedule arrival event
    EventQueue.enqueue(world, {
      type: "arrival",
      targetId: toId,
      payload: {
        from: player.locationId,
        to: toId,
        travelTime,
      },
      scheduledAt: player.arrivalTime,
    })

    return null  // success
  }

  private handleArrival(world: World, villageId: string): void {
    const player = world.player
    player.locationId = villageId
    player.destinationId = null
    player.arrivalTime = null

    // Notify village system
    this.onArrivalCallback?.(world, villageId)
  }

  /** Returns true if the player can currently interact (not traveling). */
  static canInteract(world: World): boolean {
    return world.player.destinationId === null
  }

  /** Returns adjacent village ids reachable from a given location. */
  static getReachableFrom(locationId: string): string[] {
    return Object.keys(DISTANCES)
      .filter(key => key.includes(locationId))
      .map(key => key.split(":").find(id => id !== locationId)!)
      .filter(Boolean)
  }

  /** Travel progress 0.0–1.0, or null if not traveling. */
  static getTravelProgress(world: World): number | null {
    const player = world.player
    if (player.destinationId === null || player.arrivalTime === null) return null

    // Find the departure time by working backwards from arrival - travelTime
    // We don't store departure time directly; approximate from distance
    const key = distanceKey(player.locationId, player.destinationId)
    const travelTime = (DISTANCES[key] ?? 1) * TRAVEL_SECONDS_PER_UNIT
    const departureTime = player.arrivalTime - travelTime
    const elapsed = world.time - departureTime
    return Math.min(1, Math.max(0, elapsed / travelTime))
  }
}
```

### Integration example (in MainScene — task 14)

```ts
// Player clicks on village marker → try to travel
villageMarker.on("pointerdown", () => {
  const error = travelSystem.travel(world, village.id)
  if (error) {
    // Show error in the presentation layer
    phaserEventBus.emit("travelError", { message: error })
  } else {
    // Animate player token movement
    animatePlayerToken(world.player, village.position)
  }
})
```

## File locations

| File | Action |
|------|--------|
| `src/game-engine/travel-system.ts` | Create |
| `src/game-engine/index.ts` | Export `TravelSystem` |

## Acceptance criteria

- [ ] `TravelSystem` implements `EngineSystem` interface.
- [ ] `travel(world, toId)` returns `null` on success and sets `player.destinationId`, `player.arrivalTime`.
- [ ] `travel()` returns an error string if player is already traveling.
- [ ] `travel()` returns an error string if no route exists between the two nodes.
- [ ] When `world.time` reaches `player.arrivalTime`, the `arrival` event fires and `player.locationId` is updated.
- [ ] After arrival, `player.destinationId` and `player.arrivalTime` are both `null`.
- [ ] `TravelSystem.canInteract(world)` returns `false` while traveling.
- [ ] `TravelSystem.getReachableFrom("arrakeen")` returns the correct adjacent nodes.
- [ ] `TravelSystem.getTravelProgress(world)` returns a value in [0, 1] while traveling.
- [ ] No imports from `game-render` or `ui`.
