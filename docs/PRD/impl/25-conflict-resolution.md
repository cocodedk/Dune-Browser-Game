# 25 — Conflict Resolution

## Goal

Implement an abstract battle resolver (`resolveBattle`) that determines territory control outcomes without micromanagement, using faction power derived from resources and strategy profile.

## Prerequisites

Task 24 (territory control) — `Region` and capture mechanics must exist, as battle outcomes feed directly into `captureRegion`.

## Scope

- Implement `resolveBattle(attacker, defender, region, world): BattleResult` — abstract outcome resolution using faction power and a controlled random factor
- Implement `getFactionPower(faction: Faction, context: BattleContext): number` — computes effective combat strength from resources, strategy profile, and contextual modifiers (home defense, alliance support)
- Implement `applyBattleResult(result: BattleResult, world: WorldState): WorldState` — updates world state: transfers territory on attacker victory, reduces troops on both sides, emits events
- Random factor must be bounded (±15%) so stronger factions win reliably but upsets are possible
- No unit movement, no turn-based tactical layer — all conflict is one function call with a result

## Out of scope

- Reputation effects of battles (task 26)
- Difficulty bonuses applied to battle (task 27 provides `DifficultyConfig` that is consumed here but not defined here)
- LLM-narrated battle events (task 30)
- Any visual battle representation

## Key types / interfaces

```ts
type BattleOutcome = "attacker_wins" | "defender_wins" | "stalemate"

type BattleResult = {
  outcome: BattleOutcome
  regionId: RegionId
  attacker: FactionId
  defender: FactionId
  attackerLosses: number   // troops lost
  defenderLosses: number
}

type BattleContext = {
  regionId: RegionId
  isHomeTerritory: boolean  // defender bonus if true
  alliedSupport: FactionId[]  // factions contributing power to this side
}

function getFactionPower(faction: Faction, context: BattleContext): number
// Base: faction.resources.troops
// × getStrategyModifier(faction, "attack" | "defend")  // from task 21
// × 1.2 if isHomeTerritory (defender only)
// + allied power contribution (10% of each ally's troops)

function resolveBattle(
  attacker: Faction,
  defender: Faction,
  region: Region,
  world: WorldState
): BattleResult
// attackPower = getFactionPower(attacker, attackerContext)
// defendPower = getFactionPower(defender, defenderContext)
// randomFactor = 0.85 + Math.random() * 0.3  // 0.85–1.15
// net = attackPower * randomFactor - defendPower
// outcome: net > threshold → attacker_wins; net < -threshold → defender_wins; else stalemate

function applyBattleResult(result: BattleResult, world: WorldState): WorldState
// On attacker_wins: calls captureRegion(result.regionId, result.attacker, world)
// On defender_wins: no territory change, attacker loses more troops
// On stalemate: both sides lose troops, territory unchanged
// Always: deduct troop losses from both sides
```

## File locations

- Create: `src/engine/faction/conflict.ts`
- Update: `src/types/faction.ts` (add `BattleResult`, `BattleOutcome`, `BattleContext` exports)
- Import `captureRegion` from territory module — do not duplicate territory logic

## Acceptance criteria

- [ ] `resolveBattle` compiles and runs without external services
- [ ] A faction with 10x more troops wins 90%+ of the time across 100 simulated battles
- [ ] Random factor is bounded: never below 0.85× or above 1.15×
- [ ] Defender home territory bonus is consistently applied
- [ ] Allied support contributes to power calculation
- [ ] `applyBattleResult` calls `captureRegion` on attacker victory
- [ ] Troop losses are applied to both sides on all outcomes
- [ ] Stalemate outcome occurs and does not transfer territory
- [ ] Unit tests cover: attacker wins, defender wins, stalemate, home territory bonus, allied support
- [ ] TypeScript compiles without errors
