// src/game-engine/prescience/regionDiscovery.ts
// Whether a region counts as "discovered" for canSeeDensity's gate.
//
// Region carries no `discovered` field of its own (see the Region interface
// in src/types.ts) — only Village does. The engine already tracks exactly
// one signal for "the player has been here": a discovered village. A region
// is discovered when a discovered village sits in it, so this derives from
// that rather than inventing a second, parallel notion of discovery that
// could drift out of sync with it.

import type { Village, RegionId } from '../../types'

export function isRegionDiscovered(regionId: RegionId, villages: readonly Village[]): boolean {
  return villages.some(v => v.discovered && v.regionId === regionId)
}
