// vehicle-shop/harvester/src/model/cutterDetail.test.ts
// The cutter's PURE arithmetic — the drum's direction of rotation and its
// rate, and the invariant that its picks scrape the bed at every phase.
// Deliberately separate from cutter.test.ts (which measures geometry): the
// sign below is the round's correctness question, and a sign is exactly the
// kind of defect that survives a bounding-box test.
//
// No three.js in this file: every claim is arithmetic on numbers.

import { describe, it, expect } from 'vitest'
import { BOOM } from '../spec'
import { DRUM, DRUM_GEAR, drumAngularSpeed, forwardSpeedOf, lowestPickTipY, pickAngle } from './cutterDetail'

/** Velocity of a point on the drum's surface, from first principles rather
 *  than from the implementation: v = w * (x_hat CROSS r) with r measured
 *  from the axis, which for r = (0, y, z) is w * (0, -z, y). Returned as
 *  (y, z) because the drum has no motion along its own axis. */
function surfaceVelocity(omega: number, y: number, z: number): { y: number; z: number } {
  return { y: omega * -z, z: omega * y }
}

describe('the drum turns the FEEDING way', () => {
  it('moves its BOTTOM surface rearward (+Z) when the machine drives forward', () => {
    // THE PHYSICAL ARGUMENT, and why this test exists.
    //
    // -Z is forward (spec.ts). The machine drives INTO the spice bed, so the
    // drum's job at the sand line is to drag what it cuts back UNDER the
    // head, toward the throat: at the drum's lowest point, the surface must
    // travel toward +Z (aft). A drum turning the other way would throw the
    // spice forward, ahead of a machine that is about to drive over it —
    // which is the failure this whole loop keeps catching in other guises
    // (an aircraft flying tail-first, a camera looking the wrong way).
    //
    // The bottom of the drum is the point r = (0, -R, 0) from its axis.
    const omega = drumAngularSpeed(2, 2)
    const bottom = surfaceVelocity(omega, -DRUM.radius, 0)
    expect(bottom.z).toBeGreaterThan(0)

    // And the corroborating quarter-turns, so a sign flip cannot hide in one
    // sampled point: the LEADING (forward, -Z) face must be moving DOWN into
    // the bed, and the TOP must be carrying material forward over the axis.
    const leading = surfaceVelocity(omega, 0, -DRUM.radius)
    expect(leading.y).toBeLessThan(0)
    const top = surfaceVelocity(omega, DRUM.radius, 0)
    expect(top.z).toBeLessThan(0)
  })

  it('reverses with the machine and stops when it stops', () => {
    expect(Math.abs(drumAngularSpeed(0, 0))).toBe(0)
    expect(Math.sign(drumAngularSpeed(-2, -2))).toBe(-Math.sign(drumAngularSpeed(2, 2)))
    // Backing out of the bed, the bottom surface runs forward again — the
    // drum is geared to the tracks, not free-wheeling in one direction.
    const backing = surfaceVelocity(drumAngularSpeed(-2, -2), -DRUM.radius, 0)
    expect(backing.z).toBeLessThan(0)
  })

  it('is NOT the wheel sign copied: it outruns the machine by the gear ratio', () => {
    // A wheel's contact patch stands still against the ground. The drum's
    // must move rearward FASTER than the machine advances, or it is rolling
    // rather than cutting. Surface speed = |w| * R.
    const speed = 2
    const surfaceSpeed = Math.abs(drumAngularSpeed(speed, speed)) * DRUM.radius
    expect(surfaceSpeed).toBeGreaterThan(speed)
    expect(surfaceSpeed).toBeCloseTo(speed * DRUM_GEAR, 6)
  })
})

describe('the drum rate is proportional to the crawl', () => {
  it('doubles with speed and reads the mean of the two track speeds', () => {
    const single = drumAngularSpeed(1.5, 1.5)
    expect(drumAngularSpeed(3, 3)).toBeCloseTo(single * 2, 6)
    // Steering splits the demand between the bands (kinematics.ts builds
    // them as speed +- steer*STEER_DIFF), so the MEAN is the forward speed:
    // a machine turning at the same forward speed feeds at the same rate.
    expect(forwardSpeedOf(2.4, 0.6)).toBeCloseTo(1.5, 6)
    expect(drumAngularSpeed(2.4, 0.6)).toBeCloseTo(single, 6)
    // Spinning on the spot is zero forward speed and so zero feed.
    expect(Math.abs(drumAngularSpeed(2, -2))).toBe(0)
  })

  it('is w = -gear * v / r, off spec.drumRadius rather than a local number', () => {
    expect(drumAngularSpeed(1, 1)).toBeCloseTo(-DRUM_GEAR / BOOM.drumRadius, 9)
    expect(DRUM.radius).toBe(BOOM.drumRadius)
  })
})

describe('the picks scrape the bed at every phase', () => {
  it('keeps the lowest pick tip within 0.5m of the sand, and above it', () => {
    for (let i = 0; i < 64; i++) {
      const tip = lowestPickTipY((i * 2 * Math.PI) / 64)
      expect(tip).toBeGreaterThan(0)
      expect(tip).toBeLessThan(0.5)
    }
  })

  it('rings the picks all the way round, seven stations on a twist', () => {
    expect(DRUM.stations).toHaveLength(7)
    expect(DRUM.picksAround).toBeGreaterThanOrEqual(6)
    // One full turn per ring, and each station twisted on from the last, so
    // the drum has no rotational symmetry to hide its direction behind.
    const full = pickAngle(DRUM.picksAround, 0) - pickAngle(0, 0)
    expect(full).toBeCloseTo(2 * Math.PI, 9)
    expect(pickAngle(0, 1) - pickAngle(0, 0)).toBeCloseTo(DRUM.stationTwist, 9)
  })
})
