// src/ui/crewCardHelpers.ts
// Pure display helpers for CrewCard.tsx, split out only to keep that file
// under the repository's 200-line cap (chunk W3d).

import { harvestYield } from '../game-engine/troops/harvest'
import { effectiveDensity, extractionTier } from '../game-engine/troops/types'
import { previewYieldRange, type YieldRange } from '../game-engine/troops/harvestRecommendation'
import type { TroopGroup, SpiceField, Equipment } from '../game-engine/troops/types'
import { canSeeDensity, type PrescienceLevel } from '../game-engine/prescience/prescience'
import { isRegionDiscovered } from '../game-engine/prescience/regionDiscovery'
import type { Village } from '../types'

export function tierFor(group: TroopGroup, equipment: Equipment[]) {
  return extractionTier(equipment.filter(e => e.groupId === group.id).map(e => e.kind))
}

export function rateFor(group: TroopGroup, field: SpiceField | undefined, equipment: Equipment[]): number {
  if (!field || group.task !== 'harvest') return 0
  return harvestYield({
    tier: tierFor(group, equipment),
    density: effectiveDensity(field),
    size: group.size,
    spiceSkill: group.skills.spice,
    morale: group.morale,
  })
}

/** Region is not itself markable "discovered" — this composition is shared
 *  between the current-order readout and every field button's tooltip. */
export function densityKnown(field: SpiceField, level: PrescienceLevel, villages: readonly Village[]): boolean {
  return canSeeDensity(level, isRegionDiscovered(field.regionId, villages))
}

/** previewYieldRange, pre-filled from a group + candidate field pair. */
export function rangeFor(group: TroopGroup, field: SpiceField, equipment: Equipment[]): YieldRange {
  return previewYieldRange({
    tier: tierFor(group, equipment),
    size: group.size,
    spiceSkill: group.skills.spice,
    morale: group.morale,
    remainingFraction: field.remaining / Math.max(1, field.capacity),
  })
}
