// vehicle-shop/ornihopter/src/flight/landing.ts
// The landing lifecycle: touchdown -> rest -> spool-down -> takeoff. Round 1
// had none of it — ground contact was groundCollision.ts's position clamp plus
// a speed damp, so the craft skidded along on its belly at whatever attitude
// it arrived at, 4.3m of gear buried in the sand, wings beating forever. The
// user's ask was exactly those three symptoms: "make it land and stop beating
// the wings and not sink in the desert sand."
//
// WHY THIS IS A STATE, not a better clamp. A clamp is a per-step correction,
// so it has to be applied every step and it can only ever push. Resting on
// gear is a mode: the position is AUTHORED (origin at heightAt + GEAR_HEIGHT)
// rather than corrected toward, which is why a parked craft holds still to the
// last bit instead of jittering against a boundary it keeps falling through.
//
// The old clamp is still here and still unconditional for anything that is not
// a landing (see groundPhase's fallback): behaviour 5 of the brief, and the
// reason groundCollision.test.ts's 60s "never below terrain" proof is untouched.

import type { FlightState, Quat, Vec3 } from '../contracts'
import { noseDirection, upDirection, normalise } from '../contracts'
import { heightAt } from '../stage/terrain'
import { clampToGround } from './groundCollision'
import { levelOrientation } from './autoLevel'
import { wingsStowed } from './wingFold'
import type { Kinematics } from './kinematics'
import {
  GEAR_HEIGHT, TOUCHDOWN_SINK_MAX, TOUCHDOWN_TILT_MIN_UP_Y, GROUND_BRAKE,
  TAKEOFF_THROTTLE, SPOOL_DOWN_SECONDS, SPOOL_UP_SECONDS, LANDED_LEVEL_RATE,
} from './constants'

export interface GroundPhase {
  position: Vec3
  velocity: Vec3
  speed: number
  altitude: number
  orientation: Quat
  landed: boolean
  beatAmplitude: number
}

/** Linear ramp toward a target, one tick at a time. Linear on purpose: the
 *  per-tick change is a constant the spool test can name and bound, where an
 *  exponential's would depend on where in the run you looked. */
function ramp(current: number, target: number, seconds: number, dt: number): number {
  const step = dt / seconds
  return target > current ? Math.min(target, current + step) : Math.max(target, current - step)
}

/** The craft's heading flattened into the ground plane, so a nose still
 *  pitched from the approach rolls the craft ALONG the sand instead of into
 *  it. Normalised, so |velocity| stays exactly `speed` and the two can never
 *  fall out of agreement the way a projected vector would. */
function groundHeading(orientation: Quat): Vec3 {
  const nose = noseDirection(orientation)
  return normalise({ x: nose.x, y: 0, z: nose.z })
}

/** Sit the craft on its feet at (x, z), by construction rather than by clamp. */
function restingAt(x: number, z: number): Vec3 {
  return { x, y: heightAt(x, z) + GEAR_HEIGHT, z }
}

/** Did this step put the gear on the sand at a survivable sink and attitude?
 *  The crossing test (was above the gear plane, now is not) is what stops a
 *  craft that has just lifted off — sitting exactly AT the plane — from
 *  instantly re-landing, without needing a timer or a hysteresis band. */
function touchedDown(previous: Readonly<FlightState>, altitude: number, kinematics: Kinematics, orientation: Quat): boolean {
  if (previous.altitude <= GEAR_HEIGHT || altitude > GEAR_HEIGHT) return false
  if (-kinematics.velocity.y > TOUCHDOWN_SINK_MAX) return false
  return upDirection(orientation).y >= TOUCHDOWN_TILT_MIN_UP_Y
}

