# Stage 21 — Balance and playtest

**Phase:** 3 · **Depends on:** 19, 20 · **Est. tasks:** 4 · **Builder:** Claude + user
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

Make the complete game survivable, winnable, and tense in between. A 4–6 hour game
cannot be balanced by playing it repeatedly, so most of this has to be simulation.

## Headless simulation harness

The engine is pure and deterministic, which makes this cheap. Build a harness that runs
a full game without a renderer under scripted strategies, and report:

- spice income and quota coverage per cycle
- patience trajectory
- days spent at each act
- win/loss outcome and cause

Strategies to run: optimal, greedy-harvest, ecology-focused, military-focused, and
deliberately naive. Naive should lose; optimal should win with room; the middle three
should all be viable but different.

## Invariants to assert

1. **From patience 1, full mobilisation must survive two more cycles.** This is the
   design's central promise of recoverability — assert it directly.
2. Every act is completable from a reasonable state entering it.
3. No strategy wins without engaging the story, because charisma gates expansion.
4. The Act 4 impossible quota is genuinely just out of reach across a spread of live
   states — not trivially payable, not absurd.
5. Both endings are reachable; neither is strictly dominant.

## Human playtest

Simulation cannot tell you whether it is fun. At least one full human playthrough of the
Act 1 slice and one of the complete game, watching for: the first genuinely hard
decision, the first moment of boredom, and anything the player misunderstands.

**Fun bar from the design:** at least one real dilemma per quota cycle.

## Difficulty

Verify the existing easy/normal/hard multipliers still produce three distinct
experiences at the complete game's scale, rather than three speeds of the same one.
