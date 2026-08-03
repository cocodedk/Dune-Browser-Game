// vehicle-shop/ornihopter/src/model/wingFoldPose.ts
// The PARKED pose: where each of the eight blades sits when the wings are
// stowed, and every pose between there and the spread stance. Pure angle
// maths, no three.js — WingRig.ts turns these into Object3D rotations exactly
// as it does wingKinematics.ts's beat angles, through the SAME two pivots.
// No geometry moves: a fold is a rotation about the root ball joint that is
// already there.
//
// WHY TWO ANGLES PER BLADE. The Fold pivot (about local Y) sweeps the blade
// aft along the boom — that is the film's parked silhouette. On its own it
// would lay all four blades of a side into one horizontal plane at their own
// root height, and two of those roots are 0.126m apart (spec.ts WING_ROOTS
// pairs 1 and 3, both flank arms, 5.30m apart in z at x ~ 2.27): the forward
// one's blade would run straight through the aft one's root. So each blade
// also carries a static TILT on the Flap pivot, which is what turns a merged
// plank into a nested stack with air between the blades. The numbers below are
// AUTHORED and then MEASURED — model/wingFoldClearance.test.ts sweeps the
// whole path and reports the worst pair.
//
// SIGN CONVENTION is wingKinematics.foldAngle's: positive yaw swings the tip
// toward the nose, so the spread fan is +16..-16 (spec.ts WING.sweepDeg) and
// stowed is near -90 — straight aft. Positive tilt lifts the tip. WingRig.ts
// applies `mirror` to both, so one signed number poses both sides.

import { WING } from '../spec'
import { foldAngle } from './wingKinematics'

const DEG_TO_RAD = Math.PI / 180

export interface FoldedPose {
  /** Fold-pivot angle, degrees. ~-90 is straight aft along the boom. */
  readonly yawDeg: number
  /** Flap-pivot angle, degrees. Lifts (+) or drops (-) the stowed tip, which
   *  is what separates the stack. */
  readonly tiltDeg: number
}

/**
 * Per pair, front to back, matching spec.ts WING_ROOTS order.
 *
 * pair 0 — forward deck arm, pivot (1.586, 1.982). The highest root; lifts
 *   1.5 degrees so it opens away from pair 2's root, which its blade passes
 *   over 5.30m out.
 * pair 1 — forward flank arm, pivot (2.286, -0.503). The hard one, and the
 *   reason these are MEASURED numbers rather than four times -90. Its lane aft
 *   is blocked twice over: the aft gear leg's hip fairing rises to y = -0.303
 *   at x ~ 1.96 right where the blade would pass, and pair 3's own root sits
 *   5.30m aft of it only 0.126m higher. Inboard is the hull chine (half-width
 *   2.39 at midships), so the way through is OUT and DOWN: 6 degrees of yaw
 *   short of square puts the blade outboard of the gear, 6 degrees of droop
 *   takes it under pair 3's root. A search over yaw -95..-77 x tilt -8..+8,
 *   scored on the worst clearance along the WHOLE path, is what found this
 *   corner; four blades folded flat at -90 collide with the gear at every
 *   tilt in that range.
 * pair 2 — aft deck arm, pivot (1.586, 1.259). Droops 1 degree, opening the
 *   gap to pair 0 above it rather than closing it.
 * pair 3 — aft flank arm, pivot (2.253, -0.377). Droops 3 degrees: it is the
 *   lowest blade over the boom's aft half and this keeps it off the drooping
 *   tail fork without reaching for the sand.
 *
 * MEASURED worst clearance anywhere on the path, all eight blades against the
 * hull, the gear, the fork and each other: 0.158m — see wingFoldClearance.test.ts.
 */
export const FOLDED: readonly FoldedPose[] = [
  { yawDeg: -90, tiltDeg: 1.5 },
  { yawDeg: -84, tiltDeg: -6 },
  { yawDeg: -90, tiltDeg: -1 },
  { yawDeg: -90, tiltDeg: -3 },
]

/**
 * How far into the shared fold each pair is. The blades do NOT all start
 * together: the forward pairs lead by STAGGER of the window each, so the fan
 * closes front to back and the eight tips still arrive at the same instant —
 * the forward blades have ~100 degrees of arc to cover against the aft pairs'
 * ~75, so leading them is what matches the rates the eye sees.
 *
 * It stays a ONE-parameter family: every reachable pose is the pose at some
 * progress in [0, 1], which is what lets the clearance test sweep the entire
 * path instead of a sampled subset of eight independent clocks.
 */
const STAGGER = 0.1

export function pairProgress(pairIndex: number, progress: number): number {
  const start = pairIndex * STAGGER
  const span = 1 - (WING.perSide - 1) * STAGGER
  return Math.min(1, Math.max(0, (progress - start) / span))
}

function lerp(a: number, b: number, t: number): number {
  return t <= 0 ? a : t >= 1 ? b : a + (b - a) * t
}

/** Fold-pivot angle for this pair at fold progress `p`, radians. */
export function foldYawAt(pairIndex: number, progress: number): number {
  return lerp(
    foldAngle(pairIndex),
    FOLDED[pairIndex].yawDeg * DEG_TO_RAD,
    pairProgress(pairIndex, progress),
  )
}

/** Flap-pivot angle for this pair at fold progress `p`, radians. The beat's
 *  own stroke is NOT part of this: a folded wing does not feather. */
export function foldTiltAt(pairIndex: number, progress: number): number {
  return lerp(0, FOLDED[pairIndex].tiltDeg * DEG_TO_RAD, pairProgress(pairIndex, progress))
}
