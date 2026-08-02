// vehicle-shop/ornihopter/src/model/geometry/gear/stance.test.ts
// What a PARKED ornithopter has to satisfy, measured rather than eyeballed.
//
// The gear this replaces hung three vertical struts of one fixed length off
// three belly stations. Because the belly is not level — the pod is the
// deepest part of the hull and the boom droops aft (hullStations.ts's keelY
// column) — equal-length struts put their feet on three DIFFERENT heights,
// and none of them reached forward of the seat. A craft like that rests on
// its forward pair alone and tips nose-down onto its own canopy. Nothing in
// the suite noticed, because nothing had ever asked where the feet were.
//
// The four things asked here are the four things that were wrong:
//   1. every foot on ONE horizontal plane (otherwise the deck is not level
//      when parked, and only some of the feet carry load),
//   2. that plane clear below the hull's lowest point anywhere along its
//      length, but crouched rather than on stilts,
//   3. hips anchored INSIDE the hull skin with a real bite, not tangent to
//      it and not floating off it,
//   4. the support polygon containing the pod — where the mass is.

import { describe, it, expect } from 'vitest'
import { GEAR_LEGS, GROUND_Y, HIP_EMBED, type Point3 } from './stance'
import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt } from '../hullProfile'
import { hullShapeAt } from '../hullStations'
import { buildRing, outwardDistance } from '../hullCrossSection'
import { HALF_LENGTH, COCKPIT, OVERALL } from '../../../spec'

interface Ground2 {
  readonly x: number
  readonly z: number
}

/** Lowest point of the hull skin anywhere along the craft, and where it is. */
function lowestHullPoint(): { y: number; metresAft: number } {
  let y = Infinity
  let metresAft = 0
  for (let m = 0; m <= OVERALL.length; m += 0.05) {
    const z = m - HALF_LENGTH
    const bottom = hullKeelYAt(z) - hullHalfHeightAt(z)
    if (bottom < y) {
      y = bottom
      metresAft = m
    }
  }
  return { y, metresAft }
}

function ringAt(z: number) {
  return buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
}

function skinDistance(p: Point3): number {
  return outwardDistance(p.x, p.y, ringAt(p.z))
}

/** Height of the chine — the section's widest line — read off the real ring
 *  rather than re-stating hullCrossSection.ts's CHINE_Y_FRAC here, which
 *  would be a second copy of a number only that file gets to choose. */
function chineYAt(z: number): number {
  return ringAt(z).reduce((widest, p) => (Math.abs(p.x) > Math.abs(widest.x) ? p : widest)).y
}

function cross(o: Ground2, a: Ground2, b: Ground2): number {
  return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x)
}

/** Monotone-chain convex hull of the foot contact points, in the ground plane. */
function supportPolygon(): Ground2[] {
  const pts = GEAR_LEGS.map((leg) => ({ x: leg.foot.x, z: leg.foot.z }))
    .sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x))
  const half = (source: Ground2[]): Ground2[] => {
    const out: Ground2[] = []
    for (const p of source) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(pts), ...half([...pts].reverse())]
}

/** True when (x, z) is strictly inside the counter-clockwise support polygon. */
function isSupported(x: number, z: number): boolean {
  const hull = supportPolygon()
  return hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], { x, z }) > 0)
}

