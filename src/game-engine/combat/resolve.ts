// src/game-engine/combat/resolve.ts
// PURE combat resolution and the training curve.
//
// Combat here is a consequence of preparation, not a minigame: the player wins
// or loses on decisions made days earlier about who was training and who was
// harvesting. Resolution is therefore deterministic given its inputs, with the
// only randomness injected by the caller.

import type { TroopGroup, EquipmentKind } from '../troops/types'

// --- Training ---------------------------------------------------------------

export const TRAIN_RATE = 2
export const TRAIN_RATE_WITH_TUTOR = 4
export const TRAIN_BONUS_DISRUPTORS = 1
export const SKILL_CAP_UNTUTORED = 70
export const SKILL_CAP_TUTORED = 100

/** Skill thresholds that unlock what a crew can be asked to do. */
export const GARRISON_SKILL = 40
export const RAID_SKILL = 60
export const ELITE_SKILL = 80

/**
 * One day of drill.
 *
 * The untutored cap is the point of the captain character: a player can build
 * competent defenders alone, but never elite ones.
 */
export function trainDay(
  militarySkill: number,
  hasTutor: boolean,
  hasDisruptors: boolean,
): number {
  const cap = hasTutor ? SKILL_CAP_TUTORED : SKILL_CAP_UNTUTORED
  if (militarySkill >= cap) return militarySkill

  const rate =
    (hasTutor ? TRAIN_RATE_WITH_TUTOR : TRAIN_RATE) +
    (hasDisruptors ? TRAIN_BONUS_DISRUPTORS : 0)

  return Math.min(cap, militarySkill + rate)
}

// --- Combat -----------------------------------------------------------------

export const WEAPON_MULTIPLIER = { none: 0.7, krys: 1.0, sonic_disruptor: 1.8 } as const
export type WeaponTier = keyof typeof WEAPON_MULTIPLIER

export const DEFENDER_ADVANTAGE = 1.3
export const WINNER_LOSS_FACTOR = 0.4
export const LOSER_LOSS_FACTOR = 0.7
export const NOISE_SPREAD = 0.1

export function weaponTier(kinds: readonly EquipmentKind[]): WeaponTier {
  if (kinds.includes('sonic_disruptor')) return 'sonic_disruptor'
  if (kinds.includes('krys')) return 'krys'
  return 'none'
}

export interface CombatSide {
  size: number
  militarySkill: number
  weapon: WeaponTier
  defending: boolean
}

/**
 * Raw combat power.
 *
 * Unarmed crews are weakened, not nullified — a sietch defending itself with
 * nothing still fights, and zeroing them would make an early raid unsurvivable
 * rather than merely costly.
 */
export function combatPower(side: CombatSide): number {
  const base =
    side.size *
    (Math.max(0, side.militarySkill) / 100) *
    WEAPON_MULTIPLIER[side.weapon]
  return Math.max(0, side.defending ? base * DEFENDER_ADVANTAGE : base)
}

export interface CombatOutcome {
  attackerWins: boolean
  attackerPower: number
  defenderPower: number
  attackerLosses: number
  defenderLosses: number
}

/**
 * Resolve one engagement.
 *
 * `noiseRoll` in [0,1) is injected so tests are deterministic; it applies a
 * +/-10% swing to the attacker so an evenly matched fight is genuinely
 * uncertain without being a coin flip.
 */
export function resolveCombat(
  attacker: CombatSide,
  defender: CombatSide,
  noiseRoll: number,
): CombatOutcome {
  const swing = 1 + (noiseRoll * 2 - 1) * NOISE_SPREAD
  const attackerPower = combatPower(attacker) * swing
  const defenderPower = combatPower(defender)

  // A dead heat favours the defender, matching the advantage they already hold.
  const attackerWins = attackerPower > defenderPower

  const winnerPower = attackerWins ? attackerPower : defenderPower
  const loserPower = attackerWins ? defenderPower : attackerPower
  const ratio = winnerPower > 0 ? Math.min(1, loserPower / winnerPower) : 0

  const winnerSide = attackerWins ? attacker : defender
  const loserSide = attackerWins ? defender : attacker

  const winnerLosses = Math.floor(winnerSide.size * ratio * WINNER_LOSS_FACTOR)
  const loserLosses = Math.floor(loserSide.size * LOSER_LOSS_FACTOR)

  return {
    attackerWins,
    attackerPower,
    defenderPower,
    attackerLosses: attackerWins ? winnerLosses : loserLosses,
    defenderLosses: attackerWins ? loserLosses : winnerLosses,
  }
}

// --- Raid clock -------------------------------------------------------------

export const RAID_INTERVAL_ACT2 = 6
export const RAID_INTERVAL_ACT3 = 4
export const RAID_BASE_POWER = 60
export const RAID_POWER_PER_DAY = 8

/** Days between raids for an act. Act 1 is deliberately raid-free. */
export function raidInterval(act: string): number | null {
  if (act === 'act1') return null
  return act === 'act2' ? RAID_INTERVAL_ACT2 : RAID_INTERVAL_ACT3
}

/**
 * Strength of the next raid.
 *
 * Grows with days into the act so standing still is never safe — the pressure
 * that pushes a player to keep training rather than banking spice forever.
 */
export function raidPower(daysIntoAct: number, aggressionMultiplier: number): number {
  const raw = RAID_BASE_POWER + Math.max(0, daysIntoAct) * RAID_POWER_PER_DAY
  return raw * Math.max(0, aggressionMultiplier)
}

/** Apply proportional casualties to a group. */
export function applyLosses(group: TroopGroup, losses: number): TroopGroup {
  return { ...group, size: Math.max(0, group.size - Math.max(0, losses)) }
}
