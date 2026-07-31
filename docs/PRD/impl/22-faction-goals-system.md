# 22 — Faction Goals System

## Goal

Implement the `Goal` type, goal generation logic based on current world state and strategy profile, and goal update mechanics so factions pursue concrete, evolving objectives.

## Prerequisites

Task 21 (faction strategy profiles) — strategy profile helpers must be available for goal generation weighting.

## Scope

- Implement the `Goal` union type with all four goal variants
- Implement `generateGoals(faction: Faction, world: WorldState): Goal[]` — produces a prioritized list of goals based on the faction's strategy profile and current world state
- Implement `updateGoals(faction: Faction, world: WorldState): Goal[]` — replaces or adjusts the faction's goal list when world state changes (e.g., a controlled region is lost, an ally is eliminated)
- Implement `scoreGoal(goal: Goal, faction: Faction, world: WorldState): number` — assigns priority scores to goals so the AI can rank competing objectives
- Goals are capped at a configurable maximum per faction (default: 3 active goals)

## Out of scope

- Executing goals — this task defines what goals exist, not how actions are dispatched
- Diplomacy actions (task 23)
- Territory capture mechanics (task 24)
- LLM-driven goal generation (task 30)

## Key types / interfaces

```ts
type RegionId = string
type FactionId = string

type Goal =
  | { type: "control_spice"; target: RegionId }
  | { type: "ally"; target: FactionId }
  | { type: "destroy"; target: FactionId }
  | { type: "expand"; target: number }  // target = minimum region count threshold

type WorldState = {
  factions: Faction[]
  regions: Region[]
  turn: number
}

function generateGoals(faction: Faction, world: WorldState): Goal[]
// Derives goals from strategy profile:
// - High greed → control_spice goals targeting rich, poorly-defended regions
// - High aggression + sufficient troops → destroy goals against weak factions
// - High diplomacy → ally goals toward complementary-profile factions
// - expand goals when faction.regions.length < expansion threshold

function updateGoals(faction: Faction, world: WorldState): Goal[]
// Called when a significant world event affects this faction
// Removes goals that are no longer achievable
// Adds goals in response to new threats or opportunities

function scoreGoal(goal: Goal, faction: Faction, world: WorldState): number
// Returns 0.0–1.0 priority score
// Higher score = more urgent / aligned with current strategy
```

## File locations

- Create: `src/engine/faction/goals.ts`
- Update: `src/types/faction.ts` (add `Goal` type export)
- Do not modify faction data JSON or strategy profile module

## Acceptance criteria

- [ ] All four `Goal` variants are implemented and exported
- [ ] `generateGoals` returns at least 1 goal for each of the 5 faction types given a minimal world state
- [ ] Harkonnen generates `control_spice` goals prioritizing high-yield regions
- [ ] Fremen generate `ally` goals before `destroy` goals
- [ ] Smugglers do not generate `destroy` goals (aggression too low)
- [ ] Emperor generates goals only when faction power imbalance threshold is exceeded
- [ ] `updateGoals` removes goals for eliminated factions or lost regions
- [ ] Goal list is capped at configured maximum (default 3)
- [ ] `scoreGoal` returns higher scores for goals aligned with the faction's dominant strategy axis
- [ ] Unit tests cover goal generation for all 5 faction types
- [ ] TypeScript compiles without errors
