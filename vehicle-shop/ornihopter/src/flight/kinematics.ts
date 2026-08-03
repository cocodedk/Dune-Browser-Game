// vehicle-shop/ornihopter/src/flight/kinematics.ts
// Speed and position integration. Velocity is speed * nose direction PLUS
// one throttle-only vertical trim (see beatLiftTrim below) — the craft still
// never slips sideways or drifts off its own commanded heading, which is
// most of what made "nose leads" true by construction, but it is no longer
// exactly true: see noseLeads.test.ts's >0.99 tolerance, not ==1.
//
// The speed-rate equation is a point mass sliding along the nose direction:
// thrust forward, quadratic drag opposing motion, and gravity's component
// along the nose (positive when diving, negative when climbing). That last
// term is the whole of "trades speed for altitude": pitching the nose up
// does not just change facing, it directly costs speed in this equation.
// This equation is UNCHANGED by the weight fix below — pitchAltitude.test.ts
// and speedAltitudeTradeoff.test.ts pass on the exact same numbers as before.
//
// WEIGHT (Round 1 Finding 2: "there is no weight force. The craft cannot
// fall"). nose.y * speed is exactly zero in level flight at ANY throttle, so
// the equation above alone can never produce a sink — altitude changed only
// by pointing the nose, forever, including at idle. beatLiftTrim adds a
// second, independent vertical term standing in for the wing beat's lift
// against the craft's weight: strongly negative at idle, fading to exactly
// zero at HOVER_THROTTLE and above. It is deliberately NOT part of the speed
// equation (so `speed` and the pitch-trades-for-altitude mechanic above are
// untouched) and deliberately NOT integrated as its own accelerating state
// (so it needs no new persisted field on FlightState, which contracts.ts
// reserves for the lead) — it is a direct function of the current throttle,
// consistent with throttle's existing lack of spool lag elsewhere in this
// file (only the wing DRIVE spools, in flight/landing.ts).

import type { Vec3, Quat } from '../contracts'
import { noseDirection } from '../contracts'
import { clamp } from './scalarMath'
import { scale, add } from './vecMath'
import { THRUST_MAX, DRAG_K, GRAVITY, MAX_SPEED, HOVER_THROTTLE, BEAT_SINK_MAX } from './constants'

/** Smoothstep, 0..1: zero slope at both ends, so the trim below joins the
 *  flat "zero above hover" region with a matching derivative — genuinely
 *  smooth, not just continuous, at the hover threshold (see weightSink.test
 *  proof (e)). */
function smooth01(t: number): number {
  const c = clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}

/**
 * The beat's net lift versus the craft's weight, in m/s of vertical trim,
 * as a function of throttle alone. Zero at and above HOVER_THROTTLE (the
 * model reverts exactly to the pre-existing nose.y * speed equation there,
 * which is what keeps every above-hover test — pitchAltitude, noseLeads,
 * speedAltitudeTradeoff — passing on its original numbers). Below hover it
 * ramps to -BEAT_SINK_MAX at idle: a controlled, bounded sink rather than
 * the un-forced free-fall a bare "thrust minus weight" term would give.
 */
export function beatLiftTrim(throttle: number): number {
  if (throttle >= HOVER_THROTTLE) return 0
  const climbedFraction = smooth01(throttle / HOVER_THROTTLE)
  return -BEAT_SINK_MAX * (1 - climbedFraction)
}

export interface Kinematics {
  speed: number
  velocity: Vec3
  position: Vec3
}

export function nextKinematics(
  position: Vec3,
  speed: number,
  throttle: number,
  orientation: Quat,
  dt: number
): Kinematics {
  const nose = noseDirection(orientation)

  const thrustAccel = THRUST_MAX * throttle
  const dragAccel = DRAG_K * speed * speed
  const gravityAlongNose = GRAVITY * nose.y

  const speedRate = thrustAccel - dragAccel - gravityAlongNose
  const nextSpeed = clamp(speed + speedRate * dt, 0, MAX_SPEED)

  const noseVelocity = scale(nose, nextSpeed)
  const trim = beatLiftTrim(throttle)
  const velocity = { x: noseVelocity.x, y: noseVelocity.y + trim, z: noseVelocity.z }
  const nextPosition = add(position, scale(velocity, dt))

  return { speed: nextSpeed, velocity, position: nextPosition }
}
