# 24 — Territory Control

## Goal

Implement the `Region` type with owner tracking, territory capture mechanics, unrest accumulation, and spice production tied to territory ownership.

## Prerequisites

Task 23 (diplomacy system) — the `FactionId` and faction relation system must exist, as territory changes trigger diplomatic events and reputation updates.

## Scope

- Implement the `Region` type with `id`, `owner`, `spice`, and `unrest` fields
- Implement `captureRegion(regionId, newOwner, world): WorldState` — transfers ownership, applies unrest spike, notifies displaced faction
- Implement `accumulateUnrest(region: Region, world: WorldState): Region` — increases `unrest` based on occupation pressure, extraction intensity, and diplomatic conditions
- Implement `produceSpice(region: Region): number` — calculates spice yield for one cycle; yield scales with region's `spice` value and decays with high `unrest`
- Implement `processRegionDefection(region: Region, world: WorldState): WorldState` — if `unrest >= 100`, region defects: owner loses it, it becomes contested or joins nearest friendly faction
- Implement `getFactionRegions(factionId: FactionId, world: WorldState): Region[]` — utility to get all regions owned by a faction
- Create initial region data (`src/data/regions.json`) with at minimum 8 regions covering the map

## Out of scope

- Battle mechanics — capture happens after `resolveBattle` declares a winner (task 25)
- UI rendering of territory (renderer task, separate scope)
- LLM event generation for rebellions (task 30)

## Key types / interfaces

```ts
type RegionId = string

type Region = {
  id: RegionId
  name: string
  owner: FactionId | null   // null = unclaimed / contested
  spice: number             // base extraction yield per cycle (0–100)
  unrest: number            // 0–100; at 100, defection triggers
}

// Unrest sources (additive per cycle):
// +5 per cycle if occupied by non-owner troops
// +3 per cycle if owner has war: true with majority of neighbors
// +2 per cycle if spice extraction is above 70% of capacity
// -2 per cycle if owner has trade: true and trust > 50 with region's prior faction

type TerritoryEvent =
  | { type: "region_captured"; regionId: RegionId; newOwner: FactionId; prevOwner: FactionId | null }
  | { type: "region_defected"; regionId: RegionId; fromOwner: FactionId }
  | { type: "unrest_high"; regionId: RegionId; unrest: number }
```

## File locations

- Create: `src/engine/territory/territory.ts`
- Create: `src/data/regions.json` (initial map data)
- Update: `src/types/faction.ts` (add `Region`, `RegionId`, `TerritoryEvent` exports)
- Do not modify diplomacy or goals modules directly — emit events instead

## Acceptance criteria

- [ ] `Region` type is implemented and exported
- [ ] `src/data/regions.json` contains at least 8 regions with varying `spice` values
- [ ] `captureRegion` transfers ownership and emits a `region_captured` event
- [ ] `accumulateUnrest` increases unrest based on defined sources; applies per-cycle reductions when conditions are favorable
- [ ] `produceSpice` returns 0 for regions with `unrest >= 80` (rebellion suppresses extraction)
- [ ] `processRegionDefection` triggers when `unrest >= 100` and removes the region from its owner
- [ ] Faction with more regions produces more total spice per cycle
- [ ] `getFactionRegions` returns correct subset for all 5 factions
- [ ] Unit tests cover capture, unrest accumulation, defection, and spice production
- [ ] TypeScript compiles without errors
