// src/game-engine/ecology/ecology.test.ts

import { describe, it, expect } from 'vitest'
import {
  ecologyDay,
  windtrapBuildDays,
  moraleFloorFor,
  loyaltyFloorFor,
  travelSafe,
  spiceBlowsPossible,
  greenRegionCount,
  maxVegetation,
  TEAM_SIZE,
  DECAY_THRESHOLD,
  SETTLED_THRESHOLD,
  GREEN_THRESHOLD,
  GROWTH_PER_TEAM_DAY,
} from './ecology'
import type { RegionEcology } from './ecology'

function region(overrides: Partial<RegionEcology> = {}): RegionEcology {
  return { regionId: 'r1', vegetation: 0, windtraps: 0, ...overrides }
}

// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------

describe('ecologyDay: growth', () => {
  it('grows with a full team holding a bulb cache', () => {
    const after = ecologyDay(region(), TEAM_SIZE, 0, true)
    expect(after.vegetation).toBeCloseTo(GROWTH_PER_TEAM_DAY, 6)
  })

  it('does nothing without a bulb cache', () => {
    // Labour alone is not enough; the equipment gate is what makes ecology a
    // purchase decision as well as a staffing one.
    expect(ecologyDay(region({ vegetation: 50 }), 100, 50, false).vegetation).toBe(50)
  })

  it('ignores a partial team', () => {
    expect(ecologyDay(region(), TEAM_SIZE - 1, 0, true).vegetation).toBe(0)
  })

  it('scales with the number of full teams', () => {
    const one = ecologyDay(region(), TEAM_SIZE, 0, true).vegetation
    const three = ecologyDay(region(), TEAM_SIZE * 3, 0, true).vegetation
    expect(three).toBeCloseTo(one * 3, 6)
  })

  it('grows faster with skill and with a windtrap', () => {
    const plain = ecologyDay(region(), TEAM_SIZE, 0, true).vegetation
    const skilled = ecologyDay(region(), TEAM_SIZE, 100, true).vegetation
    const trapped = ecologyDay(region({ windtraps: 1 }), TEAM_SIZE, 0, true).vegetation
    expect(skilled).toBeGreaterThan(plain)
    expect(trapped).toBeCloseTo(plain * 2, 6)
  })

  it('never exceeds 100', () => {
    expect(ecologyDay(region({ vegetation: 99.9 }), TEAM_SIZE * 20, 100, true).vegetation)
      .toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Decay
// ---------------------------------------------------------------------------

describe('ecologyDay: decay', () => {
  it('dies back when untended below the threshold', () => {
    const after = ecologyDay(region({ vegetation: 20 }), 0, 0, true)
    expect(after.vegetation).toBeLessThan(20)
  })

  it('holds on once rooted at or above the threshold', () => {
    // Past the settled threshold the planting sustains itself; otherwise every
    // gain would evaporate the moment a crew was reassigned.
    expect(ecologyDay(region({ vegetation: DECAY_THRESHOLD }), 0, 0, true).vegetation)
      .toBe(DECAY_THRESHOLD)
  })

  it('never decays below zero', () => {
    expect(ecologyDay(region({ vegetation: 0 }), 0, 0, true).vegetation).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

describe('thresholds', () => {
  it('confers a morale floor once settled', () => {
    expect(moraleFloorFor(region({ vegetation: SETTLED_THRESHOLD - 1 }))).toBe(0)
    expect(moraleFloorFor(region({ vegetation: SETTLED_THRESHOLD }))).toBeGreaterThan(0)
  })

  it('confers a loyalty floor only once fully green', () => {
    expect(loyaltyFloorFor(region({ vegetation: GREEN_THRESHOLD - 1 }))).toBe(0)
    expect(loyaltyFloorFor(region({ vegetation: GREEN_THRESHOLD }))).toBeGreaterThan(0)
  })

  it('makes travel safe once settled', () => {
    expect(travelSafe(region({ vegetation: SETTLED_THRESHOLD - 1 }))).toBe(false)
    expect(travelSafe(region({ vegetation: SETTLED_THRESHOLD }))).toBe(true)
  })

  it('permanently ends spice blows once green — the central trade', () => {
    // Greening a region is a bet against your own future income. The game must
    // never soften this; it is the whole tension of the system.
    expect(spiceBlowsPossible(region({ vegetation: GREEN_THRESHOLD - 1 }))).toBe(true)
    expect(spiceBlowsPossible(region({ vegetation: GREEN_THRESHOLD }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Windtraps
// ---------------------------------------------------------------------------

describe('windtrapBuildDays', () => {
  it('is faster for an experienced crew', () => {
    expect(windtrapBuildDays(60)).toBeLessThan(windtrapBuildDays(10))
  })

  it('switches at the skill threshold', () => {
    expect(windtrapBuildDays(49)).toBe(5)
    expect(windtrapBuildDays(50)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Aggregates used by the act machine
// ---------------------------------------------------------------------------

describe('aggregates', () => {
  const regions = [
    region({ regionId: 'a', vegetation: 65 }),
    region({ regionId: 'b', vegetation: 30 }),
    region({ regionId: 'c', vegetation: 80 }),
  ]

  it('counts green regions for the ecology ending', () => {
    expect(greenRegionCount(regions)).toBe(2)
  })

  it('reports the highest vegetation for the act 2 gate', () => {
    expect(maxVegetation(regions)).toBe(80)
  })

  it('handles an empty region list', () => {
    expect(greenRegionCount([])).toBe(0)
    expect(maxVegetation([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The labour trade
// ---------------------------------------------------------------------------

describe('the ecology trade', () => {
  it('takes many crew-days to reach green, so it is a real commitment', () => {
    // One team, no windtrap, average skill: greening a region must cost a
    // large fraction of an act, or the trade against harvesting is trivial.
    let r = region()
    let days = 0
    while (r.vegetation < GREEN_THRESHOLD && days < 1000) {
      r = ecologyDay(r, TEAM_SIZE, 40, true)
      days += 1
    }
    expect(days).toBeGreaterThan(60)
    expect(days).toBeLessThan(1000)
  })

  it('is meaningfully faster with windtraps and a skilled crew', () => {
    let r = region({ windtraps: 1 })
    let days = 0
    while (r.vegetation < GREEN_THRESHOLD && days < 1000) {
      r = ecologyDay(r, TEAM_SIZE * 2, 100, true)
      days += 1
    }
    expect(days).toBeLessThan(30)
  })
})
