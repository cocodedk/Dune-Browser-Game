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

/**
 * LANDING. Height of the craft ORIGIN above the sand with the gear's feet on
 * it — not the craft's overall parked height. geometry/gear/stance.ts fixes
 * the plane every foot stands on at craft-local y = GROUND_Y = -4.30, so an
 * origin sitting 4.30m above heightAt() puts the skid soles exactly on the
 * surface. spec.ts's OVERALL.landedHeight (6.706) is a different measurement
 * of the same parked craft — sand to crown, the Box3 height — and parking the
 * ORIGIN at 6.706 would float the craft 2.4m off the ground. landing.test.ts
 * asserts this constant against stance.ts's own GROUND_Y so the two cannot
 * drift the way landedHeight silently did across rounds 6e-7.
 */
export const GEAR_HEIGHT = 4.3

/**
 * The touchdown gate. Faster or more tilted than these at the moment the gear
 * plane meets the sand and the craft keeps the old unconditional clamp
 * instead — no crash modelling, by ruling.
 *
 * 6 m/s of sink is a firm-but-survivable arrival for a rotary-wing craft
 * (about 2 m/s is comfortable, 3-4 firm); the scripted approach that proves
 * the lifecycle arrives at 2.5 m/s, so the gate is not tuned to its own test.
 * 12 degrees off level is the most attitude a craft can absorb through gear
 * this splayed and still settle rather than catch a skid — and it is the
 * total tilt, testing pitch and roll in one number via the craft's up axis.
 */
export const TOUCHDOWN_SINK_MAX = 6
export const TOUCHDOWN_TILT_MAX_DEG = 12
export const TOUCHDOWN_TILT_MIN_UP_Y = Math.cos(degToRad(TOUCHDOWN_TILT_MAX_DEG))

/** Wheel-less deceleration once down, m/s^2: a 16 m/s arrival stops in ~2s. */
export const GROUND_BRAKE = 8

/** Throttle that means "we are leaving": below it a landed craft winds down,
 *  at or above it the beat spools back up and the craft takes off. Clear of
 *  keyboard.ts's 0.45 start so a fresh session is unambiguously flying. */
export const TAKEOFF_THROTTLE = 0.35

/** Seconds for the wing drive to wind from full to stopped and back. Down is
 *  the slower of the two — a rotor-like run-down the eye can follow — and
 *  sits inside the 2-3s the round asked for; up is brisker so a takeoff does
 *  not feel like waiting for a lift. */
export const SPOOL_DOWN_SECONDS = 2.5
export const SPOOL_UP_SECONDS = 1.5

/** Attitude decay while resting on the gear, same closed-form shape as
 *  AUTO_LEVEL_RATE and faster: a craft with its feet on the sand settles onto
 *  its own gear in about a second rather than flying itself level. */
export const LANDED_LEVEL_RATE = 2.5

/**
 * Auto-level's per-second exponential decay rate on roll/pitch error:
 * error(t) = error(0) * exp(-AUTO_LEVEL_RATE * t), so it can never overshoot
 * by construction (the magnitude only ever shrinks). At 1.5, a 60-degree bank
 * clears to under 3 degrees in ~2.0s of held sim time -- see autoLevel.ts and
 * its test for the measured numbers.
 */
export const AUTO_LEVEL_RATE = 1.5
