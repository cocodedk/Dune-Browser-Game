# Stage 05 — Clock pause and the Location model

**Phase:** 1 · **Depends on:** 01 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Two foundational engine changes that everything in Phase 1 builds on: time pauses
during dialogue, and `Village` becomes a richer `Location` with discovery.

May run in parallel with Stages 02–04 (renderer track) — but not with any other engine
stage, because it rewrites `types.ts`.

## Part A — clock pause

`GameLoop.update` already early-returns when `world.dialogue !== null`, which
incidentally pauses time. Make that explicit and general:

```ts
// WorldState
paused: boolean
```

Set by dialogue start/end and by an explicit pause command. `TimeSystem.tick` is the
single place that respects it. Most real playtime is reading while paused — this is how
24 game-days fill 60–90 real minutes.

Add `'game:pause': { paused: boolean }` to `BusEvents` and wire it in
`runtime/CommandWiring.ts`.

## Part B — Location model

Replace `Village` with:

```ts
export type LocationKind =
  | 'palace' | 'sietch' | 'smuggler_den' | 'fort' | 'field_camp' | 'station'

export interface Location {
  id: LocationId
  name: string
  kind: LocationKind
  position: { x: number; y: number }
  regionId: RegionId
  discovered: boolean
  knownRoutes: LocationId[]
}
```

Sietch-specific state stays in `SietchState` keyed by `locationId` — do not merge them.
`Village`'s gameplay fields (`population`, `spice`, `loyalty`, `owner`, `status`,
`productionRate`) move: ownership and loyalty to `SietchState`, spice production to the
new `SpiceField` model in Stage 08. For this stage, keep a thin compatibility shim if it
avoids touching every UI panel at once — but **delete the shim before the stage is
done**. A shim that survives the stage becomes permanent.

`VillageId` becomes `LocationId`; keep a deprecated type alias for one stage only.

## Part C — travel modes

```ts
export type TravelMode = 'foot' | 'thopter' | 'lr_thopter'
```

Travel time = distance / speed(mode), foot ×1, thopter ×3. `lr_thopter` additionally
ignores the region-range limit. Range rule: without a long-range thopter the player may
only travel to the current region and adjacent regions. Undiscovered locations are not
valid targets.

## Part D — persistence migration

Bump the IndexedDB schema version and write a **v1 → v2 migration** mapping the old
`villages: Village[]` to `locations: Location[]` plus `sietches: SietchState[]`. An
existing save must load and be playable, not silently reset.

Test the migration against a captured v1 save fixture — build the fixture from
`createInitialState()` at the current commit and check it into
`src/game-engine/__fixtures__/save-v1.json`.

## Data

`src/data/locations.ts` replaces `villages.ts` with the seven Act 1 slice locations
(see `01-design-systems.md` §10): the palace, three sietches (one hidden), the smuggler
den, and two field camps. Mark ~60% undiscovered.

## Acceptance criteria

1. Time does not advance while `paused` is true; dialogue sets and clears it.
2. Travelling to an undiscovered location is rejected by the engine, not just hidden in
   the UI.
3. Out-of-range travel without a long-range thopter is rejected.
4. A v1 save loads into a playable v2 world — covered by a test against the fixture.
5. No compatibility shim and no `VillageId` alias remain at the end of the stage.
6. Every UI panel still renders; the render layer reads `locations` not `villages`.

## Out of scope

Troop groups, spice fields, quota — Stages 08 and 09.

## Gate

Standard.
