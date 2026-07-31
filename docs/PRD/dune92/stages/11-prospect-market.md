# Stage 11 — Prospecting and the smuggler market

**Phase:** 1 · **Depends on:** 10 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Close the Act 1 loop. Prospecting turns exploration into an economic decision, and the
market turns spice into capability — which is what makes the quota a dilemma rather
than a treadmill.

**This stage completes the Act 1 vertical slice's engine.**

## Prospecting

A group task requiring a thopter, targeting a region.

```
P(find)/day = min(0.35, 0.08 + prospectSkill×0.002 + regionRichness×0.001)
```

×1.5 with the prospector character assigned. Find table:

| Roll | Result |
|---|---|
| 70% | New spice field, density 30–90 weighted by region richness |
| 15% | Nothing, but +3 prospect skill |
| 10% | Equipment cache — a random tier-1 or tier-2 item |
| 5% | Hidden sietch revealed |

A region is exhausted after 3 finds; mark it clearly in the UI so the player redirects
rather than grinding a dead region.

All rolls injectable for deterministic tests.

## Smuggler market

At the smuggler den location. Act 1 inventory:

| Item | Price |
|---|---|
| Harvester | 100 |
| Thopter | 80 |
| Intel (reveals a field or location) | 30–60 |

Purchases deliver to the den and must be transported — or make delivery immediate to
the player's current sietch if the transport step proves tedious in playtest. Note the
decision in this file when it is made.

`smugglerStanding` increments per purchase; tier-3 stock unlocks at standing ≥2 in
Act 3.

## Balance check — the slice's central dilemma

At the Act 1 tuning, buying a harvester (100) around day 10 should make Q2 (250) tight
but achievable, and Q3 (450) comfortable. Skipping the harvester should make Q3
**unreachable**. If Q2 is payable without the harvester and Q3 still lands, the capex
decision has no teeth — retune upward.

Write this as a simulation test: run the engine headless for 24 days under two
strategies (buy versus hoard) and assert the outcomes differ in the intended direction.
That test is the slice's real acceptance criterion.

## Acceptance criteria

1. Find probabilities match the formula under an injected roll; the find table
   distributes correctly over 1,000 seeded rolls.
2. A region locks out after 3 finds and says so in the UI.
3. Purchases debit spice, cannot overdraw, and grant the item.
4. The buy-versus-hoard simulation test passes and demonstrates the intended divergence.
5. A full slice playthrough is possible: land → pledge → harvest → pay Q1 → beat →
   third pledge → buy harvester → prospect → discover → pay Q2 → pay Q3 → Act 2.

## Out of scope

Advances and debt (cut list). Tier-3 stock.

## Gate

Standard. Claude additionally plays the full slice in the browser end to end before
this stage is VERIFIED.
