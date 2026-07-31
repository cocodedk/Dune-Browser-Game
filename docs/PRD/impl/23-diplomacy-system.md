# 23 — Diplomacy System

## Goal

Implement the `Relation` type, all five diplomatic actions, and the relation update logic so factions (and the player) can form and break alliances, trade, declare war, and demand tribute.

## Prerequisites

Task 22 (faction goals system) — the goals system must be in place because diplomatic actions are the primary mechanism for executing `ally` and `destroy` goals.

## Scope

- Implement the `Relation` type with `trust`, `fear`, `trade`, and `war` fields
- Implement all five diplomatic actions as pure functions that return updated `Relation` objects:
  - `proposeAlliance(actor, target, world)` — requires trust above threshold
  - `breakAlliance(actor, target, world)` — imposes global reputation cost
  - `tradeSpice(actor, target, amount, world)` — adjusts trust moderately
  - `declareWar(actor, target, world)` — sets `war: true`, reduces trust
  - `demandTribute(actor, target, world)` — only viable when `fear` is high
- Implement `updateRelations(event: WorldEvent, factions: Faction[]): Faction[]` — propagates relation changes across all factions when events occur (e.g., when faction A breaks alliance with B, third-party factions adjust their trust in A)
- The player is modeled as a faction for all diplomatic purposes

## Out of scope

- Conflict resolution / battle mechanics (task 25)
- Territory capture (task 24)
- Reputation UI display (task 26)
- Any LLM-driven diplomacy

## Key types / interfaces

```ts
type Relation = {
  trust: number    // -100 to +100
  fear: number     // 0 to 100
  trade: boolean
  war: boolean
}

type DiplomaticAction =
  | { type: "propose_alliance"; actor: FactionId; target: FactionId }
  | { type: "break_alliance"; actor: FactionId; target: FactionId }
  | { type: "trade_spice"; actor: FactionId; target: FactionId; amount: number }
  | { type: "declare_war"; actor: FactionId; target: FactionId }
  | { type: "demand_tribute"; actor: FactionId; target: FactionId; amount: number }

type DiplomaticResult = {
  accepted: boolean
  updatedRelation: Relation
  sideEffects: Array<{ factionId: FactionId; relationChange: Partial<Relation> }>
}

// Trust thresholds for actions
const ALLIANCE_TRUST_THRESHOLD = 40     // minimum trust to propose alliance
const WAR_TRUST_FLOOR = -30             // trust level at which war becomes likely
const TRIBUTE_FEAR_THRESHOLD = 60       // minimum fear to demand tribute

function applyDiplomaticAction(
  action: DiplomaticAction,
  world: WorldState
): DiplomaticResult

type WorldEvent =
  | { type: "alliance_broken"; actor: FactionId; target: FactionId }
  | { type: "war_declared"; actor: FactionId; target: FactionId }
  | { type: "tribute_refused"; actor: FactionId; target: FactionId }
```

## File locations

- Create: `src/engine/faction/diplomacy.ts`
- Update: `src/types/faction.ts` (add `Relation`, `DiplomaticAction`, `DiplomaticResult` exports)
- Do not modify strategy profiles or goals modules

## Acceptance criteria

- [ ] `Relation` type is implemented and exported
- [ ] All five diplomatic actions are implemented
- [ ] `proposeAlliance` fails (returns `accepted: false`) when trust is below threshold
- [ ] `breakAlliance` produces side effects: trust penalty with all observing factions
- [ ] `tradeSpice` increases trust by a small amount; repeated trading grows trust over time
- [ ] `declareWar` sets `war: true` on both sides; trust drops significantly
- [ ] `demandTribute` fails when `fear < TRIBUTE_FEAR_THRESHOLD`; failed demand triggers war
- [ ] Player faction participates in all diplomatic actions as actor or target
- [ ] `updateRelations` correctly propagates third-party side effects
- [ ] Unit tests cover all five actions including failure conditions
- [ ] TypeScript compiles without errors