describe('landing gear stance', () => {
  it('puts every foot on one common ground plane', () => {
    // FAIL-FIRST, old gear: foot undersides at y = -4.937 (x2, 4.2m aft),
    // -4.337 (x2, 7.8m aft) and -4.209 (x2, 11.4m aft) — a spread of 0.728m.
    // Four of the six feet hang in the air; the craft balances on the
    // forward pair and topples nose-first.
    const ys = GEAR_LEGS.map((leg) => leg.foot.y)
    const spread = Math.max(...ys) - Math.min(...ys)
    expect(spread).toBeLessThan(0.01)
    for (const y of ys) expect(y).toBeCloseTo(GROUND_Y, 6)
  })

  it('sets that plane clear below the deepest point of the hull', () => {
    const lowest = lowestHullPoint()
    expect(lowest.y - GROUND_Y).toBeGreaterThan(0.5)
    // ...including the drooped tail tip and every station between.
    for (let m = 0; m <= OVERALL.length; m += 0.1) {
      const z = m - HALF_LENGTH
      expect(hullKeelYAt(z) - hullHalfHeightAt(z)).toBeGreaterThan(GROUND_Y)
    }
  })

  it('parks high enough for the crew to walk under the belly', () => {
    // DOES NOT FAIL against the old gear, and is recorded here as a bar this
    // round nearly broke rather than one it fixed. An earlier draft of this
    // file asserted the opposite — a clearance UNDER 1.72m, "crouched, as the
    // kit stands" — and the old gear failed it at 2.830m. That bar was read
    // off two hand-held kit photographs shot from below, and it was wrong.
    // .shots/reference/thopter-05.jpg, the production's own ingress/egress
    // board, shows crew walking upright beneath the fuselage; scaled off the
    // pod's 4.21m depth the belly stands ~2.5m up. Headroom is the real
    // constraint, so the assertion is now a FLOOR.
    const clearance = lowestHullPoint().y - GROUND_Y
    expect(clearance).toBeGreaterThan(2)
    expect(clearance).toBeLessThan(OVERALL.bodyHeight * 0.75)
  })

  it('anchors every hip inside the hull skin, with a real bite', () => {
    // Tangency is not attachment: a hip that merely touches the skin leaves
    // its fairing floating. Each anchor has to sit at least HIP_EMBED inside.
    // FAIL-FIRST, old gear: the 11.4m-aft pair sits only 0.071m inside — its
    // x was taken as a fraction of the CHINE half-width, which at that station
    // is already outboard of the keel plate, so the strut top all but grazed
    // the lower flank.
    for (const leg of GEAR_LEGS) {
      expect(skinDistance(leg.hip)).toBeLessThanOrEqual(-HIP_EMBED + 1e-6)
    }
  })

  it('keeps the whole leg below the chine, out of the wings\' arc', () => {
    for (const leg of GEAR_LEGS) {
      const chineY = chineYAt(leg.hip.z)
      for (const p of [leg.hip, leg.hipSkin, leg.knee, leg.ankle, leg.foot]) {
        expect(p.y).toBeLessThan(chineY)
      }
    }
  })

  it('spreads a support polygon that contains the pod, not just the waist', () => {
    // FAIL-FIRST, old gear: the forward-most foot sat at z = -7.248 (4.2m
    // aft) while the seat station is z = -7.848 (3.6m aft) — the pilots, the
    // canopy and the whole deep forward pod hung 0.6m OUTSIDE the support
    // polygon's leading edge.
    expect(isSupported(0, COCKPIT.seatZ)).toBe(true)
    for (const sign of [1, -1]) {
      expect(isSupported(sign * COCKPIT.seatOffsetX, COCKPIT.seatZ)).toBe(true)
    }
    // ...and still reaches aft past the wing shoulder's beam peak, so the
    // craft cannot sit back on its tail either.
    expect(isSupported(0, 9.8 - HALF_LENGTH)).toBe(true)
    expect(isSupported(0, 0)).toBe(true)
  })

  it('splays the feet outboard of the hull, symmetrically', () => {
    const right = GEAR_LEGS.filter((leg) => leg.side > 0)
    const left = GEAR_LEGS.filter((leg) => leg.side < 0)
    expect(right.length).toBe(left.length)
    expect(right.length).toBeGreaterThanOrEqual(3)
    for (const leg of right) {
      const twin = left.find((other) => other.metresAft === leg.metresAft)
      expect(twin).toBeDefined()
      expect(twin?.foot.x).toBeCloseTo(-leg.foot.x, 9)
      expect(twin?.foot.y).toBeCloseTo(leg.foot.y, 9)
      expect(twin?.foot.z).toBeCloseTo(leg.foot.z, 9)
      // Perched, not tucked: each foot lands well outboard of the hull side
      // it hangs from — the splayed insect stance of docs/…kit-2.png.
      expect(leg.foot.x).toBeGreaterThan(hullHalfWidthAt(leg.foot.z) * 1.2)
    }
  })
})
