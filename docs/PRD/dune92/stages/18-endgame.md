# Stage 18 — Acts 3–4, forts, and endings

**Phase:** 3 · **Depends on:** 17 · **Est. tasks:** 4 · **Builder:** Sonnet
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

Fill in the act machine Stage 10 left data-driven, and give the game somewhere to land.

## Sketch

**Act 3** — regions 5–6 open; four Harkonnen forts become attackable; raids every 4 days
now hit harvest crews in the field; quota ×1.5. Tier-3 equipment unlocks at smuggler
standing ≥2. Beats: the challenge duel, and the Baron's poisoned truce offer
(+1 patience, −20 Fremen loyalty — a real temptation, not a trap with a warning label).
Exits when 2 of 4 forts fall.

**Act 4** — the Emperor issues a quota computed at 2× the player's live theoretical
maximum. An explicit dialogue choice:

- **submit** — pay what you can, patience floored at 1 for 12 days, raids continue
- **defy** — quota off, 12-day countdown to a Sardaukar landing, capital fort must fall
  first

**Endings**

| Ending | Condition |
|---|---|
| `win_military` | Capital fort destroyed before the countdown expires |
| `win_ecology` | Vegetation ≥60 in three regions ∧ average pledged loyalty ≥80, at any point in Act 4 |
| `loss_patience` | Patience hits 0 |
| `loss_palace` | Palace captured |
| `loss_abandoned` | Zero pledged sietches remain |

## Note

The Act 4 impossible quota must be computed from **live** state, not a constant. A fixed
number is either trivial for a strong player or unsurvivable for a weak one, and the
scene only works if it is precisely out of reach.

## Open questions for the spec pass

- Does `win_ecology` need its own final scene, or does it share the military one?
- Is the submit branch a real path to victory, or explicitly the losing choice? If it
  cannot win, the choice is fake and the player will feel it.
