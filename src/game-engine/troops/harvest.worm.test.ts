// src/game-engine/troops/harvest.worm.test.ts
// Split from harvest.test.ts (200-line rule): the worm-risk describe block.

import { describe, it, expect } from 'vitest'
import { wormRisk, resolveWorm } from './harvest'

describe('wormRisk and resolveWorm', () => {
  it('ignores hand crews', () => {
    expect(wormRisk(false, false)).toBe(0)
  })

  it('charges 5% for an unescorted harvester and 1% with a thopter', () => {
    expect(wormRisk(true, false)).toBeCloseTo(0.05, 6)
    expect(wormRisk(true, true)).toBeCloseTo(0.01, 6)
  })

  it('is deterministic under an injected roll', () => {
    expect(resolveWorm(true, false, 0.99).attacked).toBe(false)
    expect(resolveWorm(true, false, 0.01).attacked).toBe(true)
  })

  it('costs a fifth of the crew and harvester condition when unescorted', () => {
    const outcome = resolveWorm(true, false, 0)
    expect(outcome.casualtyFraction).toBeCloseTo(0.2, 6)
    expect(outcome.equipmentDamage).toBe(30)
  })

  it('lets an escorted crew evacuate intact', () => {
    const outcome = resolveWorm(true, true, 0)
    expect(outcome.attacked).toBe(true)
    expect(outcome.casualtyFraction).toBe(0)
    expect(outcome.equipmentDamage).toBe(0)
  })

  it('never attacks a hand crew whatever the roll', () => {
    expect(resolveWorm(false, false, 0).attacked).toBe(false)
  })
})
