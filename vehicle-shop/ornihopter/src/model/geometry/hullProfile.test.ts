// vehicle-shop/ornihopter/src/model/geometry/hullProfile.test.ts
// The hull envelope is what both the visible mesh (hullGeometry.ts) and the
// wing-clearance tests read — so its own shape needs checking against
// spec.ts directly: it must taper to (near) nothing at both ends, hold full
// beam through the wing-root stations, and leave room for the cockpit's
// declared clear width/height.

import { describe, it, expect } from 'vitest'
import { hullHalfWidthAt, hullHalfHeightAt, isOutsideHull } from './hullProfile'
import { OVERALL, HALF_LENGTH, WING_ROOTS, WING_ROOT_X, COCKPIT } from '../../spec'

describe('hullHalfWidthAt', () => {
  it('tapers to (near) zero at the nose and the tail', () => {
    expect(hullHalfWidthAt(-HALF_LENGTH)).toBeLessThan(0.1)
    expect(hullHalfWidthAt(HALF_LENGTH)).toBeLessThan(0.1)
  })

  it('never exceeds bodyWidth / 2 anywhere along the hull', () => {
    for (let z = -HALF_LENGTH; z <= HALF_LENGTH; z += 0.5) {
      expect(hullHalfWidthAt(z)).toBeLessThanOrEqual(OVERALL.bodyWidth / 2 + 1e-9)
    }
  })

  it('holds full beam across every WING_ROOTS station', () => {
    for (const mount of WING_ROOTS) {
      expect(hullHalfWidthAt(mount.z)).toBeCloseTo(OVERALL.bodyWidth / 2, 6)
    }
  })
})

describe('hullHalfHeightAt', () => {
  it('keeps a fixed aspect ratio of width everywhere', () => {
    const ratio = OVERALL.bodyHeight / OVERALL.bodyWidth
    for (let z = -HALF_LENGTH; z <= HALF_LENGTH; z += 1.3) {
      expect(hullHalfHeightAt(z)).toBeCloseTo(hullHalfWidthAt(z) * ratio, 9)
    }
  })
})

describe('isOutsideHull', () => {
  it('places every wing-root attachment at or outside the hull skin (bar item 3)', () => {
    for (const mount of WING_ROOTS) {
      expect(isOutsideHull(WING_ROOT_X, mount.y, mount.z)).toBe(true)
      expect(isOutsideHull(-WING_ROOT_X, mount.y, mount.z)).toBe(true)
    }
  })

  it('the craft centreline is always inside the hull, never outside', () => {
    for (let z = -HALF_LENGTH + 1; z <= HALF_LENGTH - 1; z += 1) {
      expect(isOutsideHull(0, 0, z)).toBe(false)
    }
  })

  it('the cockpit clear volume (spec.ts COCKPIT) fits inside the hull at consoleZ and seatZ', () => {
    for (const z of [COCKPIT.consoleZ, COCKPIT.seatZ]) {
      expect(hullHalfWidthAt(z)).toBeGreaterThan(COCKPIT.clearWidth / 2)
      expect(hullHalfHeightAt(z)).toBeGreaterThan(COCKPIT.clearHeight / 2)
    }
  })
})
