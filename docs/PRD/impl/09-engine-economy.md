# 09 — Engine: Economy

## Goal

Implement the spice economy: production per village, player transport (carrying spice), storage limits, and spice as currency for bribing and alliances.

## Prerequisites

- `02-engine-world-model.md` — `Player`, `Village`, `World` types.
- `06-engine-village-system.md` — village spice accumulation (economy extends it).
- `05-engine-event-system.md` — `EventQueue` for `spice-delivery` events.
- Village seed data available with `productionRate` and `spiceCapacity`.

## Scope

- `EconomySystem` class in `src/game-engine/economy.ts`.
- Player collects spice from villages (when present, via `collectSpice()`).
- Player carries spice (limited by `player.spiceCapacity`).
- Spice delivery: player deposits spice at a village or faction.
- Spice as currency: `bribeVillage()` transfers spice, calls `VillageSystem.onBribe()`.
- Economy feeds faction AI: villages low on spice → Harkonnen exploits them.

## Out of scope

- Spice production accumulation per frame (that is in `VillageSystem.update()` — task 06).
- UI display of spice (tasks 15, 18).
- Market pricing or trading between factions (not in scope for this version).
- Complex supply chains.

## Key types / interfaces

```ts
// src/game-engine/economy.ts

import { EventQueue } from './event-system'
import type { World } from './types/world.types'
import type { Village } from './types/village.types'
import type { EngineSystem } from './game-loop'

export class EconomySystem implements EngineSystem {
  private eventQueue: EventQueue

  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue
  }

  /** Called every frame — currently no continuous economy logic beyond VillageSystem. */
  update(_world: World, _delta: number): void {
    // Production is handled by VillageSystem.update().
    // Future: inter-faction trade could go here.
  }

  /**
   * Player collects spice from the current village.
   * Takes up to the player's remaining capacity.
   * Returns the amount actually collected.
   */
  collectSpice(world: World, villageId: string): number {
    const village = this.getVillageOrThrow(world, villageId)
    const player = world.player

    if (player.locationId !== villageId) {
      return 0  // player not here
    }

    const capacity = player.spiceCapacity - player.spice
    const collected = Math.min(village.spice, capacity)

    village.spice -= collected
    player.spice += collected

    if (collected > 0) {
      village.recentEvents.push(
        `Player collected ${Math.round(collected)} spice.`
      )
      EventQueue.enqueue(world, {
        type: "spice-delivery",
        targetId: villageId,
        payload: { amount: collected, direction: "collected" },
        scheduledAt: 0,
      })
    }

    return collected
  }

  /**
   * Player deposits spice at a village (leaving a gift / tribute).
   * Increases village spice stock, improves faction relations.
   * Returns error string or null on success.
   */
  depositSpice(world: World, villageId: string, amount: number): string | null {
    if (amount <= 0) return "Amount must be positive."

    const player = world.player
    if (player.locationId !== villageId) return "Player is not at this village."
    if (player.spice < amount) return "Not enough spice."

    const village = this.getVillageOrThrow(world, villageId)
    const deposited = Math.min(amount, village.spiceCapacity - village.spice)

    player.spice -= deposited
    village.spice += deposited

    EventQueue.enqueue(world, {
      type: "spice-delivery",
      targetId: villageId,
      payload: { amount: deposited, direction: "deposited" },
      scheduledAt: 0,
    })

    return null
  }

  /**
   * Bribe a village with spice to improve loyalty.
   * Calls VillageSystem logic (injected via callback).
   */
  bribeVillage(
    world: World,
    villageId: string,
    spiceAmount: number,
    onBribe: (village: Village, amount: number, world: World) => void,
  ): string | null {
    const player = world.player
    if (player.locationId !== villageId) return "Player is not at this village."
    if (player.spice < spiceAmount) return "Not enough spice."
    if (spiceAmount <= 0) return "Amount must be positive."

    const village = this.getVillageOrThrow(world, villageId)
    player.spice -= spiceAmount

    onBribe(village, spiceAmount, world)

    return null
  }

  /**
   * Query total spice under player control (carried + stored in friendly villages).
   */
  getTotalSpiceControl(world: World): number {
    const friendlyVillageSpice = world.villages
      .filter(v => v.status === "friendly")
      .reduce((sum, v) => sum + v.spice, 0)
    return world.player.spice + friendlyVillageSpice
  }

  private getVillageOrThrow(world: World, id: string): Village {
    const village = world.villages.find(v => v.id === id)
    if (!village) throw new Error(`Village not found: ${id}`)
    return village
  }
}
```

### Economy summary for faction AI (task 10)

```ts
// AI system reads economy state to make decisions:
export type EconomySummary = {
  playerSpice: number
  villageSurplus: Array<{ id: string; spice: number; status: string }>
  totalProduction: number   // spice/second across all villages
}

export function getEconomySummary(world: World): EconomySummary {
  return {
    playerSpice: world.player.spice,
    villageSurplus: world.villages.map(v => ({
      id: v.id,
      spice: v.spice,
      status: v.status,
    })),
    totalProduction: world.villages.reduce((s, v) => s + v.productionRate, 0),
  }
}
```

### Storage limits

| Entity | Capacity | Source |
|--------|----------|--------|
| Player | `player.spiceCapacity` (100 default) | Upgradeable in later version |
| Village | `village.spiceCapacity` (from JSON) | Fixed per village |

## File locations

| File | Action |
|------|--------|
| `src/game-engine/economy.ts` | Create |
| `src/game-engine/index.ts` | Export `EconomySystem`, `EconomySummary`, `getEconomySummary` |

## Acceptance criteria

- [ ] `collectSpice(world, villageId)` transfers spice from village to player up to `spiceCapacity`.
- [ ] `collectSpice()` returns 0 if player is not at that village.
- [ ] Player spice never exceeds `player.spiceCapacity`.
- [ ] Village spice never goes below 0 after collection.
- [ ] `depositSpice(world, villageId, 50)` transfers 50 spice from player to village, capped at `village.spiceCapacity`.
- [ ] `depositSpice()` returns error if player lacks spice or is not at the village.
- [ ] `bribeVillage(world, villageId, 30, onBribe)` deducts 30 spice from player and calls `onBribe`.
- [ ] `getEconomySummary(world)` returns correct total production and surplus.
- [ ] `spice-delivery` event is enqueued on each collect/deposit.
- [ ] No imports from `game-render` or `ui`.
