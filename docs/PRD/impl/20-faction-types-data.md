# 20 — Faction Types Data

## Goal

Create `src/data/factions.json` with all 5 faction definitions including id, name, type, initial strategy profile values, initial resources, and starting relations.

## Prerequisites

Impl task 12 (data JSON files) must be complete — the `src/data/` directory and data loading conventions must exist.

## Scope

- Create `src/data/factions.json` with entries for all 5 faction types: Fremen, Harkonnen, Atreides, Smugglers, Emperor
- Each entry includes: `id`, `name`, `type`, `resources` (starting values), `strategy` (profile values), `relations` (initial trust and fear per other faction)
- Types must be used consistently across the codebase (see Key types below)

## Out of scope

- AI behavior logic — this task is data only
- Any runtime goal generation or goal state
- LLM integration
- Any UI displaying faction data

## Key types / interfaces

```ts
type FactionId = string

type Resources = {
  spice: number
  solaris: number
  troops: number
  influence: number
}

type StrategyProfile = {
  aggression: number    // 0–100
  diplomacy: number     // 0–100
  expansion: number     // 0–100
  greed: number         // 0–100
  loyaltyFocus: number  // 0–100
}

type Relation = {
  trust: number    // -100 to +100
  fear: number     // 0 to 100
  trade: boolean
  war: boolean
}

type Faction = {
  id: FactionId
  name: string
  type: "fremen" | "house" | "empire" | "smuggler"
  resources: Resources
  strategy: StrategyProfile
  relations: Record<FactionId, Relation>
  goals: Goal[]  // empty array at init — populated by goals system (task 22)
}
```

**Reference strategy values (from design doc):**

| Faction    | Aggression | Diplomacy | Expansion | Greed | Loyalty |
|------------|-----------|-----------|-----------|-------|---------|
| Harkonnen  | 90        | 10        | 70        | 85    | 20      |
| Fremen     | 40        | 60        | 30        | 30    | 90      |
| Atreides   | 25        | 85        | 50        | 40    | 80      |
| Smugglers  | 20        | 80        | 40        | 95    | 30      |
| Emperor    | 60        | 50        | 20        | 50    | 60      |

## File locations

- Create: `src/data/factions.json`
- Create or update: `src/types/faction.ts` (export all types above)
- Do not modify game engine or renderer files

## Acceptance criteria

- [ ] `src/data/factions.json` exists and is valid JSON
- [ ] All 5 factions are present: `fremen`, `harkonnen`, `atreides`, `smugglers`, `emperor`
- [ ] Each faction has `id`, `name`, `type`, `resources`, `strategy`, `relations`, `goals`
- [ ] `type` values match the union: `"fremen" | "house" | "empire" | "smuggler"`
- [ ] All 5 `StrategyProfile` values are within 0–100 range
- [ ] Each faction's `relations` contains entries for all other factions with initial trust and fear values
- [ ] `src/types/faction.ts` exports `Faction`, `FactionId`, `Resources`, `StrategyProfile`, `Relation` types
- [ ] TypeScript compiles without errors when types are imported
