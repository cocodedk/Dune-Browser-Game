// src/game-render/modes/flight/geometry/wingProfile.test.ts
// The corrugation is deterministic and bounded — the regression guard against
// the pleat formula silently drifting into a jittery or flat result.

import { describe, it, expect } from 'vitest'
import {
  corrugation, chordEnvelope, thicknessEnvelopeAtSpan, taper, wingSectionAt,
  tiltChordSection, WING_CHORD_TILT,
} from './wingProfile'

describe('wing membrane corrugation (stage 22 section 2.5)', () => {
  it('stays within [-1, 1] and is deterministic', () => {
    for (let i = 0; i <= 50; i++) {
      const c = i / 50
      const a = corrugation(c)
      const b = corrugation(c)
      expect(a).toBe(b)
      expect(a).toBeGreaterThanOrEqual(-1)
      expect(a).toBeLessThanOrEqual(1)
    }
  })

  it('actually folds — not monotonic, not flat', () => {
    const samples = Array.from({ length: 40 }, (_, i) => corrugation(i / 40))
    const rises = samples.some((v, i) => i > 0 && v > samples[i - 1])
    const falls = samples.some((v, i) => i > 0 && v < samples[i - 1])
    expect(rises).toBe(true)
    expect(falls).toBe(true)
  })

  it('chord envelope fades toward the trailing edge', () => {
    expect(chordEnvelope(0)).toBeCloseTo(1, 5)
    expect(chordEnvelope(1)).toBeCloseTo(0, 5)
    expect(chordEnvelope(0.2)).toBeGreaterThan(chordEnvelope(0.8))
  })

  it('span envelope falls from root to tip', () => {
    expect(thicknessEnvelopeAtSpan(0)).toBeCloseTo(1, 5)
    expect(thicknessEnvelopeAtSpan(1)).toBeCloseTo(0, 5)
    expect(thicknessEnvelopeAtSpan(0.2)).toBeGreaterThan(thicknessEnvelopeAtSpan(0.8))
  })
})

describe('taper', () => {
  it('hits the root and tip values exactly at the ends', () => {
    expect(taper(0, 5.5, 0.6)).toBeCloseTo(5.5, 5)
    expect(taper(1, 5.5, 0.6)).toBeCloseTo(0.6, 5)
    expect(taper(0.5, 5.5, 0.6)).toBeCloseTo(3.05, 5)
  })
})

describe('wingSectionAt', () => {
  it('starts just outside the spar radius at chordFraction 0', () => {
    const sparRadius = 0.4
    const sample = wingSectionAt(0, 0, sparRadius, 5.5, 0.66)
    expect(sample.z).toBeCloseTo(sparRadius * 1.15, 5)
  })

  it('reaches the trailing edge at chordFraction 1', () => {
    const chordWidth = 5.5
    const sample = wingSectionAt(0, 1, 0.4, chordWidth, 0.66)
    expect(sample.z).toBeCloseTo(chordWidth, 5)
  })

  it('never produces a negative chordwise depth', () => {
    for (let s = 0; s <= 1; s += 0.1) {
      for (let c = 0; c <= 1; c += 0.1) {
        expect(wingSectionAt(s, c, 0.4, 5.5, 0.66).z).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('is flat (no pleat) exactly at the root, for the hinge invariant', () => {
    // WingRig.ts's hinge test measures the root ring's distance from the
    // pivot axis; an un-blended pleat put that well outside tolerance (see
    // wingSectionAt's rootBlend comment). Every chord sample at span
    // fraction 0 must land at y=0 so the root ring stays a flat disc.
    for (let c = 0; c <= 1; c += 0.05) {
      expect(wingSectionAt(0, c, 0.4, 5.5, 0.66).y).toBeCloseTo(0, 10)
    }
  })
})

describe('tiltChordSection (stage 22 section 2.2/2.5 — chord visible from a chase camera)', () => {
  it('is the identity at chordFraction 0, for any section — the hinge invariant depends on this', () => {
    // wingSectionAt's own root-vertex value (see the test above) AND the
    // point the hinge invariant measures (Ornithopter.test.ts) both live at
    // chordFraction 0. tiltChordSection must not move that point, for ANY
    // (y, z), not just the ones wingSectionAt happens to produce there.
    for (const section of [{ y: 0, z: 0.48 }, { y: 0.3, z: 1.2 }, { y: -0.6, z: 0.9 }]) {
      const tilted = tiltChordSection(section, 0)
      expect(tilted.y).toBeCloseTo(section.y, 10)
      expect(tilted.z).toBeCloseTo(section.z, 10)
    }
  })

  it('preserves distance from the local origin (a rotation, not a shear)', () => {
    const section = { y: 0.2, z: 3.4 }
    const before = Math.hypot(section.y, section.z)
    for (const c of [0, 0.25, 0.5, 0.75, 1]) {
      const tilted = tiltChordSection(section, c)
      expect(Math.hypot(tilted.y, tilted.z)).toBeCloseTo(before, 10)
    }
  })

  it('rotates a pure-chordwise point by exactly WING_CHORD_TILT at chordFraction 1', () => {
    // Same rotation-matrix convention as WingRig.ts's applyFeatherTwist
    // (newY = y*cos - z*sin, newZ = y*sin + z*cos), so the two compose
    // predictably when the runtime feather twist is layered on top.
    const tilted = tiltChordSection({ y: 0, z: 1 }, 1)
    expect(tilted.y).toBeCloseTo(-Math.sin(WING_CHORD_TILT), 10)
    expect(tilted.z).toBeCloseTo(Math.cos(WING_CHORD_TILT), 10)
  })

  it('leans the trailing edge toward Y rather than leaving it on Z', () => {
    // The whole point of the tilt: at the trailing edge, a mostly-Z sample
    // should end up with more magnitude in Y than in Z.
    const tilted = tiltChordSection({ y: 0, z: 5 }, 1)
    expect(Math.abs(tilted.y)).toBeGreaterThan(Math.abs(tilted.z))
  })
})
