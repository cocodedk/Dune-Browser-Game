// vehicle-shop/ornihopter/src/model/geometry/wingGeometry.test.ts
// The blade geometry itself: mirrored span direction per side, root at the
// origin (load-bearing for WingRig.ts's hinge invariant — see
// wingRootAttachment.test.ts), tip reaching exactly `reach`, and a sane
// triangle budget.

import { describe, it, expect } from 'vitest'
import { buildWingBladeGeometry, SPAN_STATIONS, SECTION_POINTS } from './wingGeometry'
import { sweepOffsetAt } from './wing/sweepProfile'
import { WING } from '../../spec'

describe('buildWingBladeGeometry', () => {
  it('roots every station-0 vertex at local x = 0, for both sides', () => {
    for (const side of ['left', 'right'] as const) {
      const geometry = buildWingBladeGeometry(side, WING.reach)
      const position = geometry.attributes.position
      for (let i = 0; i < 4; i++) expect(position.getX(i)).toBeCloseTo(0, 10)
    }
  })

  it('mirrors the tip toward +X for the right wing and -X for the left', () => {
    const right = buildWingBladeGeometry('right', WING.reach)
    const left = buildWingBladeGeometry('left', WING.reach)
    const rightPosition = right.attributes.position
    const leftPosition = left.attributes.position
    const lastRight = rightPosition.count - 4
    const lastLeft = leftPosition.count - 4
    // Float32Array (BufferAttribute's backing store) only carries ~7
    // significant digits, so this compares to 4 decimal places, not 6.
    expect(rightPosition.getX(lastRight)).toBeCloseTo(WING.reach, 4)
    expect(leftPosition.getX(lastLeft)).toBeCloseTo(-WING.reach, 4)
  })

  it('produces a sane, cheap triangle budget (flyable-first: simple forms)', () => {
    const geometry = buildWingBladeGeometry('right', WING.reach)
    const triangleCount = (geometry.index?.count ?? 0) / 3
    expect(triangleCount).toBeGreaterThan(50)
    expect(triangleCount).toBeLessThan(1000)
  })

  it('every vertex stays within +-half the max measured chord of its OWN station\'s swept centreline', () => {
    // Updated for WING.sweepProfile: the centreline itself now bows per
    // sweepOffsetAt (geometry/wing/sweepProfile.ts), so a vertex's Z is
    // measured relative to that station's own centreline, not a fixed 0.
    // The previous version of this assertion predates sweepProfile being
    // consumed at all — spec.ts's own comment on the array: "chordProfile
    // records only WIDTH... a builder... had no way to know the centreline
    // moves at all". The envelope itself (chord never exceeds its own
    // measured max) is unchanged and still what this guards.
    // Round 6c: the station layout is read from the geometry module rather
    // than assumed. It used to be `Math.floor(i / 4) / (stations - 1)`, which
    // was true only while the loft emitted four points per station at even
    // span intervals — neither holds now that the arm is sampled where the
    // measured shape actually moves. Same contract, correct station lookup:
    // an assertion about "its OWN station's centreline" has to know which
    // station each vertex belongs to.
    const geometry = buildWingBladeGeometry('right', WING.reach)
    const position = geometry.attributes.position
    expect(position.count).toBe(SPAN_STATIONS.length * SECTION_POINTS)
    const halfMaxChord = WING.reach / WING.lengthOverMaxChord / 2
    for (let i = 0; i < position.count; i++) {
      const spanFraction = SPAN_STATIONS[Math.floor(i / SECTION_POINTS)]
      const centreline = sweepOffsetAt(spanFraction)
      expect(Math.abs(position.getZ(i) - centreline)).toBeLessThanOrEqual(halfMaxChord + 1e-6)
    }
  })
})
