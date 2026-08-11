// src/game-engine/combat/resolve.raid.test.ts
// Split from resolve.test.ts (200-line rule): the raid-clock and
// applyLosses describe blocks.

import { describe, it, expect } from 'vitest'
import { raidInterval, raidPower, applyLosses, RAID_BASE_POWER } from './resolve'
import type { TroopGroup } from '../troops/types'

describe('raid clock', () => {
  it('leaves act 1 raid-free', () => {
    expect(raidInterval('act1')).toBeNull()
  })

  it('tightens the interval in later acts', () => {
    expect(raidInterval('act3')!).toBeLessThan(raidInterval('act2')!)
  })

  it('grows raid strength with days into the act', () => {
    // Standing still must never be safe.
    expect(raidPower(0, 1)).toBe(RAID_BASE_POWER)
    expect(raidPower(10, 1)).toBeGreaterThan(raidPower(0, 1))
  })

  it('scales with the difficulty aggression multiplier', () => {
    expect(raidPower(5, 1.5)).toBeGreaterThan(raidPower(5, 1))
    expect(raidPower(5, 0.7)).toBeLessThan(raidPower(5, 1))
  })

  it('never returns negative power', () => {
    expect(raidPower(-99, -1)).toBeGreaterThanOrEqual(0)
  })
})

describe('applyLosses', () => {
  const group = {
    id: 'g', homeSietchId: 's', locationId: 's', size: 30,
    skills: { spice: 0, prospect: 0, military: 0, ecology: 0 },
    morale: 50, task: 'garrison', taskTargetId: null,
    changeoverDaysLeft: 0,
  } as TroopGroup

  it('reduces size', () => {
    expect(applyLosses(group, 10).size).toBe(20)
  })

  it('never drives size below zero', () => {
    expect(applyLosses(group, 999).size).toBe(0)
  })

  it('ignores negative losses', () => {
    expect(applyLosses(group, -5).size).toBe(30)
  })

  it('does not mutate the original', () => {
    applyLosses(group, 10)
    expect(group.size).toBe(30)
  })
})
