# Stage 08 — Troop groups, harvesting, and spice fields

**Phase:** 1 · **Depends on:** 07 · **Est. tasks:** 4 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

The economic core. Replace the current threshold/payout skeleton with real troop groups
working depletable spice fields, using equipment, at rates that morale and skill
modulate. Everything downstream depends on these numbers.

## Models

`TroopGroup`, `Equipment`, and `SpiceField` exactly as specified in
`01-design-systems.md` §3. Put them in `src/game-engine/troops/types.ts` and
`src/game-engine/fields/types.ts`; do not grow `src/types.ts` past 200 lines (it is at
199 today — this stage must split it).

## Group lifecycle

Each pledged sietch spawns 1–3 groups at `size = population/6`, skills rolled 20–40 and
weighted by sietch flavour. Skills grow +1/day at the matching task, capped at 70
without a tutor character. A group below size 10 merges back into its home sietch.

Reassigning a task costs a **1-day changeover** during which the group produces nothing.
Minimum group size to hold a task is 15.

## Harvest formula

```
yield/day = E × (density/60) × clamp(size/30, 0.3, 2.0) × (0.5 + spiceSkill/100) × M
E = 6 hand | 20 harvester | 34 heavy harvester
```

**Tuning references — assert these as tests**, because the whole economy is calibrated
against them:

- hand crew, size 30, skill 40, morale 70, density 60 → **≈ 4.5/day**
- the same crew with a harvester → **≈ 15/day**

Worm risk: a harvester crew with no thopter on site rolls 5%/day to lose 20% of the
group and 30 harvester condition. With a thopter, 1% and no equipment loss. The roll
must be injectable so tests are deterministic — follow the existing `CombatSystem.ts`
pattern of taking a roll parameter.

## Field depletion

Harvesting reduces `field.remaining`. Effective density is
`initialDensity × remaining/capacity`, so yields taper rather than cliff — the player
should feel a field dying before it dies.

## Payout

Continuous daily accrual to the player's spice stock, replacing the
threshold-and-payout model in `updateSietches.ts`. Keep the existing
`spice_shipment_received` event as the daily notification so the event log keeps working.

## Equipment

This stage needs three kinds only: `harvester`, `thopter`, `krys`. Equipment is held by
a sietch (`locationId`) or carried by a group (`groupId`) — never both. Assigning
equipment already held by another group must be rejected, not silently duplicated.

Condition decay is **out of scope** for the Act 1 slice (see the cut list); model the
field but do not tick it.

## UI

A task assignment panel: pick a group, a task, a target field, and equipment. This is
the most complex UI in the slice — expect to split it across three or four components
to stay under 200 lines each.

## Acceptance criteria

1. Both tuning references above pass as tests, within ±0.2.
2. A field's yield tapers as it depletes and reaches zero without going negative.
3. Changeover costs exactly one day of zero output.
4. Equipment cannot be double-assigned.
5. Worm risk is deterministic under an injected roll and fires at the specified rates.
6. `src/types.ts` is under 200 lines after the split.
7. A group reduced below 10 merges home without losing its equipment.

## Out of scope

Prospecting (Stage 11), training and ecology (Stages 15–16), condition decay.

## Gate

Standard.
