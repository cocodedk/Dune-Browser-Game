// vehicle-shop/ornihopter/src/model/wingKinematics.ts
// Pure per-wing angle maths, driven only by the shared beatPhase the flight
// model owns (contracts.ts FlightState.beatPhase) — no clock of its own, so
// the rig can never drift out of sync with the aircraft's actual beat.
//
// Four wing pairs, front to back, matching spec.ts WING_ROOTS / WING.sweepDeg
// index order (0 = frontmost). Adjacent pairs beat in antiphase (alternating
// by index parity); left and right of the SAME pair share that pair's phase
// exactly — the only per-side difference lives in WingRig.ts, which flips
// the sign of the rigid Fold/Flap rotations to match the mirrored blade
// geometry (geometry/wingGeometry.ts), not in the phase itself.

import { WING } from '../spec'

export type WingSide = 'left' | 'right'

const DEG_TO_RAD = Math.PI / 180
const FLAP_AMPLITUDE = WING.flapHalfAngleDeg * DEG_TO_RAD
const FEATHER_AMPLITUDE = WING.featherAmplitudeDeg * DEG_TO_RAD

/** Pair 0 is frontmost (spec.ts WING_ROOTS[0]); pairs alternate phase by parity. */
export function pairPhaseOffset(pairIndex: number): number {
  return pairIndex % 2 === 0 ? 0 : Math.PI
}

/** Static fan angle for this pair's Fold pivot, radians — not phase-driven. */
export function foldAngle(pairIndex: number): number {
  return WING.sweepDeg[pairIndex] * DEG_TO_RAD
}

/**
 * Flap pivot angle (about the fore-aft axis), radians, before WingRig.ts's
 * side mirror. Amplitude is WING.flapHalfAngleDeg either way from neutral —
 * total travel is twice that, per spec.ts's own description of the constant.
 */
export function flapAngle(beatPhase: number, pairIndex: number): number {
  return FLAP_AMPLITUDE * Math.sin(beatPhase + pairPhaseOffset(pairIndex))
}

/**
 * Feather pivot angle (about the blade's own span axis), radians. Quarter-
 * cycle out of phase with flap (cos vs sin), so angle of attack peaks near
 * mid-stroke and crosses zero at the top/bottom reversal. No side mirror
 * needed — see WingRig.ts for why.
 */
export function featherAngle(beatPhase: number, pairIndex: number): number {
  return FEATHER_AMPLITUDE * Math.cos(beatPhase + pairPhaseOffset(pairIndex))
}
