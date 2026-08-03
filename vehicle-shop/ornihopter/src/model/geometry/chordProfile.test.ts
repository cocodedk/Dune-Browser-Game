// vehicle-shop/ornihopter/src/model/geometry/chordProfile.test.ts
// Interpolation must reproduce spec.ts's measured chordProfile array
// exactly at its own 20 control points, and must never invent a value
// outside the array's own min/max — the guard against silently swapping in
// a linear taper (docs/info.md's wrong, actor-comparison-derived one).

import { describe, it, expect } from 'vitest'
import { chordFractionAt, chordWidthAt } from './chordProfile'
import { WING, WING_MAX_CHORD } from '../../spec'

describe('chordFractionAt', () => {
  it('hits every measured control point exactly', () => {
    const stations = WING.chordProfile.length
    WING.chordProfile.forEach((value, i) => {
      const spanFraction = i / (stations - 1)
      expect(chordFractionAt(spanFraction)).toBeCloseTo(value, 10)
    })
  })

  it('never produces a value outside the measured array\'s own range', () => {
    const min = Math.min(...WING.chordProfile)
    const max = Math.max(...WING.chordProfile)
    for (let i = 0; i <= 100; i++) {
      const value = chordFractionAt(i / 100)
      expect(value).toBeGreaterThanOrEqual(min - 1e-9)
      expect(value).toBeLessThanOrEqual(max + 1e-9)
    }
  })

  it('clamps outside [0, 1] rather than extrapolating', () => {
    expect(chordFractionAt(-0.5)).toBeCloseTo(WING.chordProfile[0], 10)
    expect(chordFractionAt(1.5)).toBeCloseTo(WING.chordProfile[WING.chordProfile.length - 1], 10)
  })

  it('stays near-constant over the middle 60% of span, per spec.ts PROVENANCE.wingPlanform', () => {
    const samples = [0.4, 0.5, 0.6, 0.7].map((f) => chordFractionAt(f))
    const spread = Math.max(...samples) - Math.min(...samples)
    expect(spread).toBeLessThan(0.05)
  })

  it('does NOT match a simple linear root-to-tip taper (docs/info.md\'s rejected model)', () => {
    const linearAt = (f: number) => WING.chordProfile[0] + (WING.chordProfile[WING.chordProfile.length - 1] - WING.chordProfile[0]) * f
    const midMeasured = chordFractionAt(0.5)
    const midLinear = linearAt(0.5)
    expect(Math.abs(midMeasured - midLinear)).toBeGreaterThan(0.15)
  })
})

describe('chordWidthAt', () => {
  it('scales the normalised fraction by the kit-measured max chord', () => {
    for (let i = 0; i <= 10; i++) {
      const f = i / 10
      expect(chordWidthAt(f)).toBeCloseTo(chordFractionAt(f) * WING_MAX_CHORD, 10)
    }
  })
})