/** A step spent on the ground: brake or roll, settle level, wind the beat. */
function onGround(
  previous: Readonly<FlightState>,
  orientation: Quat,
  kinematics: Kinematics,
  throttle: number,
  spool: number,
  dt: number
): GroundPhase {
  // A stowed wing cannot make lift, so the throttle is REFUSED rather than
  // obeyed: the beat stays wound down and the craft stays on its feet until
  // the pilot unfolds. Chosen over auto-unfolding on throttle because the
  // fold is the pilot's switch — silently running a 2.6s mechanism nobody
  // asked for is how a control stops being trusted — and because it keeps
  // one demand per action. It is not a trap: the fold key is live in exactly
  // this state (foldAllowed is landed + beat stopped, which is what refusing
  // the takeoff preserves), so the way out is the same key that got here,
  // and ui/hud.ts says so on screen.
  const leaving = throttle >= TAKEOFF_THROTTLE && !wingsStowed(previous)
  const beatAmplitude = leaving
    ? ramp(spool, 1, SPOOL_UP_SECONDS, dt)
    : ramp(spool, 0, SPOOL_DOWN_SECONDS, dt)

  // The stick does not fly a craft that is standing on its legs: attitude
  // decays level either way, and the pilot gets it back the tick the gear
  // leaves the sand. A takeoff run rotates in the air, not on the feet.
  const settled = levelOrientation(orientation, dt, LANDED_LEVEL_RATE)
  // Under power the ordinary speed equation drives the takeoff run; closed,
  // the ground takes the speed off instead, all the way to a true zero.
  const speed = leaving ? kinematics.speed : Math.max(0, previous.speed - GROUND_BRAKE * dt)
  const heading = groundHeading(settled)

  const position = restingAt(
    previous.position.x + heading.x * speed * dt,
    previous.position.z + heading.z * speed * dt
  )

  return {
    position,
    velocity: { x: heading.x * speed, y: 0, z: heading.z * speed },
    speed,
    altitude: GEAR_HEIGHT,
    orientation: settled,
    // Wings at full beat and the throttle open: the gear leaves the sand.
    landed: !(leaving && beatAmplitude >= 1),
    beatAmplitude,
  }
}

/**
 * Resolve one step's contact with the ground. Pure: everything it needs about
 * the previous step arrives as `previous`, so it has no memory of its own and
 * the whole lifecycle is a function of published FlightState.
 */
export function groundPhase(
  previous: Readonly<FlightState>,
  orientation: Quat,
  kinematics: Kinematics,
  throttle: number,
  dt: number
): GroundPhase {
  const spool = previous.beatAmplitude ?? 1
  if (previous.landed === true) return onGround(previous, orientation, kinematics, throttle, spool, dt)

  const { position, velocity, speed } = kinematics
  const altitude = position.y - heightAt(position.x, position.z)

  if (touchedDown(previous, altitude, kinematics, orientation)) {
    const heading = groundHeading(orientation)
    // COHERENCE (user finding: "frozen at 4.3m", never moving again). A
    // craft that reaches the gear plane hot — throttle already at or above
    // TAKEOFF_THROTTLE — must not latch into a parked state it can never
    // leave under its own logic (spool-down only engages below that
    // throttle). Preferred over refusing the touchdown: the gear still
    // absorbs this step's descent (below), but the flag it hands back is
    // "flying", so the very same tick a pilot who never lifted off throttle
    // reads as an uninterrupted touch-and-go, not a landing that later has
    // to un-latch.
    const leaving = throttle >= TAKEOFF_THROTTLE
    return {
      position: restingAt(position.x, position.z),
      // The gear absorbs the descent: what is left is the landing roll.
      velocity: { x: heading.x * speed, y: 0, z: heading.z * speed },
      speed,
      altitude: GEAR_HEIGHT,
      orientation,
      landed: !leaving,
      beatAmplitude: spool,
    }
  }

  // Not a landing: the round-1 clamp, unchanged and still unconditional.
  const grounded = clampToGround(position, velocity, speed)
  return {
    ...grounded,
    orientation,
    landed: false,
    beatAmplitude: ramp(spool, 1, SPOOL_UP_SECONDS, dt),
  }
}
