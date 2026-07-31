# 26 — Reputation System

## Goal

Track player reputation with each faction, feed player actions into AI faction decisions, implement reputation decay over time, and expose a UI indicator of current standing.

## Prerequisites

Task 23 (diplomacy system) — the `Relation` type and trust/fear model must exist, as reputation is expressed through the player's relation values with each faction.

## Scope

- Implement `applyPlayerAction(action: PlayerAction, world: WorldState): WorldState` — translates player game actions into reputation changes across relevant factions
- Implement `decayReputation(world: WorldState): WorldState` — slowly moves reputation toward neutral over time; extreme values decay slower than moderate values
- Implement `getReputationStanding(factionId: FactionId, world: WorldState): ReputationStanding` — returns a human-readable standing label and numeric value for UI display
- Define the complete `PlayerAction` type covering all player behaviors that should affect reputation
- Expose `getReputationSummary(world: WorldState): ReputationSummary` for the UI component

## Out of scope

- The UI component itself (renderer task)
- Diplomatic actions the player takes directly (those go through task 23's `applyDiplomaticAction`)
- Battle reputation effects (those are triggered by task 25's `applyBattleResult`)

## Key types / interfaces

```ts
type PlayerAction =
  | { type: "help_village"; factionAffinity: FactionId }
  | { type: "hoard_spice"; amount: number }
  | { type: "ignore_attack"; victimFaction: FactionId }
  | { type: "attack_faction"; target: FactionId }
  | { type: "honor_agreement"; partner: FactionId }
  | { type: "break_agreement"; partner: FactionId }
  | { type: "trade_with_faction"; target: FactionId; amount: number }

// Reputation effects by action (from design doc):
// help_village → +Fremen trust (+15)
// hoard_spice → +Smuggler interest (+10 trust), +Harkonnen attention (+5 fear player)
// ignore_attack → -Loyalty/Atreides trust (-10), -Fremen trust (-8)
// attack_faction → -Trust with target (-20), +Fear with target (+15), +Trust with rivals (+5)
// honor_agreement → +Trust with partner (+10), +global loyalty reputation (+3 all factions)
// break_agreement → -Trust with partner (-25), -global loyalty reputation (-5 all factions)

type ReputationStanding =
  | "revered"       // trust > 75
  | "trusted"       // trust 40–75
  | "neutral"       // trust -20 to 39
  | "suspicious"    // trust -50 to -21
  | "hostile"       // trust < -50

type ReputationSummary = {
  factions: Array<{
    factionId: FactionId
    name: string
    standing: ReputationStanding
    trust: number
    fear: number
  }>
}

function applyPlayerAction(action: PlayerAction, world: WorldState): WorldState
function decayReputation(world: WorldState): WorldState
function getReputationStanding(factionId: FactionId, world: WorldState): ReputationStanding
function getReputationSummary(world: WorldState): ReputationSummary
```

## File locations

- Create: `src/engine/faction/reputation.ts`
- Update: `src/types/faction.ts` (add `PlayerAction`, `ReputationStanding`, `ReputationSummary`)
- The UI component that reads `ReputationSummary` is a separate renderer task — this task only provides the data layer

## Acceptance criteria

- [ ] All six player action types produce the correct trust/fear changes per the design table
- [ ] `help_village` increases Fremen trust by the defined amount
- [ ] `attack_faction` reduces target trust, increases target fear, and gives small trust boost to rivals
- [ ] `break_agreement` applies global loyalty penalty across all factions
- [ ] `decayReputation` moves values toward 0 each cycle; decay is slower beyond ±75
- [ ] `getReputationStanding` returns correct label for all trust ranges
- [ ] `getReputationSummary` returns all 5 factions with their current standing
- [ ] AI factions can read player trust/fear to adjust diplomatic behavior (integration with task 23)
- [ ] Unit tests cover all six action types and reputation decay
- [ ] TypeScript compiles without errors
