// vehicle-shop/ornihopter/src/model/geometry/wing/rootPod.test.ts
// seatOnHull is the fix for "wing roots float above the hull" (see
// rootPod.ts's header) — so this measures that it actually lands ON the real
// faceted skin at every spec.ts WING_ROOTS station, not just somewhere
// "outside" (the old WING_ROOT_X/mount.y point was already technically
// outside-or-on by isOutsideHull's own definition, which is exactly how it
// stayed floating without failing hullProfile.test.ts).

import { describe, it, expect } from 'vitest'
import { seatOnHull, wingPivotAt, buildRootPodGeometries, SEAT_X_FRACTION, POST_HEIGHT } from './rootPod'
import { isOutsideHull, hullHalfWidthAt } from '../hullProfile'
import { WING_ROOTS } from '../../../spec'

describe('seatOnHull', () => {
  it('lands on the hull skin — outside at the surface, inside a hair below it', () => {
    for (const mount of WING_ROOTS) {
      const seat = seatOnHull(mount.z)
      expect(isOutsideHull(seat.x, seat.y, mount.z, 1e-6)).toBe(true)
      expect(isOutsideHull(seat.x, seat.y - 0.01, mount.z, 1e-6)).toBe(false)
    }
  })

  it('is not the old floating point: the same x at the old flat y=0.9/0.75 was outside by a real margin', () => {
    // Regression check for the defect itself, not just the fix: confirms the
    // bisection actually MOVED off a naive guess rather than landing near it
    // by coincidence.
    for (const mount of WING_ROOTS) {
      const seat = seatOnHull(mount.z)
      expect(Math.abs(seat.y - mount.y)).toBeGreaterThan(0.01)
    }
  })

  it('the bisection\'s inner (x, 0) starting point is genuinely inside the hull at every station', () => {
    // Regression guard for seatOnHull's own documented assumption.
    for (const mount of WING_ROOTS) {
      const x = SEAT_X_FRACTION * hullHalfWidthAt(mount.z)
      expect(isOutsideHull(x, 0, mount.z)).toBe(false)
    }
  })

  it('mirrors cleanly: seatOnHull only ever returns a non-negative x (Ornithopter.ts mirrors the sign)', () => {
    for (const mount of WING_ROOTS) {
      expect(seatOnHull(mount.z).x).toBeGreaterThan(0)
    }
  })
})

describe('wingPivotAt', () => {
  it('sits exactly POST_HEIGHT above seatOnHull, same (x, z)', () => {
    for (const mount of WING_ROOTS) {
      const seat = seatOnHull(mount.z)
      const pivot = wingPivotAt(mount.z)
      expect(pivot.x).toBeCloseTo(seat.x, 10)
      expect(pivot.y).toBeCloseTo(seat.y + POST_HEIGHT, 10)
    }
  })

  it('is well clear of the hull skin, proud on its post rather than buried', () => {
    for (const mount of WING_ROOTS) {
      const pivot = wingPivotAt(mount.z)
      expect(isOutsideHull(pivot.x, pivot.y, mount.z)).toBe(true)
    }
  })
})

describe('buildRootPodGeometries', () => {
  it('produces small, cheap geometry — a housing detail, not a hero part', () => {
    const { ball, post } = buildRootPodGeometries()
    const trianglesOf = (g: typeof ball) => (g.index ? g.index.count : g.attributes.position.count) / 3
    const total = trianglesOf(ball) + trianglesOf(post)
    expect(total).toBeGreaterThan(20)
    expect(total).toBeLessThan(400)
    ball.dispose()
    post.dispose()
  })

  it('the post\'s local y=0 is its base (matches gearGeometry.ts\'s strut convention)', () => {
    const { post } = buildRootPodGeometries()
    const position = post.attributes.position
    let minY = Infinity
    for (let i = 0; i < position.count; i++) minY = Math.min(minY, position.getY(i))
    expect(minY).toBeCloseTo(0, 5)
    post.dispose()
  })
})
