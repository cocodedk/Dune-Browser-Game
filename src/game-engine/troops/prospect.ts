// src/game-engine/troops/prospect.ts
// PURE prospecting rules.
//
// Prospecting is the counterweight to harvesting: a crew sent to look for new
// sand produces nothing today in the hope of producing more later. That
// trade — income now against income later, against a deadline — is the
// central decision of the Act 1 slice.

export const BASE_FIND_CHANCE = 0.08
export const SKILL_FIND_BONUS = 0.002
export const RICHNESS_FIND_BONUS = 0.001
export const MAX_FIND_CHANCE = 0.35
export const TUTOR_MULTIPLIER = 1.5
export const FINDS_PER_REGION = 3

export type FindKind = 'field' | 'skill' | 'cache' | 'sietch' | 'nothing'

export interface FindOutcome {
  kind: FindKind
  /** Density rolled for a new field, when kind === 'field'. */
  density?: number
  /** Skill gained, when kind === 'skill'. */
  skillGain?: number
}

/**
 * Daily chance a crew turns something up.
 *
 * Capped at 35% so prospecting never becomes strictly better than harvesting;
 * it should feel like a gamble that pays off over a cycle, not a slot machine.
 */
export function findChance(
  prospectSkill: number,
  regionRichness: number,
  hasTutor: boolean,
): number {
  const raw =
    BASE_FIND_CHANCE +
    Math.max(0, prospectSkill) * SKILL_FIND_BONUS +
    Math.max(0, regionRichness) * RICHNESS_FIND_BONUS
  const withTutor = hasTutor ? raw * TUTOR_MULTIPLIER : raw
  return Math.min(MAX_FIND_CHANCE, withTutor)
}

/**
 * Resolve what was found. Both rolls are injected so tests are deterministic.
 *
 * `findRoll` decides whether anything was found at all; `tableRoll` picks from
 * the find table: 70% a new field, 15% nothing but experience, 10% an
 * equipment cache, 5% a hidden sietch.
 */
export function resolveFind(
  chance: number,
  findRoll: number,
  tableRoll: number,
  regionRichness: number,
): FindOutcome {
  if (findRoll >= chance) return { kind: 'nothing' }

  if (tableRoll < 0.7) {
    // Density is weighted by the region: a rich region yields richer sand.
    const span = 60
    const floor = 30
    const richnessLift = (Math.max(0, Math.min(100, regionRichness)) / 100) * 30
    const density = Math.round(
      Math.min(90, floor + richnessLift + (tableRoll / 0.7) * (span - richnessLift)),
    )
    return { kind: 'field', density }
  }
  if (tableRoll < 0.85) return { kind: 'skill', skillGain: 3 }
  if (tableRoll < 0.95) return { kind: 'cache' }
  return { kind: 'sietch' }
}

/**
 * Whether a region still has anything to give.
 *
 * Regions exhaust after three finds so the player is pushed outward instead of
 * grinding one safe region forever.
 */
export function regionExhausted(findsSoFar: number): boolean {
  return findsSoFar >= FINDS_PER_REGION
}

export function findMessage(outcome: FindOutcome): string {
  switch (outcome.kind) {
    case 'field':
      return `Your prospectors find spice sand, density ${outcome.density}.`
    case 'skill':
      return 'No spice, but your crew reads the dunes better for it.'
    case 'cache':
      return 'Your crew turns up a buried equipment cache.'
    case 'sietch':
      return 'Your prospectors find a sietch no map records.'
    case 'nothing':
      return ''
  }
}
