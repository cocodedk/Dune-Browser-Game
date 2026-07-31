// src/game-engine/troops/harvest.ts
// PURE harvest maths. The economic core — every downstream balance decision
// (quota amounts, equipment prices, how many sietches a player needs) is
// calibrated against these numbers, so they are pinned by tests.

import { moraleMultiplier } from '../sietch/morale'
import {
  EXTRACTION_RATE,
  effectiveDensity,
  MIN_TASK_SIZE,
} from './types'
import type { ExtractionTier, SpiceField, TroopGroup } from './types'

/** Reference crew size; larger crews scale up, smaller down, both clamped. */
const REFERENCE_SIZE = 30
const SIZE_SCALE_MIN = 0.3
const SIZE_SCALE_MAX = 2.0
const REFERENCE_DENSITY = 60

/** Below this the field is swept clean rather than trickling indefinitely. */
export const EXHAUSTION_THRESHOLD = 0.5

export interface HarvestInputs {
  tier: ExtractionTier
  density: number
  size: number
  spiceSkill: number
  morale: number
}

/**
 * Spice per day for one crew.
 *
 *   yield = E x (density/60) x clamp(size/30, 0.3, 2) x (0.5 + skill/100) x M
 *
 * Skill contributes a 0.5..1.5 band rather than 0..1: a green crew is slow,
 * not useless, which keeps an early-game player from being unable to start.
 */
export function harvestYield(inputs: HarvestInputs): number {
  const { tier, density, size, spiceSkill, morale } = inputs

  if (size < MIN_TASK_SIZE) return 0
  if (density <= 0) return 0

  const extraction = EXTRACTION_RATE[tier]
  const densityFactor = density / REFERENCE_DENSITY
  const sizeFactor = Math.max(
    SIZE_SCALE_MIN,
    Math.min(SIZE_SCALE_MAX, size / REFERENCE_SIZE),
  )
  const skillFactor = 0.5 + Math.max(0, spiceSkill) / 100

  return extraction * densityFactor * sizeFactor * skillFactor * moraleMultiplier(morale)
}

export interface HarvestOutcome {
  /** Spice actually extracted — never more than the field still holds. */
  extracted: number
  field: SpiceField
}

/**
 * Run one day of harvesting against a field.
 *
 * A group in changeover produces nothing; reassignment costing a real day is
 * what makes task allocation a decision rather than a free toggle.
 */
export function harvestDay(
  group: TroopGroup,
  field: SpiceField,
  tier: ExtractionTier,
): HarvestOutcome {
  if (group.changeoverDaysLeft > 0) return { extracted: 0, field }
  if (group.task !== 'harvest') return { extracted: 0, field }

  const potential = harvestYield({
    tier,
    density: effectiveDensity(field),
    size: group.size,
    spiceSkill: group.skills.spice,
    morale: group.morale,
  })

  // Never extract more than remains; a field must not go negative.
  const extracted = Math.max(0, Math.min(potential, field.remaining))
  const remaining = field.remaining - extracted

  // Because effective density tapers with remaining/capacity, yield approaches
  // zero asymptotically and a field would never actually exhaust — it would
  // trickle spice forever. Sweep up the last dregs so a worked-out field
  // genuinely ends, and the player has to go find another one.
  if (remaining > 0 && remaining < EXHAUSTION_THRESHOLD) {
    return {
      extracted: extracted + remaining,
      field: { ...field, remaining: 0 },
    }
  }

  return { extracted, field: { ...field, remaining } }
}

/** Worm-attack probability for a harvesting crew on a given day. */
export function wormRisk(hasHarvester: boolean, hasThopter: boolean): number {
  if (!hasHarvester) return 0 // Hand crews are small and quiet enough to be ignored.
  return hasThopter ? 0.01 : 0.05
}

export interface WormOutcome {
  attacked: boolean
  /** Fraction of the group lost. */
  casualtyFraction: number
  /** Condition removed from the harvester. */
  equipmentDamage: number
}

/**
 * Resolve the daily worm roll. The roll is injected so tests are deterministic
 * — the same pattern CombatSystem already uses.
 */
export function resolveWorm(
  hasHarvester: boolean,
  hasThopter: boolean,
  roll: number,
): WormOutcome {
  const risk = wormRisk(hasHarvester, hasThopter)
  if (roll >= risk) {
    return { attacked: false, casualtyFraction: 0, equipmentDamage: 0 }
  }
  // With a thopter on site the crew evacuates: shaken, but intact.
  return hasThopter
    ? { attacked: true, casualtyFraction: 0, equipmentDamage: 0 }
    : { attacked: true, casualtyFraction: 0.2, equipmentDamage: 30 }
}
