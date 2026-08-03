// vehicle-shop/ornihopter/src/model/wingKinematics.test.ts
// Pure-math checks for the beat kinematics: adjacent pairs in antiphase,
// left/right of a pair sharing that phase, and amplitudes bounded by
// spec.ts's authored constants. No three.js involved.

import { describe, it, expect } from 'vitest'
import { pairPhaseOffset, foldAngle, flapAngle, featherAngle } from './wingKinematics'
import { WING } from '../spec'

const DEG_TO_RAD = Math.PI / 180

describe('pairPhaseOffset', () => {
  it('adjacent pairs are in antiphase', () => {
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(pairPhaseOffset(i) - pairPhaseOffset(i + 1))
      expect(diff).toBeCloseTo(Math.PI, 10)
    }
  })

  it('pairs two apart share phase (transitivity of antiphase)', () => {
    expect(pairPhaseOffset(0)).toBeCloseTo(pairPhaseOffset(2), 10)
    expect(pairPhaseOffset(1)).toBeCloseTo(pairPhaseOffset(3), 10)
  })
})

describe('foldAngle', () => {
  it('matches spec.ts WING.sweepDeg, converted to radians, per pair', () => {
    WING.sweepDeg.forEach((deg, pairIndex) => {
      expect(foldAngle(pairIndex)).toBeCloseTo(deg * DEG_TO_RAD, 10)
    })
  })
})

describe('flapAngle', () => {
  it('stays within +-flapHalfAngleDeg for every pair', () => {
    const amplitude = WING.flapHalfAngleDeg * DEG_TO_RAD
    for (let pairIndex = 0; pairIndex < 4; pairIndex++) {
      for (let i = 0; i <= 40; i++) {
        const phase = (i / 40) * Math.PI * 4
        expect(Math.abs(flapAngle(phase, pairIndex))).toBeLessThanOrEqual(amplitude + 1e-9)
      }
    }
  })

  it('adjacent pairs are opposite in sign at a generic phase', () => {
    const phase = 0.4
    expect(Math.sign(flapAngle(phase, 0))).toBe(-Math.sign(flapAngle(phase, 1)))
    expect(Math.sign(flapAngle(phase, 1))).toBe(-Math.sign(flapAngle(phase, 2)))
    expect(Math.sign(flapAngle(phase, 2))).toBe(-Math.sign(flapAngle(phase, 3)))
  })

  it('is a pure function of (phase, pairIndex) alone — no hidden per-side state', () => {
    // flapAngle takes no `side` argument at all: left and right of a pair
    // are built from the exact same call in Ornithopter.ts, so "left and
    // right beat together" is structural, not coincidental. This pins the
    // determinism that guarantee depends on.
    expect(flapAngle(0.83, 2)).toBe(flapAngle(0.83, 2))
  })

  it('has nonzero amplitude somewhere in the cycle (tip Y amplitude > 0)', () => {
    const max = Math.max(...Array.from({ length: 20 }, (_, i) => Math.abs(flapAngle((i / 20) * Math.PI * 2, 0))))
    expect(max).toBeGreaterThan(0)
  })
})

describe('featherAngle', () => {
  it('stays within +-featherAmplitudeDeg for every pair', () => {
    const amplitude = WING.featherAmplitudeDeg * DEG_TO_RAD
    for (let pairIndex = 0; pairIndex < 4; pairIndex++) {
      for (let i = 0; i <= 40; i++) {
        const phase = (i / 40) * Math.PI * 4
        expect(Math.abs(featherAngle(phase, pairIndex))).toBeLessThanOrEqual(amplitude + 1e-9)
      }
    }
  })
})
