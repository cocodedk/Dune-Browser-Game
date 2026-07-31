# 05 — Village and Spice

## Goal

Villages produce spice over time and have a loyalty value that affects their status.

## Input

- Task 02 complete (`Village` type and `updateVillages()` stub exist)
- Task 03 complete (time system triggers `updateVillages()` each day)

## Scope (PoC only — keep it small)

- Implement `updateVillages(world: World): void` in `src/game-engine/villages.ts`
- Each village produces spice each day:
  ```ts
  village.spice += productionRate * (village.loyalty / 100)
  ```
- Hardcode `productionRate = 10` for PoC
- Update village `status` based on loyalty:
  ```ts
  if (village.loyalty >= 60) village.status = "friendly"
  else if (village.loyalty <= 20) village.status = "rebelling"
  else village.status = "neutral"
  ```
- Log spice totals to console each day (development visibility)

**Hardcoded starting values (PoC):**
```ts
// All three villages start with:
spice: 0
loyalty: 50
status: "neutral"
population: 500
```

**Village type (complete):**
```ts
type Village = {
  id: string
  name: string
  population: number
  spice: number
  loyalty: number     // 0–100, clamped
  status: "neutral" | "friendly" | "rebelling"
  productionRate: number  // spice per day at full loyalty
}
```

## Out of Scope (don't build yet)

- Player actions that affect loyalty (task 06)
- Faction attack effects on villages (task 07)
- Village trade or resource exchange
- Population growth or decline
- Events that modify production rates

## Key Types / Interfaces

See `Village` type above — replace stub in `src/game-engine/types.ts`.

## Acceptance Criteria

- [ ] `updateVillages()` is called once per game day (not every frame)
- [ ] `village.spice` increases each day
- [ ] Console output shows spice values increasing over time
- [ ] Village `status` updates correctly when loyalty crosses thresholds (60 / 20)
- [ ] Loyalty is clamped to `[0, 100]` — never exceeds bounds
- [ ] All 3 villages update independently

## Timebox

2–4 hours
