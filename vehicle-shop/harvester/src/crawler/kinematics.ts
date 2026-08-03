// vehicle-shop/harvester/src/crawler/kinematics.ts
// The pure per-step crawler: demand -> track speeds -> position/heading ->
// terrain ride. No three.js, no mutable state — the whole step is a function
// of (state, input, dt), which is what makes it unit-testable.
//
// The machine is a differential-steered crawler, exactly like the film's:
// two independent track bands, and everything the machine does falls out of
// their two speeds. Steer never touches the body speed directly — it only
// makes one track faster and the other slower, and the yaw rate is the
// speed DIFFERENCE over the track span. That is why a harvester can spin in
// place with zero forward speed: both tracks running opposite ways.
//
// AXIS CONVENTION (spec.ts): -Z forward, +Y up, +X starboard, positive yaw
// turns the nose to port (CCW from above). The wheel-rotation sign is pinned
// by a test so it cannot quietly mirror.

import type { Vec3 } from '../contracts'
import { OVERALL } from '../spec'
import { heightAt } from '../stage/terrain'
import { clamp } from './scalarMath'
import { MAX_SPEED, MAX_REVERSE, MAX_ACCEL, STEER_DIFF, MAX_DT } from './constants'

export interface TerrainRide {
  y: number
  pitch: number
  roll: number
}

/** Local-to-world offset for a local (lateral, forward-aft) point at yaw.
 *  lx is lateral (+ = starboard), lz is along the hull (+ = aft). */
function worldOffset(lx: number, lz: number, yaw: number): Vec3 {
  return {
    x: lx * Math.cos(yaw) - lz * Math.sin(yaw),
    y: 0,
    z: -lx * Math.sin(yaw) - lz * Math.cos(yaw),
  }
}

/** Sample the terrain under the four track corners and derive the machine's
 *  ride: height, nose-up pitch, and starboard-up roll. The corners are the
 *  real contact points of the two track bands, so a machine climbing a dune
 *  tilts nose-up and a machine crossing a ridge banks with it. */
export function rideAt(x: number, z: number, yaw: number): TerrainRide {
  const span = OVERALL.trackSpan
  const half = OVERALL.wheelbase / 2
  const corners = [
    { lx: -span / 2, lz: -half }, // front-left
    { lx: +span / 2, lz: -half }, // front-right
    { lx: -span / 2, lz: +half }, // rear-left
    { lx: +span / 2, lz: +half }, // rear-right
  ].map((c) => {
    const o = worldOffset(c.lx, c.lz, yaw)
    return heightAt(x + o.x, z + o.z)
  })
  const [fl, fr, rl, rr] = corners
  const y = (fl + fr + rl + rr) / 4
  const pitch = Math.atan2((fl + fr) / 2 - (rl + rr) / 2, OVERALL.wheelbase)
  const roll = Math.atan2((fr + rr) / 2 - (fl + rl) / 2, span)
  return { y, pitch, roll }
}

/** Signed angular speed of one track wheel, rad/s about the wheel's axle
 *  (+X local). Forward motion (moving -Z) rolls the wheel so its ground
 *  contact point stands still: v_contact = v_centre + omega x r = 0 gives
 *  omega = -v / radius. Pinned by wheelSign.test so the visual cannot
 *  silently run the tracks backwards. */
export function wheelAngularSpeed(trackSpeed: number, radius: number): number {
  return -trackSpeed / radius
}

export function nextCrawler(
  state: Readonly<CrawlerStateInput>,
  input: Readonly<{ throttle: number; steer: number }>,
  rawDt: number
): CrawlerStateLike {
  const dt = clamp(rawDt, 0, MAX_DT)
  const throttle = clamp(input.throttle, -1, 1)
  const steer = clamp(input.steer, -1, 1)

  // Rate-limited approach to the demanded speed: heavy, no snap.
  const target = throttle >= 0 ? throttle * MAX_SPEED : throttle * MAX_REVERSE
  const delta = clamp(target - state.speed, -MAX_ACCEL * dt, MAX_ACCEL * dt)
  const speed = state.speed + delta

  // Differential: steer splits the demand between the two bands. Turning
  // right (+1) runs the LEFT band faster, so the machine pivots toward the
  // right — yaw decreasing, which is clockwise from above.
  const trackLeft = speed + steer * STEER_DIFF
  const trackRight = speed - steer * STEER_DIFF
  const yawRate = (trackRight - trackLeft) / OVERALL.trackSpan
  const yaw = state.yaw + yawRate * dt

  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  const nx = state.position.x + fx * speed * dt
  const nz = state.position.z + fz * speed * dt
  const ride = rideAt(nx, nz, yaw)

  return {
    position: { x: nx, y: ride.y, z: nz },
    yaw,
    pitch: ride.pitch,
    roll: ride.roll,
    speed,
    trackLeft,
    trackRight,
  }
}

/** The subset of CrawlerState nextCrawler reads; exported so the pure step
 *  can be tested without a full model. */
export interface CrawlerStateInput {
  position: Vec3
  yaw: number
  speed: number
}

/** What nextCrawler returns; structurally identical to contracts.CrawlerState. */
export interface CrawlerStateLike {
  position: Vec3
  yaw: number
  pitch: number
  roll: number
  speed: number
  trackLeft: number
  trackRight: number
}
