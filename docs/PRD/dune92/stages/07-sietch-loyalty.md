# Stage 07 — Sietch loyalty, pledge, and gifts

**Phase:** 1 · **Depends on:** 06 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Rework the existing pledge skeleton into the real loyalty economy. Pledging becomes
something you earn through visits, dialogue, and gifts, rather than a single free click.

## Model

Extend `SietchState` (see `01-design-systems.md` §3):

```ts
locationId: LocationId
naibId: CharacterId
population: number      // 40–400
loyalty: number         // 0–100
morale: number          // 0–100
pledged: boolean
troopGroupIds: string[] // populated in Stage 08
inventory: EquipmentId[]
waterReserve: number    // 0–500
lastVisitedDay: number
giftedThisVisit: number
```

## Loyalty rules

- Pledging requires `loyalty >= 60` **and** `pledgedCount < floor(charisma/10)`.
  Charisma arrives in Stage 10; until then read it from `player.charisma`, seeded at 20.
- A gift of 20 spice grants +8 loyalty, capped at +24 per visit (`giftedThisVisit`
  resets on arrival).
- Dialogue choices adjust loyalty through the existing `loyaltyDelta` effect.
- Decay: −1/day when unvisited for 10 days, scaled by the existing
  `reputationDecayMultiplier` from `difficulty.ts`.
- Below 30 a pledged sietch **unpledges** and fires an event. This must be recoverable —
  do not also zero its troop groups.

## Morale rules

Drifts toward 50 at ±2/day. Player visit +10 with a 5-day cooldown; new equipment
issued +5; raid suffered −15 (Stage 15); a missed quota −5 globally (Stage 09);
region vegetation ≥30 sets a +10 floor (Stage 16).

Morale multiplies all task output as `M = 0.4 + 0.006 × morale`, range 0.4–1.0. Put `M`
in one exported pure helper — every task in Stage 08 and beyond must use it, and a
duplicated formula here will drift.

## Structure

Keep the existing split: pure rules in `src/game-engine/sietch/`, world mutation in
`SietchSystem.ts`. The existing `assignTask.ts` and `updateSietches.ts` tests are a good
model — match their density.

New pure modules: `loyalty.ts` (gift, decay, pledge eligibility, unpledge threshold) and
`morale.ts` (drift, events, the `M` multiplier), each with its own test file.

## Acceptance criteria

1. Pledging is refused below 60 loyalty and above the charisma cap, with a distinct
   player-visible reason for each.
2. Gift caps at +24 per visit and the cap resets on the next arrival.
3. Decay only applies after 10 unvisited days and respects the difficulty multiplier.
4. Dropping below 30 unpledges, fires an event, and is recoverable by re-earning
   loyalty — covered by a test that pledges, decays to unpledge, then re-pledges.
5. The `M` multiplier is defined exactly once and exported.
6. `SietchCommandSection.tsx` reflects loyalty, morale, and the pledge gate. It is
   **already at exactly 200 lines** — it will need splitting, not extending.

## Out of scope

Troop groups and tasks — Stage 08.

## Gate

Standard.
