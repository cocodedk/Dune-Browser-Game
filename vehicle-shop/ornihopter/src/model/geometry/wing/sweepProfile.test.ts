// vehicle-shop/ornihopter/src/model/geometry/wing/sweepProfile.test.ts
// Mirrors chordProfile.test.ts's structure for the sweep (bow) curve, plus
// the root-collar blend that keeps wingRootAttachment.test.ts's hinge
// invariant true — see sweepProfile.ts's header for why that collar exists.

import { describe, it, expect } from 'vitest'
import { sweepFractionAt, sweepOffsetAt, rootBlendAt } from './sweepProfile'
import { WING, WING_MAX_CHORD } from '../../../spec'

describe('sweepFractionAt', () => {
  it('hits every measured control point exactly', () => {
    const stations = WING.sweepProfile.length
    WING.sweepProfile.forEach((value, i) => {
      const spanFraction = i / (stations - 1)
      expect(sweepFractionAt(spanFraction)).toBeCloseTo(value, 10)
    })
  })

  it('clamps outside [0, 1] rather than extrapolating', () => {
    expect(sweepFractionAt(-0.5)).toBeCloseTo(WING.sweepProfile[0], 10)
    expect(sweepFractionAt(1.5)).toBeCloseTo(WING.sweepProfile[WING.sweepProfile.length - 1], 10)
  })

  it('is positive at the root, per spec.ts PROVENANCE (measured +0.233)', () => {
    expect(sweepFractionAt(0)).toBeGreaterThan(0)
  })

  it('crosses to negative across the constant-chord midspan', () => {
    expect(sweepFractionAt(0.5)).toBeLessThan(0)
  })

  it('returns toward positive again near the tip — the full S-bow, not a monotonic taper', () => {
    expect(sweepFractionAt(1)).toBeGreaterThan(0)
  })
})

describe('rootBlendAt', () => {
  it('is exactly zero at the mechanical root', () => {
    expect(rootBlendAt(0)).toBe(0)
  })

  it('reaches exactly 1 well before rootArmFraction and stays there', () => {
    expect(rootBlendAt(WING.rootArmFraction * 0.2)).toBeCloseTo(1, 10)
    expect(rootBlendAt(WING.rootArmFraction)).toBe(1)
    expect(rootBlendAt(1)).toBe(1)
  })

  it('is monotonically non-decreasing across the collar (a smooth ease, no overshoot)', () => {
    let previous = -Infinity
    for (let i = 0; i <= 20; i++) {
      const value = rootBlendAt((i / 20) * WING.rootArmFraction * 0.2)
      expect(value).toBeGreaterThanOrEqual(previous - 1e-12)
      expect(value).toBeLessThanOrEqual(1 + 1e-12)
      previous = value
    }
  })
})

describe('sweepOffsetAt', () => {
  it('is exactly zero at spanFraction 0 — the ring wingRootAttachment.test.ts pins to the hull', () => {
    // Not merely small: wingRootAttachment.test.ts asserts the root ring's
    // centroid sits within 1e-6 of the attachment point for every phase,
    // which only holds if this is exactly 0.
    expect(sweepOffsetAt(0)).toBe(0)
  })

  it('matches the negated measured fraction, scaled by max chord, past the collar', () => {
    // sweepOffsetAt negates the measured curve once — the sign mapping to
    // craft z (user's knife rule: dull spine forward, sharp curved edge
    // aft), not the plate reading itself. sweepFractionAt, asserted
    // un-negated above, is that plate reading.
    expect(sweepOffsetAt(0.5)).toBeCloseTo(-sweepFractionAt(0.5) * WING_MAX_CHORD, 10)
    expect(sweepOffsetAt(1)).toBeCloseTo(-sweepFractionAt(1) * WING_MAX_CHORD, 10)
  })

  it('never exceeds the measured curve\'s own magnitude anywhere on the span', () => {
    const maxFraction = Math.max(...WING.sweepProfile.map(Math.abs))
    for (let i = 0; i <= 100; i++) {
      const spanFraction = i / 100
      expect(Math.abs(sweepOffsetAt(spanFraction))).toBeLessThanOrEqual(maxFraction * WING_MAX_CHORD + 1e-9)
    }
  })
})
