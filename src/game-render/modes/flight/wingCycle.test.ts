// src/game-render/modes/flight/wingCycle.test.ts

import { describe, it, expect } from 'vitest'
import { wingAngles, featherAtSpan } from './wingCycle'
import type { WingCycleOptions } from './wingCycle'

function deg(d: number): number {
  return (d * Math.PI) / 180
}

// Matches the values Ornithopter.ts drives the forewing with (see
// docs/PRD/dune92/stages/22-ornithopter.md section 2.3's validated model).
const BASE: WingCycleOptions = {
  flapAmplitude: deg(32),
  aoaDownstroke: deg(50),
  aoaUpstroke: deg(20),
  flipWindow: 0.66,
  flipAdvance: deg(15),
  deviationAmplitude: deg(15),
  pairPhase: 0,
}

const TWO_PI = Math.PI * 2

describe('wingAngles: held angle of attack, not a sine', () => {
  it('spends about 79% of the cycle at the held AoA — fails for a sine', () => {
    const samples = 20000
    let held = 0
    for (let i = 0; i < samples; i++) {
      const phase = (i / samples) * TWO_PI
      const { feather } = wingAngles(phase, BASE)
      const atDown = Math.abs(feather - BASE.aoaDownstroke) < 1e-9
      const atUp = Math.abs(feather - BASE.aoaUpstroke) < 1e-9
      if (atDown || atUp) held++
    }
    const fraction = held / samples
    // A sine substituted for the trapezoid touches either extreme at a
    // single instant, so its held fraction is ~0 — this threshold sits
    // nowhere near that failure mode.
    expect(fraction).toBeCloseTo(1 - BASE.flipWindow / Math.PI, 2)
    expect(fraction).toBeGreaterThan(0.7)
  })

  it('holds exactly at the downstroke and upstroke AoA away from the reversals', () => {
    expect(wingAngles(Math.PI, BASE).feather).toBeCloseTo(BASE.aoaDownstroke, 9)
    expect(wingAngles(0, BASE).feather).toBeCloseTo(BASE.aoaUpstroke, 9)
  })
})

describe('wingAngles: deviation traces a figure-eight', () => {
  it('crosses zero exactly four times per cycle — two would be a simple arc', () => {
    const samples = 2000
    let crossings = 0
    let previous = wingAngles(0, BASE).sweep
    for (let i = 1; i <= samples; i++) {
      const phase = (i / samples) * TWO_PI
      const current = wingAngles(phase, BASE).sweep
      if (Math.sign(current) !== Math.sign(previous) && Math.sign(current) !== 0) {
        crossings++
      }
      previous = current
    }
    expect(crossings).toBe(4)
  })
})

describe('wingAngles: flipAdvance is signed, not a magnitude', () => {
  it('a positive flipAdvance completes the flip strictly before stroke reversal', () => {
    const justBefore = Math.PI / 2 - 0.001
    expect(wingAngles(justBefore, BASE).feather).toBeCloseTo(BASE.aoaDownstroke, 6)
  })

  it('reintroducing a lag (negative flipAdvance) fails to complete the flip by reversal', () => {
    // This is the failure mode section 2.3 warns produces downward force.
    // The parameter is named for its sign for exactly this reason.
    const lagged: WingCycleOptions = { ...BASE, flipAdvance: -deg(15) }
    const atReversal = Math.PI / 2
    expect(wingAngles(atReversal, lagged).feather).not.toBeCloseTo(BASE.aoaDownstroke, 6)
  })
})

describe('wingAngles: asymmetry', () => {
  it('a phase or amplitude offset changes the output — the mechanism for breaking mirror symmetry', () => {
    const left = wingAngles(1.1, { ...BASE, asymmetry: { phase: deg(3), amplitudeScale: 1.04 } })
    const right = wingAngles(1.1, { ...BASE, asymmetry: { phase: -deg(5), amplitudeScale: 0.95 } })
    expect(left.flap).not.toBeCloseTo(right.flap, 6)
  })
})

describe('featherAtSpan: the flip travels tip to root, not as a rigid block', () => {
  it('mid-flip, the tip is further into the transition than the root', () => {
    // Sample partway through the (advanced) top transition window, where a
    // rigid-block wing would show root and tip at the identical angle.
    const midWindowPhase = Math.PI / 2 - BASE.flipAdvance - BASE.flipWindow / 2
    const root = featherAtSpan(midWindowPhase, 0, BASE)
    const tip = featherAtSpan(midWindowPhase, 1, BASE)
    expect(tip).toBeGreaterThan(root)
  })

  it('agrees with wingAngles at the root (span fraction 0)', () => {
    for (const phase of [0, 0.7, Math.PI, 4.2, 5.9]) {
      expect(featherAtSpan(phase, 0, BASE)).toBeCloseTo(wingAngles(phase, BASE).feather, 9)
    }
  })
})
