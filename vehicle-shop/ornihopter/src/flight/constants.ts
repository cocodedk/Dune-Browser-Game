// vehicle-shop/ornihopter/src/flight/constants.ts
// All flight-dynamics tuning in one place, so a later balance pass has one
// file to open instead of a hunt through the integrator.

export const TWO_PI = Math.PI * 2

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Rotation rates at full control demand, in rad/s. */
export const PITCH_RATE_MAX = degToRad(30)
export const YAW_RATE_MAX = degToRad(20)
export const ROLL_RATE_MAX = degToRad(60)

/**
 * Extra yaw rate coupled to bank angle (rad/s at a full 90-degree bank), so
 * holding roll curves the flight path the way a real banked turn does,
 * instead of just tilting the hull in place while flying dead straight.
 */
export const BANK_TURN_GAIN = degToRad(25)

/** Speed dynamics, in m/s^2 unless noted. */
export const THRUST_MAX = 46
export const DRAG_K = 0.006
export const GRAVITY = 9.81
export const MAX_SPEED = 140

/** Speed multiplier applied once per step while the hull is skimming the ground. */
export const GROUND_CONTACT_DAMPING = 0.985

/** Wing beat frequency bounds, in Hz. The film's craft reads fast; never go below the min. */
export const BEAT_HZ_MIN = 1.5
export const BEAT_HZ_MAX = 4.0

/** reset() defaults: already airborne, half throttle, level, nose forward. */
export const CRUISE_ALTITUDE = 60
export const CRUISE_THROTTLE = 0.5
export const CRUISE_SPEED = 50

/** Hard ceiling on the integration step, matching main.ts's own frame-time clamp. */
export const MAX_DT = 0.1
