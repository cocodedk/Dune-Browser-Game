# 10 — Engine: AI System

## Goal

Implement the basic rule-based AI that runs regardless of LLM availability: village loyalty decay from neglect, escalating Harkonnen pressure, and village rebellion responses.

## Prerequisites

- `02-engine-world-model.md` — `World`, `Faction`, `Village` types.
- `05-engine-event-system.md` — `EventQueue` for `attack`, `faction-pressure` events.
- `06-engine-village-system.md` — `VillageSystem.modifyLoyalty()` available.
- `04-engine-time-system.md` — `DAY`, `WEEK` constants.

## Scope

- `AISystem` class in `src/game-engine/ai-system.ts`.
- Implements `EngineSystem` (registered as the AI step in GameLoop).
- Basic rule-based loop: evaluates faction decisions each in-game day.
- Harkonnen aggression escalates over time (increases weekly).
- Villages with low loyalty (`< 30`) have a rebellion chance.
- Harkonnen attacks neglected villages (loyalty < 40, player absent).
- This AI runs at all times — LLM faction AI (future task) extends it but never replaces it.

## Out of scope

- LLM-driven faction AI (marked as "future" — this task builds the rule-based foundation).
- Fremen / Atreides complex diplomacy (factions exist in data but AI only governs Harkonnen here).
- Combat resolution system (attacks are events — full combat not in scope).
- React AI status display.

## Key types / interfaces

```ts
// src/game-engine/ai-system.ts

import { EventQueue } from './event-system'
import { DAY, WEEK } from './time-system'
import type { World } from './types/world.types'
import type { Village } from './types/village.types'
import type { EngineSystem } from './game-loop'

const HARKONNEN_FACTION_ID = "harkonnen"

/** Weekly aggression increase for Harkonnen. */
const AGGRESSION_ESCALATION_PER_WEEK = 5

/** Loyalty threshold below which Harkonnen considers attacking. */
const ATTACK_LOYALTY_THRESHOLD = 40

/** Base rebellion chance per day when loyalty < 30 (0.0–1.0). */
const BASE_REBELLION_CHANCE = 0.1

export class AISystem implements EngineSystem {
  private eventQueue: EventQueue
  private lastDayProcessed = -1
  private lastWeekProcessed = -1

  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue

    // Register to handle week-tick for Harkonnen escalation
    eventQueue.on("week-tick" as any, (_event, world) => {
      this.onWeekTick(world)
    })

    // Register to handle day-tick for per-day decisions
    eventQueue.on("day-tick", (_event, world) => {
      this.onDayTick(world)
    })
  }

  /** Called every frame — lightweight; heavy work is in day/week ticks. */
  update(_world: World, _delta: number): void {
    // Per-frame AI: nothing needed currently.
    // Future: continuous threat level adjustments could go here.
  }

  private onWeekTick(world: World): void {
    const harkonnen = world.factions.find(f => f.id === HARKONNEN_FACTION_ID)
    if (!harkonnen) return

    // Harkonnen grows bolder over time
    harkonnen.aggression = Math.min(100, harkonnen.aggression + AGGRESSION_ESCALATION_PER_WEEK)

    EventQueue.enqueue(world, {
      type: "faction-pressure",
      targetId: HARKONNEN_FACTION_ID,
      payload: { aggression: harkonnen.aggression },
      scheduledAt: 0,
    })
  }

  private onDayTick(world: World): void {
    const harkonnen = world.factions.find(f => f.id === HARKONNEN_FACTION_ID)
    if (!harkonnen) return

    for (const village of world.villages) {
      this.evaluateVillage(village, harkonnen.aggression, world)
    }
  }

  private evaluateVillage(
    village: Village,
    harkonnenaggression: number,
    world: World,
  ): void {
    const playerIsHere = world.player.locationId === village.id
    const playerIsTraveling = world.player.destinationId !== null

    // Rule 1: Rebellion chance if loyalty critically low
    if (village.loyalty < 30 && village.status !== "rebelling") {
      const rebellionChance = BASE_REBELLION_CHANCE + (30 - village.loyalty) * 0.01
      if (Math.random() < rebellionChance) {
        village.loyalty = Math.max(0, village.loyalty - 5)  // further decay
        // VillageSystem will detect the threshold and fire rebellion event
      }
    }

    // Rule 2: Harkonnen attacks vulnerable villages
    // Conditions: loyalty low enough, player not here, aggression high enough
    if (
      village.loyalty < ATTACK_LOYALTY_THRESHOLD &&
      !playerIsHere &&
      harkonnenaggression >= 20
    ) {
      const attackChance = (harkonnenaggression / 100) * 0.3  // 30% max at max aggression
      if (Math.random() < attackChance) {
        this.harkonnenAttack(village, harkonnenaggression, world)
      }
    }

    // Rule 3: Pressure neutral villages near Harkonnen territory
    if (village.status === "neutral" && !playerIsHere && harkonnenaggression >= 50) {
      const pressureChance = 0.05 * (harkonnenaggression / 100)
      if (Math.random() < pressureChance) {
        village.loyalty = Math.max(0, village.loyalty - 3)
        village.recentEvents.push(
          `Harkonnen agents are pressuring the village.`
        )
      }
    }
  }

  private harkonnenAttack(
    village: Village,
    aggression: number,
    world: World,
  ): void {
    // Attack: steal spice, reduce loyalty
    const spiceStolen = Math.min(village.spice, aggression * 0.5)
    village.spice -= spiceStolen
    village.loyalty = Math.max(0, village.loyalty - 10)

    village.recentEvents.push(
      `Harkonnen raiders attacked! Stole ${Math.round(spiceStolen)} spice. Loyalty -10.`
    )

    EventQueue.enqueue(world, {
      type: "attack",
      targetId: village.id,
      payload: {
        attacker: HARKONNEN_FACTION_ID,
        spiceStolen: Math.round(spiceStolen),
        loyaltyDamage: 10,
      },
      scheduledAt: 0,
    })
  }

  /** Restore AI tracking state after loading a save. */
  restoreFromWorld(world: World): void {
    this.lastDayProcessed = Math.floor(world.time / DAY)
    this.lastWeekProcessed = Math.floor(world.time / WEEK)
  }
}
```

