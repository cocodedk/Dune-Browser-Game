# Stage 15 — Combat, raids, and training

**Phase:** 3 · **Depends on:** 11 · **Est. tasks:** 4 · **Builder:** Sonnet
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

Turn the Harkonnen from a narrative rumour into a clock the player has to answer.

## Sketch

- The **train** task: military skill +2/day, +4 with the captain stationed, +1 more with
  sonic disruptors. Cap 70 without the captain, 100 with. Costs −1 morale/day unless the
  player visits during the cycle.
- Skill thresholds: ≥40 garrison, ≥60 raid forts, ≥80 elite first strike.
- Combat resolution per `01-design-systems.md` §4: `power = Σ size × (military/100) × W`,
  W = 1.0 krys and 1.8 disruptors, defender ×1.3, losses scaled by the power ratio, with
  deterministic ±10% noise.
- The raid clock: every 6 days in Act 2 at power `60 + 8×daysIntoAct`, scaled by the
  existing `aiAggressionMultiplier`. Act 3 moves to every 4 days and targets harvest
  crews in the field, not only sietches.

## Reuse

The existing `CombatSystem.ts` has the right shape — an injectable roll and a clean
pure core with good tests. Extend it rather than starting over; retire the old
`attackVillage` single-roll model.

## Open questions for the spec pass

- Does the player watch a raid resolve, or read the outcome? A raid the player cannot
  influence is a tax, not a decision.
- Can troops be repositioned defensively in advance, and if so, how is that surfaced
  without a full RTS interface?
