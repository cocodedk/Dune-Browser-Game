# 06 — Engine: Village System

## Goal

Implement village state management: loyalty mechanics, status transitions, and production driven by the time system's day-tick events.

## Prerequisites

- `02-engine-world-model.md` — `Village` type defined.
- `04-engine-time-system.md` — `DAY` constant and day-tick events.
- `05-engine-event-system.md` — `EventQueue` for registering day-tick handler.
- Village seed data available in the current data layer with `productionRate` per village.

## Scope

- `VillageSystem` class in `src/game-engine/village-system.ts`.
- Implements `EngineSystem` interface (task 03) — registered with `GameLoop.addSystem()`.
- Loyalty mechanics: 0–100 range, decay when player neglects a village, boost from player actions.
- Status transitions: `neutral` → `friendly` (loyalty ≥ 70), `neutral` → `rebelling` (loyalty < 30).
- Rebellion trigger: fires `rebellion` event when loyalty drops below 30.
- Spice production: accumulates each frame, capped at `spiceCapacity`.
- Village production updated every DAY (via day-tick event handler).

## Out of scope

- Economy transport (player carrying spice) — task 09.
- AI faction actions on villages — task 10.
- Rendering village markers — task 14.
- React village panel display — task 18.

## Key types / interfaces

```ts
// src/game-engine/village-system.ts

import { EventQueue } from './event-system'
import { DAY } from './time-system'
import type { World } from './types/world.types'
import type { Village, VillageStatus } from './types/village.types'
import type { EngineSystem } from './game-loop'

/** How much loyalty decays per game-second of player neglect. */
const LOYALTY_DECAY_PER_DAY = 2          // -2 loyalty per day unvisited

/** Thresholds for status transitions. */
const LOYALTY_FRIENDLY_THRESHOLD = 70
const LOYALTY_REBELLION_THRESHOLD = 30

/** Maximum spice storage if not specified in data. */
const DEFAULT_SPICE_CAPACITY = 500

export class VillageSystem implements EngineSystem {
  private eventQueue: EventQueue

  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue

    // Subscribe to day-tick to run heavier per-day calculations
    eventQueue.on("day-tick", (event, world) => {
      this.onDayTick(world)
    })
  }

  /** Called every frame by GameLoop. */
  update(world: World, delta: number): void {
    // Continuous spice production (per frame, scaled)
    const deltaSec = delta / 1000
    for (let i = 0; i < world.villages.length; i++) {
      const village = world.villages[i]
      village.spice = Math.min(
        village.spice + village.productionRate * deltaSec,
        village.spiceCapacity ?? DEFAULT_SPICE_CAPACITY,
      )
    }
  }

  /** Called once per in-game day via day-tick event. */
  private onDayTick(world: World): void {
    for (let i = 0; i < world.villages.length; i++) {
      const village = world.villages[i]

      // Loyalty decay based on neglect (time since last visit)
      const daysSinceVisit = (world.time - village.lastVisitedTime) / DAY
      if (daysSinceVisit > 1) {
        this.modifyLoyalty(village, -LOYALTY_DECAY_PER_DAY, world, "neglect")
      }

      // Update status based on loyalty
      this.updateStatus(village, world)
    }
  }

  /**
   * Modify village loyalty by `delta`. Clamps to [0, 100].
   * Fires events on threshold crossings.
   */
  modifyLoyalty(
    village: Village,
    delta: number,
    world: World,
    reason: string,
  ): void {
    const before = village.loyalty
    village.loyalty = Math.max(0, Math.min(100, village.loyalty + delta))

    // Log for the village's recent events (displayed in React panel)
    if (Math.abs(delta) >= 1) {
      const sign = delta > 0 ? "+" : ""
      village.recentEvents.push(
        `[Day ${Math.floor(world.time / DAY)}] Loyalty ${sign}${Math.round(delta)} (${reason})`
      )
      // Keep only last 10 events
      if (village.recentEvents.length > 10) {
        village.recentEvents.shift()
      }
    }

    this.updateStatus(village, world)
  }

  private updateStatus(village: Village, world: World): void {
    const newStatus = this.computeStatus(village.loyalty)
    if (newStatus !== village.status) {
      const previous = village.status
      village.status = newStatus

      if (newStatus === "rebelling") {
        EventQueue.enqueue(world, {
          type: "rebellion",
          targetId: village.id,
          payload: { villageId: village.id, loyalty: village.loyalty },
          scheduledAt: 0,
        })
        village.recentEvents.push(
          `[Day ${Math.floor(world.time / DAY)}] Village is REBELLING!`
        )
      } else if (newStatus === "friendly" && previous !== "friendly") {
        EventQueue.enqueue(world, {
          type: "alliance",
          targetId: village.id,
          payload: { villageId: village.id },
          scheduledAt: 0,
        })
      }
    }
  }

  private computeStatus(loyalty: number): VillageStatus {
    if (loyalty >= LOYALTY_FRIENDLY_THRESHOLD) return "friendly"
    if (loyalty < LOYALTY_REBELLION_THRESHOLD) return "rebelling"
    return "neutral"
  }

  /** Called when player visits a village — resets neglect timer. */
  onPlayerVisit(village: Village, world: World): void {
    village.lastVisitedTime = world.time
    this.modifyLoyalty(village, 5, world, "player visit")
  }

  /** Called when player bribes a village with spice. */
  onBribe(village: Village, spiceAmount: number, world: World): void {
    const loyaltyGain = Math.floor(spiceAmount / 10)  // 10 spice = 1 loyalty
    this.modifyLoyalty(village, loyaltyGain, world, `bribe (${spiceAmount} spice)`)
  }
}
```

### Status transition table

| Loyalty range | Status | Notes |
|---------------|--------|-------|
| 70–100 | `friendly` | Village actively supports player |
| 30–69 | `neutral` | Default state |
| 0–29 | `rebelling` | Fires `rebellion` event; Harkonnen may exploit |

## File locations

| File | Action |
|------|--------|
| `src/game-engine/village-system.ts` | Create |
| `src/game-engine/index.ts` | Export `VillageSystem` |

## Acceptance criteria

- [ ] `VillageSystem` implements `EngineSystem` interface.
- [ ] `update()` accumulates `productionRate * deltaSec` spice per frame; spice never exceeds `spiceCapacity`.
- [ ] After one day-tick event, loyalty decays by `LOYALTY_DECAY_PER_DAY` for unvisited villages.
- [ ] Loyalty clamps to [0, 100] — never goes below 0 or above 100.
- [ ] When loyalty drops below 30, `village.status` becomes `"rebelling"` and a `rebellion` event is queued.
- [ ] When loyalty rises to ≥ 70, `village.status` becomes `"friendly"` and an `alliance` event is queued.
- [ ] `onPlayerVisit()` updates `village.lastVisitedTime` and adds +5 loyalty.
- [ ] `onBribe(village, 50, world)` gives +5 loyalty.
- [ ] `village.recentEvents` has at most 10 entries.
- [ ] Status changes are idempotent — re-entering the same status does not fire duplicate events.
- [ ] No imports from `game-render` or `ui`.
