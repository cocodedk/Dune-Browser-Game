// src/game-engine/ecology/ecology.ts
// PURE ecology rules — the long game, and the sharpest trade-off in the design.
//
// Ecology produces no spice. It competes directly with harvesting for bodies,
// and past a threshold it permanently kills the spice blows that would have
// enriched the region later. Greening Arrakis is a bet against your own
// income, and that is exactly the point.

export const GROWTH_PER_TEAM_DAY = 0.5
export const WINDTRAP_MULTIPLIER = 2
export const TEAM_SIZE = 20
export const DECAY_PER_DAY = 0.2

/** Below this, untended vegetation dies back. */
export const DECAY_THRESHOLD = 30
/** Morale floor and travel safety. */
export const SETTLED_THRESHOLD = 30
/** Loyalty floor — and spice blows stop. */
export const GREEN_THRESHOLD = 60

export const MORALE_FLOOR_BONUS = 10
export const LOYALTY_FLOOR_BONUS = 20

export const WINDTRAP_DAYS_BASE = 5
export const WINDTRAP_DAYS_SKILLED = 3

export interface RegionEcology {
  regionId: string
  vegetation: number
  windtraps: number
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/**
 * Daily vegetation change for a region.
 *
 * `workers` counts only crews actually assigned to ecology and holding a bulb
 * cache; everyone else contributes nothing, which is what makes the labour
 * cost real.
 */
export function ecologyDay(
  region: RegionEcology,
  workers: number,
  ecologySkill: number,
  hasBulbCache: boolean,
): RegionEcology {
  const teams = hasBulbCache ? Math.floor(Math.max(0, workers) / TEAM_SIZE) : 0

  if (teams === 0) {
    // Untended growth dies back, but only below the settled threshold: past
    // that the planting has taken root and holds on its own.
    if (region.vegetation >= DECAY_THRESHOLD) return region
    return { ...region, vegetation: clamp(region.vegetation - DECAY_PER_DAY) }
  }

  const skillFactor = 1 + Math.max(0, ecologySkill) / 200
  const windtrapFactor = region.windtraps > 0 ? WINDTRAP_MULTIPLIER : 1
  const growth = GROWTH_PER_TEAM_DAY * teams * skillFactor * windtrapFactor

  return { ...region, vegetation: clamp(region.vegetation + growth) }
}

/** Days to raise a windtrap, shortened by an experienced crew. */
export function windtrapBuildDays(ecologySkill: number): number {
  return ecologySkill >= 50 ? WINDTRAP_DAYS_SKILLED : WINDTRAP_DAYS_BASE
}

/** Morale floor conferred on sietches in this region. */
export function moraleFloorFor(region: RegionEcology): number {
  return region.vegetation >= SETTLED_THRESHOLD ? MORALE_FLOOR_BONUS : 0
}

/** Loyalty floor conferred on sietches in this region. */
export function loyaltyFloorFor(region: RegionEcology): number {
  return region.vegetation >= GREEN_THRESHOLD ? LOYALTY_FLOOR_BONUS : 0
}

/** Whether travel accidents can occur here. */
export function travelSafe(region: RegionEcology): boolean {
  return region.vegetation >= SETTLED_THRESHOLD
}

/**
 * Whether new spice can still blow here.
 *
 * The twist: greening a region past 60 permanently ends its spice blows. The
 * player is trading future income for loyalty and stability, and the game
 * should never soften that.
 */
export function spiceBlowsPossible(region: RegionEcology): boolean {
  return region.vegetation < GREEN_THRESHOLD
}

/** Regions counted as green for the ecology ending. */
export function greenRegionCount(regions: readonly RegionEcology[]): number {
  return regions.filter(r => r.vegetation >= GREEN_THRESHOLD).length
}

/** Highest vegetation across all regions — the Act 2 exit gate reads this. */
export function maxVegetation(regions: readonly RegionEcology[]): number {
  return regions.reduce((max, r) => Math.max(max, r.vegetation), 0)
}
