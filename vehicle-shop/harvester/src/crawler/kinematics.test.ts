// vehicle-shop/harvester/src/crawler/kinematics.test.ts
// The correctness bar for "acts like a harvester": forward/reverse, the
// differential (steer splits the track speeds, never the body speed),
// heading direction from above, terrain riding, and the wheel-rotation sign.
// Every assertion is mechanical — a flipped sign or a swapped track fails.

import { describe, it, expect } from 'vitest'
import { nextCrawler, rideAt, wheelAngularSpeed } from './kinematics'
import { OVERALL } from '../spec'
import { heightAt } from '../stage/terrain'
import { MAX_SPEED, MAX_REVERSE } from './constants'

const IDLE = { position: { x: 0, y: 0, z: 0 }, yaw: 0, speed: 0 }

function drive(throttle: number, steer: number, seconds: number, dt = 0.1): ReturnType<typeof nextCrawler> {
  let s = nextCrawler(IDLE, { throttle, steer }, 0)
  for (let t = dt; t <= seconds; t += dt) {
    s = nextCrawler(s, { throttle, steer }, dt)
  }
  return s
}

describe('forward and reverse', () => {
  it('full forward moves the machine toward -Z (the nose direction)', () => {
    const s = drive(1, 0, 6)
    expect(s.position.z).toBeLessThan(-20)
    expect(s.speed).toBeCloseTo(MAX_SPEED, 1)
  })

  it('full reverse moves toward +Z, slower than forward', () => {
    const s = drive(-1, 0, 6)
    expect(s.position.z).toBeGreaterThan(10)
    expect(s.speed).toBeCloseTo(-MAX_REVERSE, 1)
  })

  it('throttle demand is clamped', () => {
    expect(drive(2, 0, 6).speed).toBeCloseTo(MAX_SPEED, 1)
    expect(drive(-2, 0, 6).speed).toBeCloseTo(-MAX_REVERSE, 1)
  })
})

describe('differential steering', () => {
  it('steer right (+1) turns the heading clockwise seen from above: yaw decreases', () => {
    const s = drive(0.6, 1, 5)
    expect(s.yaw).toBeLessThan(-0.2)
  })

  it('steer left (-1) turns the heading counter-clockwise: yaw increases', () => {
    const s = drive(0.6, -1, 5)
    expect(s.yaw).toBeGreaterThan(0.2)
  })

  it('steer splits the track speeds opposite ways and never the body speed', () => {
    const straight = drive(0.8, 0, 6)
    const turning = drive(0.8, 1, 6)
    expect(turning.trackLeft).toBeGreaterThan(turning.trackRight)
    expect(Math.abs(turning.speed - straight.speed)).toBeLessThan(0.001)
  })

  it('spins in place with zero throttle: heading changes, position barely moves', () => {
    const s = drive(0, 1, 4)
    expect(Math.abs(s.yaw)).toBeGreaterThan(0.4)
    expect(Math.hypot(s.position.x, s.position.z)).toBeLessThan(0.2)
  })
})

describe('terrain ride', () => {
  it('position.y is exactly the ride height, which is the mean of the four track corners', () => {
    const s = drive(0.5, 0.3, 3)
    const ride = rideAt(s.position.x, s.position.z, s.yaw)
    expect(s.position.y).toBeCloseTo(ride.y, 6)
    expect(s.pitch).toBe(ride.pitch)
    expect(s.roll).toBe(ride.roll)
  })

  it('the machine never sinks below the terrain under its own footprint (bar: ground contact)', () => {
    // ride.y is the mean of the four track-corner terrain heights, and a
    // mean is never below its own minimum — so no corner can be buried. The
    // centre height is NOT the right comparison: cresting a dune, the four
    // corners sit lower than the centre point, and the machine legitimately
    // rides the mean.
    const span = OVERALL.trackSpan
    const half = OVERALL.wheelbase / 2
    for (let i = 0; i < 200; i++) {
      const s = drive(0.9, Math.sin(i * 0.1), 2)
      const cx = Math.cos(s.yaw)
      const sx = Math.sin(s.yaw)
      const corners = [
        { x: s.position.x - half * sx - span / 2 * cx, z: s.position.z - half * cx + span / 2 * sx },
        { x: s.position.x - half * sx + span / 2 * cx, z: s.position.z - half * cx - span / 2 * sx },
        { x: s.position.x + half * sx - span / 2 * cx, z: s.position.z + half * cx + span / 2 * sx },
        { x: s.position.x + half * sx + span / 2 * cx, z: s.position.z + half * cx - span / 2 * sx },
      ].map((c) => heightAt(c.x, c.z))
      const lowest = Math.min(...corners)
      expect(s.position.y).toBeGreaterThanOrEqual(lowest - 1e-6)
    }
  })

  it('pitch and roll stay small on the gentle test area', () => {
    const s = drive(0.8, 0.4, 6)
    expect(Math.abs(s.pitch)).toBeLessThan(0.04)
    expect(Math.abs(s.roll)).toBeLessThan(0.04)
  })
})

describe('track wheels', () => {
  it('forward track speed rolls the wheel the sign that keeps the ground contact still', () => {
    // omega = -v / r: positive forward speed -> negative rotation about +X.
    expect(wheelAngularSpeed(5, OVERALL.wheelRadius)).toBeCloseTo(-5 / OVERALL.wheelRadius, 10)
    expect(wheelAngularSpeed(-5, OVERALL.wheelRadius)).toBeCloseTo(5 / OVERALL.wheelRadius, 10)
  })
})
