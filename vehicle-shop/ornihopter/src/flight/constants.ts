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

/**
 * WEIGHT. Round 1 Finding 2, unfixed until now: "there is no weight force.
 * The craft cannot fall." kinematics.ts's speed equation already subtracts
 * gravity's component ALONG THE NOSE, but that term is exactly zero in level
 * flight (nose.y = 0) at any throttle, which is why a level, idle craft used
 * to hold its altitude forever instead of settling. This is the missing
 * piece: a throttle-only vertical trim, independent of attitude, standing in
 * for the wing beat's lift versus the craft's weight.
 *
 * HOVER_THROTTLE is picked, not measured: it must sit strictly between
 * TAKEOFF_THROTTLE (0.35, below which a landed craft keeps winding down) and
 * CRUISE_THROTTLE (0.5, reset()'s default, which must go on cruising dead
 * level exactly as it always did). 0.4 splits that gap and sits comfortably
 * below keyboard.ts's 0.45 starting throttle, so a fresh session already
 * flies above hover and the pre-existing feel — level flight holds altitude,
 * pitch is what climbs or dives — is untouched for every throttle a fresh
 * session or the round-1 sign tests ever use (0.5, 0.6, 0.9, 1.0).
 *
 * At and above HOVER_THROTTLE the trim is exactly zero: kinematics.ts's
 * vertical velocity there is bit-for-bit nose.y * speed, the original
 * equation, which is what keeps pitchAltitude.test.ts and noseLeads.test.ts
 * passing unmodified — the fix only touches the band below hover.
 */
export const HOVER_THROTTLE = 0.4

/**
 * Terminal sink at throttle 0 in level attitude, m/s. Chosen inside the
 * round's target band (2.5-4) with margin either side of the proof's wider
 * [2.5, 4.5] tolerance, and comfortably under TOUCHDOWN_SINK_MAX (6) on its
 * own so a hands-off idle descent always qualifies for a landing rather than
 * the legacy crash clamp.
 */
export const BEAT_SINK_MAX = 3.2

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

/**
 * The last degree, in degrees PER SECOND. USER RULING, 2026-08-02: "auto level
 * must bring the craft to 0 bubble." An exponential never arrives -- MEASURED
 * at AUTO_LEVEL_RATE, a 4-second hold from a 60-degree bank still leaves 0.149
 * degrees of roll on the clock, which is a bubble that is nearly but not
 * centred, forever. Subtracting a fixed angular rate on top of the decay makes
 * the arrival FINITE (about 3.0s from 60 degrees) without touching the shape of
 * the recovery a pilot sees: the magnitude still only ever shrinks, so the
 * no-overshoot property is unchanged, and the term is small enough (1 deg/s
 * against an initial 90 deg/s of decay) that the first second is the same
 * flight.
 */
export const TERMINAL_LEVEL_RATE = 1
