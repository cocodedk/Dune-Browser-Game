// src/game-engine/troops/harvest.test.ts

import { describe, it, expect } from 'vitest'
import { harvestYield, harvestDay } from './harvest'
import { effectiveDensity, MIN_TASK_SIZE } from './types'
import type { SpiceField, TroopGroup, ExtractionTier } from './types'

function group(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1',
    homeSietchId: 'sietch_tabr',
    locationId: 'sietch_tabr',
    size: 30,
    skills: { spice: 40, prospect: 20, military: 20, ecology: 20 },
    morale: 70,
    task: 'harvest',
    taskTargetId: 'field1',
    changeoverDaysLeft: 0,
    ...overrides,
  }
}

function field(overrides: Partial<SpiceField> = {}): SpiceField {
  return {
    id: 'field1',
    regionId: 'sietch_tabr',
    position: { x: 0, y: 0 },
    discovered: true,
    density: 60,
    capacity: 480,
    remaining: 480,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// The two calibration references. Every downstream balance number — quota
// amounts, equipment prices, how many sietches a run needs — is derived from
// these, so a change here is a change to the whole economy.
// ---------------------------------------------------------------------------

describe('harvestYield: calibration references', () => {
  const reference = { size: 30, spiceSkill: 40, morale: 70, density: 60 }

  it('hand crew yields about 4.4/day (design target 4.5)', () => {
    const yieldPerDay = harvestYield({ ...reference, tier: 'hand' })
    expect(yieldPerDay).toBeCloseTo(4.43, 1)
    expect(Math.abs(yieldPerDay - 4.5)).toBeLessThan(0.3)
  })

  it('the same crew with a harvester yields about 14.8/day (design target 15)', () => {
    const yieldPerDay = harvestYield({ ...reference, tier: 'harvester' })
    expect(yieldPerDay).toBeCloseTo(14.76, 1)
    expect(Math.abs(yieldPerDay - 15)).toBeLessThan(0.3)
  })

  it('makes a harvester worth roughly 3.3x a hand crew', () => {
    // This ratio is what justifies the 100-spice price against Q2 at 250.
    const hand = harvestYield({ ...reference, tier: 'hand' })
    const mech = harvestYield({ ...reference, tier: 'harvester' })
    expect(mech / hand).toBeCloseTo(20 / 6, 2)
  })
})

// ---------------------------------------------------------------------------
// Factor behaviour
// ---------------------------------------------------------------------------

describe('harvestYield: factors', () => {
  const base = { tier: 'hand' as ExtractionTier, size: 30, spiceSkill: 40, morale: 70, density: 60 }

  it('scales linearly with density', () => {
    expect(harvestYield({ ...base, density: 120 })).toBeCloseTo(harvestYield(base) * 2, 5)
  })

  it('returns zero on an exhausted field', () => {
    expect(harvestYield({ ...base, density: 0 })).toBe(0)
  })

  it('refuses a crew below the minimum task size', () => {
    expect(harvestYield({ ...base, size: MIN_TASK_SIZE - 1 })).toBe(0)
    expect(harvestYield({ ...base, size: MIN_TASK_SIZE })).toBeGreaterThan(0)
  })

  it('clamps the size advantage at 2x', () => {
    const huge = harvestYield({ ...base, size: 600 })
    const doubled = harvestYield({ ...base, size: 60 })
    expect(huge).toBeCloseTo(doubled, 5)
  })

  it('gives a green crew reduced but non-zero output', () => {
    // A zero-skill crew that produced nothing would make the opening
    // unplayable, since skill only grows by doing the task.
    expect(harvestYield({ ...base, spiceSkill: 0 })).toBeGreaterThan(0)
    expect(harvestYield({ ...base, spiceSkill: 0 }))
      .toBeLessThan(harvestYield({ ...base, spiceSkill: 100 }))
  })

  it('scales with morale but never to zero', () => {
    expect(harvestYield({ ...base, morale: 0 })).toBeGreaterThan(0)
    expect(harvestYield({ ...base, morale: 0 }))
      .toBeLessThan(harvestYield({ ...base, morale: 100 }))
  })
})

// ---------------------------------------------------------------------------
// Field depletion
// ---------------------------------------------------------------------------

describe('effectiveDensity', () => {
  it('equals the full density on an untouched field', () => {
    expect(effectiveDensity(field())).toBe(60)
  })

  it('tapers as the field empties rather than cliffing', () => {
    expect(effectiveDensity(field({ remaining: 240 }))).toBe(30)
    expect(effectiveDensity(field({ remaining: 0 }))).toBe(0)
  })

  it('handles a zero-capacity field without dividing by zero', () => {
    expect(effectiveDensity(field({ capacity: 0, remaining: 0 }))).toBe(0)
  })
})

describe('harvestDay', () => {
  it('extracts spice and depletes the field', () => {
    const result = harvestDay(group(), field(), 'hand')
    expect(result.extracted).toBeGreaterThan(0)
    expect(result.field.remaining).toBeLessThan(480)
  })

  it('never extracts more than the field holds', () => {
    const result = harvestDay(group(), field({ remaining: 1, capacity: 480 }), 'heavy_harvester')
    expect(result.extracted).toBeLessThanOrEqual(1)
    expect(result.field.remaining).toBeGreaterThanOrEqual(0)
  })

  it('produces nothing during changeover', () => {
    // Reassignment costing a real day is what makes allocation a decision
    // rather than a free toggle.
    const result = harvestDay(group({ changeoverDaysLeft: 1 }), field(), 'harvester')
    expect(result.extracted).toBe(0)
    expect(result.field.remaining).toBe(480)
  })

  it('produces nothing for a group on another task', () => {
    expect(harvestDay(group({ task: 'prospect' }), field(), 'harvester').extracted).toBe(0)
  })

  it('exhausts a field completely instead of trickling forever', () => {
    // Effective density tapers with remaining/capacity, so yield approaches
    // zero asymptotically. Without a sweep-up threshold the field would never
    // actually run out and would pay a dwindling income indefinitely.
    let f = field({ remaining: 40, capacity: 480 })
    for (let day = 0; day < 200; day++) {
      f = harvestDay(group(), f, 'heavy_harvester').field
      expect(f.remaining).toBeGreaterThanOrEqual(0)
    }
    expect(f.remaining).toBe(0)
  })

  it('yields nothing once the field is exhausted', () => {
    const exhausted = field({ remaining: 0 })
    expect(harvestDay(group(), exhausted, 'heavy_harvester').extracted).toBe(0)
  })
})

// Worm-risk tests live in harvest.worm.test.ts (split for the 200-line rule).