### Harkonnen aggression curve

| Week | Aggression | Behavior |
|------|-----------|---------|
| 1–2 | 10–20 | Passive — no attacks |
| 3–4 | 25–35 | Occasional pressure on neutral villages |
| 5–8 | 40–60 | Active attacks on neglected villages |
| 9+ | 65–100 | Aggressive expansion — player must respond |

### Extension point for LLM AI

```ts
// Future: LLM faction AI wraps or replaces evaluateVillage()
// The rule-based system is the fallback when LLM is unavailable or slow.
interface FactionAI {
  decide(world: World, factionId: string): FactionDecision[]
}

// LLMFactionAI implements FactionAI
// RuleBasedAI (this class) also implements FactionAI
// AISystem uses whichever is available
```

## File locations

| File | Action |
|------|--------|
| `src/game-engine/ai-system.ts` | Create |
| `src/game-engine/index.ts` | Export `AISystem` |

## Acceptance criteria

- [ ] `AISystem` implements `EngineSystem` interface.
- [ ] Harkonnen aggression increases by `AGGRESSION_ESCALATION_PER_WEEK` each week-tick.
- [ ] Harkonnen aggression caps at 100.
- [ ] A `faction-pressure` event fires each week.
- [ ] Villages with loyalty < 30 have increasing rebellion chance each day-tick.
- [ ] Harkonnen attack only occurs when village loyalty < 40, player absent, aggression >= 20.
- [ ] Attacked village loses spice and loyalty, and an `attack` event fires.
- [ ] At aggression < 20, no attacks occur (verified by setting aggression to 10 and running 10 days).
- [ ] `restoreFromWorld()` prevents double-processing days/weeks on load.
- [ ] No imports from `game-render` or `ui`.
