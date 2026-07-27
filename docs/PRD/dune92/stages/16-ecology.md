# Stage 16 — Ecology

**Phase:** 3 · **Depends on:** 15 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

The long game, and the sharpest trade-off in the design: greening Arrakis costs spice
income now and kills future income permanently.

## Sketch

- `RegionEcology = { regionId, vegetation: 0–100, windtraps: number }`
- +0.5 vegetation/day per active 20-worker team holding a bulb cache; ×2 with a windtrap
  in region; −0.2/day decay if untended below 30.
- Thresholds: **≥30** sets a +10 sietch morale floor in-region and disables travel
  accidents; **≥60** stops spice blows spawning there and sets a +20 loyalty floor.
- Ecology skill raises the rate by `(1 + skill/200)` and cuts windtrap build from 5 days
  to 3.

## The point

Ecology produces no spice. It competes directly with harvesting for bodies — 60 workers
on ecology is roughly 15 spice/day forgone. That competition is the design, and the
≥60 threshold killing future spice blows is the twist. Do not soften either.

Feeds the `win_ecology` ending in Stage 18.

## Open questions for the spec pass

- Does vegetation change the 3D terrain, or only the numbers? The cut list says the
  visual change goes first if scope tightens — but a greening that is invisible may not
  motivate anyone.
