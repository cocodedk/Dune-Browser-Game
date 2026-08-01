// vehicle-shop/ornihopter/src/model/geometry/hullProfile.test.ts
// The hull envelope is what both the visible mesh (hullGeometry.ts) and the
// wing-clearance tests read, so its own shape needs checking against spec.ts
// directly. hullSlenderness.test.ts owns the longitudinal distribution; this
// file owns containment — what has to be inside the skin, and what outside.
//
// THREE ASSERTIONS CHANGED THIS ROUND, and each had been quietly forcing the
// slab this round removes:
//
//   "holds full beam at every WING_ROOTS station" pinned widthFrac to exactly
//   1.0 across 7.4-12.2m aft — 4.8m of mandatory plateau. The mounts need a
//   real shoulder, not a flat one; they seat off hullHalfWidthAt, so a crest
//   carries them just as well. Now asserted as a floor, with the peak itself
//   proven to sit on the shoulder in hullSlenderness.test.ts.
//
//   "keeps a fixed aspect ratio of width everywhere" made height a constant
//   multiple of width, so a deep pod could only be bought by a wide one. The
//   kit's pod is deep and its boom is flattened; one ratio cannot say both.
//
//   "the cockpit clear volume fits at consoleZ and seatZ" compared
//   COCKPIT.clearWidth against the hull's half-width AT THE CHINE — the widest
//   line of the section, well above the cabin floor. It was never a
//   containment test: measured against the real faceted skin, the 4.9m-wide
//   cabin floor pokes through the tucked lower flanks under the old table as
//   much as under this one. Replaced with a test of what actually has to fit —
//   the seats the crew sit in and the eye point the pilot camera is placed at.

import { describe, it, expect } from 'vitest'
import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt, isOutsideHull } from './hullProfile'
import { OVERALL, HALF_LENGTH, WING_ROOTS, WING_ROOT_X, COCKPIT, PILOT_EYE } from '../../spec'

const HALF_BEAM = OVERALL.bodyWidth / 2

describe('hullHalfWidthAt', () => {
  it('ends blunt at the nose and fine at the tail', () => {
    // The kit's nose is a vertical chisel with two stacked slots across it,
    // not a needle — hullGreebles.ts caps it and hullTexel.ts paints the
    // slots. Small, but deliberately not zero.
    expect(hullHalfWidthAt(-HALF_LENGTH)).toBeGreaterThan(0.15)
    expect(hullHalfWidthAt(-HALF_LENGTH)).toBeLessThan(HALF_BEAM * 0.12)
    expect(hullHalfWidthAt(HALF_LENGTH)).toBeLessThan(0.1)
  })

  it('never exceeds bodyWidth / 2 anywhere along the hull', () => {
    for (let z = -HALF_LENGTH; z <= HALF_LENGTH; z += 0.5) {
      expect(hullHalfWidthAt(z)).toBeLessThanOrEqual(HALF_BEAM + 1e-9)
    }
  })

  it('carries a real shoulder across every WING_ROOTS station', () => {
    for (const mount of WING_ROOTS) {
      expect(hullHalfWidthAt(mount.z)).toBeGreaterThan(HALF_BEAM * 0.8)
    }
  })
})

describe('hullHalfHeightAt', () => {
  it('is no longer locked to a fixed multiple of width', () => {
    // The regression this replaces: if height ever becomes k * width again,
    // the pod can only be made deep by making it wide, which is what produced
    // the 10m full-beam slab in the first place.
    const ratios = [1.4, 3.6, 9.8, 16].map((m) => {
      const z = m - HALF_LENGTH
      return hullHalfHeightAt(z) / hullHalfWidthAt(z)
    })
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(0.15)
  })

  it('never exceeds bodyHeight / 2', () => {
    for (let z = -HALF_LENGTH; z <= HALF_LENGTH; z += 0.5) {
      expect(hullHalfHeightAt(z)).toBeLessThanOrEqual(OVERALL.bodyHeight / 2 + 1e-9)
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

  it('keeps the hull a closed solid around its own keel line', () => {
    // Was "the craft centreline (0, 0) is always inside". The boom's section
    // centre now drops aft (hullStations.ts's keelY column), so y = 0 leaves
    // the skin over the last few metres by design; the guarantee that actually
    // matters — that every station encloses its own axis — is this one.
    for (let z = -HALF_LENGTH + 1; z <= HALF_LENGTH - 1; z += 0.5) {
      expect(isOutsideHull(0, hullKeelYAt(z), z)).toBe(false)
    }
  })

  it('still holds y = 0 inside through every gear and wing-root station', () => {
    // rootPod.ts's seatOnHull and gearGeometry.ts both start from y = 0, so
    // the droop must not reach forward into their stations.
    const lastRoot = WING_ROOTS[WING_ROOTS.length - 1].z
    for (let z = -HALF_LENGTH + 1; z <= lastRoot; z += 0.5) {
      expect(isOutsideHull(0, 0, z)).toBe(false)
    }
  })

  it('encloses the crew: both seats and the pilot eye point sit inside the skin', () => {
    const seatEdgeX = COCKPIT.seatOffsetX + COCKPIT.seatWidth / 2
    const panY = COCKPIT.floorY + COCKPIT.seatPanAboveFloor
    for (const z of [COCKPIT.consoleZ, COCKPIT.seatZ]) {
      for (const sign of [1, -1]) {
        expect(isOutsideHull(sign * seatEdgeX, panY, z)).toBe(false)
        expect(isOutsideHull(sign * seatEdgeX, panY + COCKPIT.seatBackHeight, z)).toBe(false)
      }
    }
    expect(isOutsideHull(PILOT_EYE.x, PILOT_EYE.y, PILOT_EYE.z)).toBe(false)
  })
})
