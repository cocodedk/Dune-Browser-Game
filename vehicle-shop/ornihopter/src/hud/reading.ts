// vehicle-shop/ornihopter/src/hud/reading.ts
// FlightState -> the six numbers a pilot flies on. Pure, no three.js, derived
// ONLY through contracts.ts's published direction helpers — the flight model's
// internals are not this module's business and reaching into them is how a
// display starts disagreeing with the craft it is bolted to.
//
// The angles are horizon-relative, which is the only definition a pitch ladder
// can use: pitch is the nose's elevation above the world horizontal, roll is
// how far the craft's own up-axis has fallen away from world up, heading is the
// nose's compass bearing with -Z as north (spec.ts fixes -Z as the nose, so a
// craft at the identity orientation reads 000/N and that is the sane default).

import type { FlightState } from '../contracts'
import { noseDirection, upDirection, starboardDirection } from '../contracts'
import { GEAR_HEIGHT } from '../flight/constants'

export interface HudReading {
  /** Degrees, positive nose-up. */
  pitchDeg: number
  /** Degrees, positive right wing down (starboard bank). */
  rollDeg: number
  /** Degrees 0..360, 0 = north. */
  headingDeg: number
  /** Metres above the terrain directly below, GEAR-relative: 0 on the
   *  ground. FlightState.altitude itself is ORIGIN-relative (0 puts the
   *  gear 4.3m into the sand; GEAR_HEIGHT puts the feet on it) because the
   *  flight model and its landing lifecycle are specified against the
   *  origin — see flight/constants.ts's GEAR_HEIGHT doc. A pilot never reads
   *  the origin height, so the subtraction happens once, here, at the
   *  display boundary, rather than pulling gear geometry into flight/. */
  altitude: number
  /** Metres per second. */
  speed: number
  /** 0..1. */
  throttle: number
  /** True while auto-level is holding roll/pitch toward level. Optional so
   *  interior/mfdLive.ts's own hand-built HudReading literal (it does not
   *  carry a live FlightState at construction time) keeps compiling unchanged
   *  — see contracts.ts's FlightInput/FlightState.autoLevel for the same
   *  reasoning. */
  autoLevel?: boolean
}

const DEG = 180 / Math.PI

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v))

export function readFlight(state: Readonly<FlightState>): HudReading {
  const nose = noseDirection(state.orientation)
  const up = upDirection(state.orientation)
  const right = starboardDirection(state.orientation)

  // atan2 rather than asin on the roll so a craft past 90 degrees of bank still
  // reports which way up it is instead of folding back on itself.
  return {
    pitchDeg: Math.asin(clamp1(nose.y)) * DEG,
    rollDeg: Math.atan2(-right.y, up.y) * DEG,
    headingDeg: (Math.atan2(nose.x, -nose.z) * DEG + 360) % 360,
    altitude: state.altitude - GEAR_HEIGHT,
    speed: state.speed,
    throttle: state.throttle,
    autoLevel: state.autoLevel === true,
  }
}

/** Shortest signed difference a - b in degrees, in -180..180. Every tape in
 *  this folder scrolls on this, so 359 and 001 are two degrees apart rather
 *  than most of a turn. */
export function angleDelta(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180
}
