// vehicle-shop/ornihopter/src/flight/rotation.ts
// Orientation integration: pilot pitch/roll/yaw demand -> a body-frame
// angular velocity vector -> one exact axis-angle rotation per step.
//
// Axis assignments (see spec.ts: -Z nose, +Y up, +X starboard):
//   pitch about local +X (the lateral/wing-to-wing axis)
//   yaw   about local +Y (the vertical axis)
//   roll  about local +Z (the fore-aft axis; +Z is the *tail* direction)
// These are the standard aviation body axes, just relabelled for a
// forward = -Z hull instead of forward = +X. The sign in front of each
// term below is not a guess: it was derived by rotating the relevant
// contracts.ts direction vector (nose or starboard) through rotate() by a
// small positive angle about the candidate axis and reading which way it
// actually moved. pitchAltitude.test.ts, yawHeading.test.ts and
// rollBank.test.ts each pin one of those derivations down as an assertion
// against the spec's axis convention (nose/starboard direction), not
// against this file's own math.

import type { FlightInput, Quat, Vec3 } from '../contracts'
import { starboardDirection } from '../contracts'
import { quatFromAxisAngle, quatMultiply, quatNormalise } from './quatMath'
import { PITCH_RATE_MAX, YAW_RATE_MAX, ROLL_RATE_MAX, BANK_TURN_GAIN } from './constants'

/** Body-frame angular velocity, rad/s, for the given demand and current bank. */
export function bodyAngularVelocity(orientation: Quat, input: FlightInput): Vec3 {
  const starboard = starboardDirection(orientation)

  return {
    // +1 pitch demand (nose up) needs a positive rotation about +X.
    x: input.pitch * PITCH_RATE_MAX,
    // -1 yaw demand (yaw left) needs a positive rotation about +Y, plus a
    // coordinated-turn term: a right bank (starboard.y < 0) yaws right.
    y: -input.yaw * YAW_RATE_MAX + BANK_TURN_GAIN * starboard.y,
    // +1 roll demand (roll right) needs a NEGATIVE rotation about +Z (the
    // tail axis) — equivalently a positive rotation about the nose axis.
    z: -input.roll * ROLL_RATE_MAX,
  }
}

/** Advance orientation by dt seconds under the given demand. Pure, stable for any dt >= 0. */
export function nextOrientation(orientation: Quat, input: FlightInput, dt: number): Quat {
  const omega = bodyAngularVelocity(orientation, input)
  const magnitude = Math.hypot(omega.x, omega.y, omega.z)
  if (magnitude < 1e-9) return orientation

  const angle = magnitude * dt
  const delta = quatFromAxisAngle(omega, angle)
  return quatNormalise(quatMultiply(orientation, delta))
}
