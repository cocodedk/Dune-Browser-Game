// src/data/spiceFields.ts
// Act 1 spice fields. Two start discovered so the player can begin harvesting
// immediately; the rest are prospecting rewards.
//
// Capacity is density x 8, so a rich field is also a deep one — but every
// field runs out, which is what pushes the player to keep exploring.

import type { SpiceField } from '../game-engine/troops/types'
import { MAX_AUTHORED_DENSITY } from '../game-engine/troops/harvestRecommendation'

function makeField(
  id: string,
  regionId: string,
  density: number,
  discovered: boolean,
  position: { x: number; y: number },
): SpiceField {
  const capacity = density * 8
  return { id, regionId, position, discovered, density, capacity, remaining: capacity }
}

// WP04 chunk W4e (balance tuning, round 1): both opening densities raised —
// one leg of the combined yield lever alongside troopGroups.ts's crew-size
// floor and quota.ts's BASE_AMOUNTS[1]/[2] cut — see troopGroups.ts's own
// citation for the measured problem this answers. Both are set to
// MAX_AUTHORED_DENSITY exactly (harvestRecommendation.ts's own documented
// ceiling for SpiceField.density, "Initial richness, 10-95" — types.ts)
// rather than past it: previewYieldRange's Beat-5 yield bracket brackets at
// this same constant, and a real density above it would make that
// player-facing preview quietly understate a crew's true maximum, the same
// dishonest-preview class of defect Round 14 fixed for the settlement
// modal. Round 1 kept Tabr Shallows below Red Wall Pan's density (78 vs 95)
// to preserve their original richer/poorer order; round 2 raises Tabr to
// the same ceiling too — troopGroups.ts's own round-2 citation explains why
// (the RECOVERY probe's reassigned crew runs on Tabr Shallows after Red
// Wall Pan is hand-set exhausted, and needed the same ceiling reserve's own
// field already had).
export const INITIAL_SPICE_FIELDS: SpiceField[] = [
  // Known from the start — the opening income.
  makeField('field_tabr_shallows', 'sietch_tabr', MAX_AUTHORED_DENSITY, true, { x: 180, y: 400 }),
  makeField('field_red_wall_pan', 'red_wall_sietch', MAX_AUTHORED_DENSITY, true, { x: 90, y: 300 }),

  // Found by prospecting.
  makeField('field_cielago_deep', 'cielago_depression', 80, false, { x: 540, y: 470 }),
  makeField('field_tsimpo_drift', 'tsimpo', 35, false, { x: 400, y: 330 }),
  makeField('field_hagg_basin', 'hagg', 65, false, { x: 150, y: 100 }),
]
