// src/game-engine/troops/harvestRecommendation.ts
// PURE Beat 5 helpers (docs/PRD/game-completion/03-opening-experience.md
// "Teaching sequence" Beat 5): which known field a fresh crew should work,
// and what it might yield there before any order is confirmed.

import { harvestYield } from './harvest'
import type { SpiceField, ExtractionTier } from './types'

/**
 * The two ends of `SpiceField.density`'s own authored bound (types.ts:
 * "Initial richness, 10-95"). previewYieldRange uses these — never a
 * field's real density — so the range can never leak the exact number the
 * knowledge gate (canSeeDensity, prescience/prescience.ts) is hiding.
 */
export const MIN_AUTHORED_DENSITY = 10
export const MAX_AUTHORED_DENSITY = 95

export interface Position {
  x: number
  y: number
}

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * The nearest discovered, non-empty field to `from` — the ONE recommended
 * field 03 asks for, not a ranked list. Null when nothing qualifies (every
 * discovered field worked out, or none discovered yet).
 */
export function recommendedField(
  from: Position,
  fields: readonly SpiceField[],
): SpiceField | null {
  const candidates = fields.filter(f => f.discovered && f.remaining > 0)
  if (candidates.length === 0) return null

  let best = candidates[0]
  let bestDistance = distance(from, best.position)
  for (const field of candidates.slice(1)) {
    const d = distance(from, field.position)
    if (d < bestDistance) {
      best = field
      bestDistance = d
    }
  }
  return best
}

export interface YieldRangeInputs {
  tier: ExtractionTier
  size: number
  spiceSkill: number
  morale: number
  /**
   * `field.remaining / field.capacity` — the one part of effective density
   * a player can already see (CrewPanel shows "remaining" directly), unlike
   * the field's raw density, which stays hidden. Narrows the bracket as a
   * field depletes without revealing the number that is doing the work.
   */
  remainingFraction: number
}

export interface YieldRange {
  min: number
  max: number
}

/**
 * Projected daily yield bracket for a crew NOT YET assigned to `field` (03
 * Beat 5: "a projected daily yield range; exact density remains hidden").
 * Computed at the field's own authored density bounds rather than its real
 * density, scaled by the visible remaining/capacity fraction — the same
 * effectiveDensity shape (troops/types.ts) minus the one hidden input.
 */
export function previewYieldRange(inputs: YieldRangeInputs): YieldRange {
  const { tier, size, spiceSkill, morale, remainingFraction } = inputs
  const fraction = Math.max(0, Math.min(1, remainingFraction))
  const base = { tier, size, spiceSkill, morale }

  return {
    min: harvestYield({ ...base, density: MIN_AUTHORED_DENSITY * fraction }),
    max: harvestYield({ ...base, density: MAX_AUTHORED_DENSITY * fraction }),
  }
}
