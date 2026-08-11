// src/game-engine/combat/resolve.test.ts

import { describe, it, expect } from 'vitest'
import {
  trainDay,
  weaponTier,
  combatPower,
  resolveCombat,
  SKILL_CAP_UNTUTORED,
  SKILL_CAP_TUTORED,
  TRAIN_RATE,
  TRAIN_RATE_WITH_TUTOR,
} from './resolve'
import type { CombatSide } from './resolve'

function side(overrides: Partial<CombatSide> = {}): CombatSide {
  return { size: 30, militarySkill: 50, weapon: 'krys', defending: false, ...overrides }
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

describe('trainDay', () => {
  it('advances at the base rate untutored', () => {
    expect(trainDay(20, false, false)).toBe(20 + TRAIN_RATE)
  })

  it('advances faster with a tutor', () => {
    expect(trainDay(20, true, false)).toBe(20 + TRAIN_RATE_WITH_TUTOR)
  })

  it('adds a bonus for live-fire with disruptors', () => {
    expect(trainDay(20, false, true)).toBe(20 + TRAIN_RATE + 1)
  })

  it('caps untutored crews below elite', () => {
    // This cap is the whole point of the captain: a player can build competent
    // defenders alone, but never elite ones.
    expect(trainDay(SKILL_CAP_UNTUTORED, false, false)).toBe(SKILL_CAP_UNTUTORED)
    expect(trainDay(SKILL_CAP_UNTUTORED - 1, false, false)).toBe(SKILL_CAP_UNTUTORED)
  })

  it('lets a tutor push to the full cap', () => {
    expect(trainDay(SKILL_CAP_TUTORED, true, false)).toBe(SKILL_CAP_TUTORED)
    expect(trainDay(98, true, false)).toBe(SKILL_CAP_TUTORED)
  })

  it('never regresses skill', () => {
    expect(trainDay(90, false, false)).toBe(90)
  })
})

// ---------------------------------------------------------------------------
// Weapons and power
// ---------------------------------------------------------------------------

describe('weaponTier', () => {
  it('picks the best weapon carried', () => {
    expect(weaponTier([])).toBe('none')
    expect(weaponTier(['krys'])).toBe('krys')
    expect(weaponTier(['krys', 'sonic_disruptor'])).toBe('sonic_disruptor')
  })

  it('ignores irrelevant equipment', () => {
    expect(weaponTier(['harvester', 'thopter'])).toBe('none')
  })
})

describe('combatPower', () => {
  it('scales with size, skill and weapon', () => {
    expect(combatPower(side({ size: 60 }))).toBeCloseTo(combatPower(side({ size: 30 })) * 2, 6)
    expect(combatPower(side({ militarySkill: 100 })))
      .toBeGreaterThan(combatPower(side({ militarySkill: 50 })))
    expect(combatPower(side({ weapon: 'sonic_disruptor' })))
      .toBeGreaterThan(combatPower(side({ weapon: 'krys' })))
  })

  it('gives the defender an advantage', () => {
    expect(combatPower(side({ defending: true })))
      .toBeGreaterThan(combatPower(side({ defending: false })))
  })

  it('weakens an unarmed crew without nullifying it', () => {
    // A sietch defending with nothing still fights; zero would make an early
    // raid unsurvivable rather than merely costly.
    const unarmed = combatPower(side({ weapon: 'none' }))
    expect(unarmed).toBeGreaterThan(0)
    expect(unarmed).toBeLessThan(combatPower(side({ weapon: 'krys' })))
  })

  it('never returns negative power for nonsense inputs', () => {
    expect(combatPower(side({ militarySkill: -50 }))).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe('resolveCombat', () => {
  it('lets an overwhelming attacker win', () => {
    const outcome = resolveCombat(
      side({ size: 120, militarySkill: 90, weapon: 'sonic_disruptor' }),
      side({ size: 20, militarySkill: 30, weapon: 'none', defending: true }),
      0.5,
    )
    expect(outcome.attackerWins).toBe(true)
  })

  it('lets a dug-in defender hold', () => {
    const outcome = resolveCombat(
      side({ size: 20, militarySkill: 30, weapon: 'none' }),
      side({ size: 100, militarySkill: 80, weapon: 'sonic_disruptor', defending: true }),
      0.5,
    )
    expect(outcome.attackerWins).toBe(false)
  })

  it('favours the defender in a dead heat', () => {
    const even = side({ size: 30, militarySkill: 50, weapon: 'krys' })
    const outcome = resolveCombat(even, { ...even, defending: true }, 0.5)
    expect(outcome.attackerWins).toBe(false)
  })

  it('is deterministic for a given roll', () => {
    const a = resolveCombat(side(), side({ defending: true }), 0.3)
    const b = resolveCombat(side(), side({ defending: true }), 0.3)
    expect(a).toEqual(b)
  })

  it('lets the noise roll swing a close fight', () => {
    const attacker = side({ size: 44, militarySkill: 60, weapon: 'krys' })
    const defender = side({ size: 30, militarySkill: 60, weapon: 'krys', defending: true })
    const low = resolveCombat(attacker, defender, 0)
    const high = resolveCombat(attacker, defender, 0.999)
    expect(high.attackerPower).toBeGreaterThan(low.attackerPower)
  })

  it('costs the loser more than the winner', () => {
    const outcome = resolveCombat(
      side({ size: 100, militarySkill: 90, weapon: 'sonic_disruptor' }),
      side({ size: 40, militarySkill: 40, weapon: 'krys', defending: true }),
      0.5,
    )
    expect(outcome.attackerWins).toBe(true)
    expect(outcome.defenderLosses).toBeGreaterThan(outcome.attackerLosses)
  })

  it('never inflicts more casualties than a side has', () => {
    const outcome = resolveCombat(
      side({ size: 15 }), side({ size: 15, defending: true }), 0.5,
    )
    expect(outcome.attackerLosses).toBeLessThanOrEqual(15)
    expect(outcome.defenderLosses).toBeLessThanOrEqual(15)
  })

  it('handles two empty forces without dividing by zero', () => {
    const outcome = resolveCombat(side({ size: 0 }), side({ size: 0, defending: true }), 0.5)
    expect(Number.isFinite(outcome.attackerPower)).toBe(true)
    expect(outcome.attackerLosses).toBe(0)
  })
})

// Raid-clock and applyLosses tests live in resolve.raid.test.ts
// (split for the 200-line rule).
