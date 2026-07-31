// src/data/spiceFields.ts
// Act 1 spice fields. Two start discovered so the player can begin harvesting
// immediately; the rest are prospecting rewards.
//
// Capacity is density x 8, so a rich field is also a deep one — but every
// field runs out, which is what pushes the player to keep exploring.

import type { SpiceField } from '../game-engine/troops/types'

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

export const INITIAL_SPICE_FIELDS: SpiceField[] = [
  // Known from the start — the opening income.
  makeField('field_tabr_shallows', 'sietch_tabr', 45, true, { x: 180, y: 400 }),
  makeField('field_red_wall_pan', 'red_wall_sietch', 55, true, { x: 90, y: 300 }),

  // Found by prospecting.
  makeField('field_cielago_deep', 'cielago_depression', 80, false, { x: 540, y: 470 }),
  makeField('field_tsimpo_drift', 'tsimpo', 35, false, { x: 400, y: 330 }),
  makeField('field_hagg_basin', 'hagg', 65, false, { x: 150, y: 100 }),
]
