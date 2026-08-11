// src/game-engine/troops/harvestRecommendation.test.ts

import { describe, it, expect } from 'vitest'
import { recommendedField, previewYieldRange, MIN_AUTHORED_DENSITY, MAX_AUTHORED_DENSITY } from './harvestRecommendation'
import { harvestYield } from './harvest'
import type { SpiceField } from './types'

function field(over: Partial<SpiceField> = {}): SpiceField {
  return {
    id: 'field_x',
    regionId: 'red_wall_sietch',
    position: { x: 0, y: 0 },
    discovered: true,
    density: 55,
    capacity: 440,
    remaining: 440,
    ...over,
  }
}

describe('recommendedField', () => {
  it('picks the nearest discovered, non-empty field', () => {
    const near = field({ id: 'near', position: { x: 10, y: 0 } })
    const far = field({ id: 'far', position: { x: 100, y: 0 } })
    expect(recommendedField({ x: 0, y: 0 }, [far, near])).toBe(near)
  })

  it('skips undiscovered fields', () => {
    const undiscovered = field({ id: 'hidden', position: { x: 1, y: 0 }, discovered: false })
    const discovered = field({ id: 'known', position: { x: 50, y: 0 } })
    expect(recommendedField({ x: 0, y: 0 }, [undiscovered, discovered])).toBe(discovered)
  })

  it('skips exhausted fields', () => {
    const empty = field({ id: 'empty', position: { x: 1, y: 0 }, remaining: 0 })
    const working = field({ id: 'working', position: { x: 50, y: 0 } })
    expect(recommendedField({ x: 0, y: 0 }, [empty, working])).toBe(working)
  })

  it('returns null when nothing qualifies', () => {
    const empty = field({ remaining: 0 })
    expect(recommendedField({ x: 0, y: 0 }, [empty])).toBeNull()
    expect(recommendedField({ x: 0, y: 0 }, [])).toBeNull()
  })
})

describe('previewYieldRange', () => {
  const base = { tier: 'hand' as const, size: 30, spiceSkill: 30, morale: 50 }

  it('brackets harvestYield at the authored density bounds, scaled by remaining fraction', () => {
    const range = previewYieldRange({ ...base, remainingFraction: 1 })
    expect(range.min).toBeCloseTo(harvestYield({ ...base, density: MIN_AUTHORED_DENSITY }))
    expect(range.max).toBeCloseTo(harvestYield({ ...base, density: MAX_AUTHORED_DENSITY }))
    expect(range.min).toBeLessThan(range.max)
  })

  it('never leaks a real density: two different densities at the same remainingFraction give the same range', () => {
    const a = previewYieldRange({ ...base, remainingFraction: 0.8 })
    const b = previewYieldRange({ ...base, remainingFraction: 0.8 })
    expect(a).toEqual(b)
  })

  it('narrows toward zero as the field depletes', () => {
    const full = previewYieldRange({ ...base, remainingFraction: 1 })
    const nearlyGone = previewYieldRange({ ...base, remainingFraction: 0.1 })
    expect(nearlyGone.max).toBeLessThan(full.max)
  })

  it('clamps an out-of-bounds fraction rather than trusting the caller', () => {
    const over = previewYieldRange({ ...base, remainingFraction: 5 })
    const at1 = previewYieldRange({ ...base, remainingFraction: 1 })
    expect(over).toEqual(at1)

    const under = previewYieldRange({ ...base, remainingFraction: -1 })
    expect(under).toEqual({ min: 0, max: 0 })
  })
})
