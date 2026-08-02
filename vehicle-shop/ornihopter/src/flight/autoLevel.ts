// vehicle-shop/ornihopter/src/flight/autoLevel.ts
// AUTO-LEVEL: user finding, apache-gauntlet.md B5 -- "I might need an option
// to auto-level the craft when it gets out of control." A held key (see
// input/keyboard.ts) sets FlightInput.autoLevel; rotation.ts calls
// levelOrientation() INSTEAD OF the stick-driven pitch/roll integration
// whenever it is true, so a conflicting stick demand cannot fight it. Heading
// (and therefore altitude and throttle, which this never touches) stay under
// manual control -- this is auto-LEVEL, not an autopilot.
//
// WHY DECAY THE ANGLE, not run a rate-integrated PD controller: the flight
// model carries no angular-velocity state (see contracts.ts's FlightState), so
// a spring-damper needs a derivative it does not have. Decaying the CURRENT
// pitch/roll error by exp(-AUTO_LEVEL_RATE * dt) every step is closed-form --
// exact for any dt, including the largest constants.ts allows -- and by
// construction can never overshoot: the remaining error's magnitude only ever
// shrinks, so "no overshoot" is a property of the shape, not a gain that
// happens to hit it.
//
// pitchOf/rollOf/headingOf read the SAME orientation vectors hud/reading.ts
// does (nose/up/starboard from contracts.ts), independently re-derived here so
// flight/ does not depend on hud/ -- reading.ts's own docstring is explicit
// that dependency runs the other way. fromEuler is their exact inverse: for
// any heading, rotating the local nose (0,0,-1) by roll leaves it unchanged
// (it lies on the roll axis), so pitchOf/headingOf never see roll, and by the
// same argument rollOf never sees heading or pitch once cos(pitch) is
// factored out -- the three axes recompose losslessly for any attitude short
// of the pitch gimbal, the same caveat reading.ts already carries.

import type { Quat } from '../contracts'
import { noseDirection, upDirection, starboardDirection } from '../contracts'
import { quatFromAxisAngle, quatMultiply, quatNormalise } from './quatMath'
import { AUTO_LEVEL_RATE } from './constants'

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v))

function headingOf(orientation: Quat): number {
  const nose = noseDirection(orientation)
  return Math.atan2(nose.x, -nose.z)
}

function pitchOf(orientation: Quat): number {
  return Math.asin(clamp1(noseDirection(orientation).y))
}

function rollOf(orientation: Quat): number {
  return Math.atan2(-starboardDirection(orientation).y, upDirection(orientation).y)
}

/** Rebuild an orientation from heading/pitch/roll, all in radians. */
function fromEuler(headingRad: number, pitchRad: number, rollRad: number): Quat {
  const yaw = quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -headingRad)
  const pitch = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, pitchRad)
  const roll = quatFromAxisAngle({ x: 0, y: 0, z: 1 }, -rollRad)
  return quatNormalise(quatMultiply(quatMultiply(yaw, pitch), roll))
}

/**
 * Decays roll and pitch toward zero over dt seconds; heading passes through
 * untouched. Pure function of (orientation, dt) -- no memory between calls,
 * so releasing the key never leaves a residual effect on the next tick.
 *
 * @param rate per-second decay rate. Defaults to the pilot's auto-level;
 * flight/landing.ts passes its own faster one for a craft settling onto its
 * gear, because that settle is the airframe sitting down on six legs, not the
 * autopilot flying the aircraft level.
 */
export function levelOrientation(orientation: Quat, dt: number, rate = AUTO_LEVEL_RATE): Quat {
  const decay = Math.exp(-rate * Math.max(dt, 0))
  const heading = headingOf(orientation)
  const pitch = pitchOf(orientation) * decay
  const roll = rollOf(orientation) * decay
  return fromEuler(heading, pitch, roll)
}
