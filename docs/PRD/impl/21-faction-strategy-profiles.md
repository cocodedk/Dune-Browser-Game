# 21 — Faction Strategy Profiles

## Goal

Implement the `StrategyProfile` type and personality system so that each faction has fixed personality modifiers that drive AI decision weights.

## Prerequisites

Task 20 (faction types data) — faction data JSON and types must exist.

## Scope

- Implement `getStrategyModifier(faction: Faction, decisionType: DecisionType): number` — returns a weight multiplier for a given decision type based on the faction's strategy profile
- Implement `dominant strategy` helper that returns the faction's highest-weighted profile value and its corresponding label (e.g., `{ axis: "aggression", value: 90 }`)
- Add per-instance variation support: optional `personalityVariance` field that applies a small random offset (±10) to each profile value at faction creation time, preventing identical-feeling factions of the same type
- Strategy profiles are read-only at runtime — they are personality constants, not mutable stats

## Out of scope

- Goal generation logic (task 22)
- Diplomacy actions (task 23)
- Any LLM integration
- UI display of strategy profiles

## Key types / interfaces

```ts
type DecisionType =
  | "attack"
  | "negotiate"
  | "expand"
  | "accumulate"
  | "defend"

type StrategyProfile = {
  aggression: number    // 0–100
  diplomacy: number     // 0–100
  expansion: number     // 0–100
  greed: number         // 0–100
  loyaltyFocus: number  // 0–100
}

// Maps decision types to relevant profile axes
const DECISION_WEIGHTS: Record<DecisionType, keyof StrategyProfile> = {
  attack:      "aggression",
  negotiate:   "diplomacy",
  expand:      "expansion",
  accumulate:  "greed",
  defend:      "loyaltyFocus",
}

function getStrategyModifier(faction: Faction, decision: DecisionType): number
// Returns value 0.0–1.0 (normalized from 0–100 profile value)

function getDominantStrategy(profile: StrategyProfile): {
  axis: keyof StrategyProfile
  value: number
}
```

## File locations

- Create: `src/engine/faction/strategy-profiles.ts`
- Update: `src/types/faction.ts` (add `DecisionType` if not present)
- Do not modify `src/data/factions.json` — this task adds behavior, not data

## Acceptance criteria

- [ ] `getStrategyModifier` returns normalized values between 0.0 and 1.0
- [ ] `getStrategyModifier` maps each `DecisionType` to the correct `StrategyProfile` axis
- [ ] `getDominantStrategy` returns the highest-value axis for a given profile
- [ ] Harkonnen faction returns highest modifier for `"attack"` decisions
- [ ] Fremen faction returns highest modifier for `"defend"` decisions
- [ ] Smugglers faction returns highest modifier for `"accumulate"` decisions
- [ ] Optional personality variance applies offsets within ±10 of base values
- [ ] Profile values are never mutated at runtime — functions are pure
- [ ] Unit tests cover all 5 faction types for all decision types
- [ ] TypeScript compiles without errors
