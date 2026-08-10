// character-shop/chani/src/model/proportions.ts
// Every SKELETAL measurement the body-part builders share, derived once from
// PROPORTIONS. Vertical segments are exact fractions of bodyH (== heightM -
// headH), so the stack always sums to spec.heightM by construction and the
// seam test's 1% height budget is never a rounding contest.
//
// R1 pass 3 (2026-08-05): the surface radii that used to live here
// (pelvisFloorR/hipPeakR/waistR/ribcageR/limbR) are gone. They were single
// numbers per height, which is precisely the thing that made the figure
// flat: a body needs a front line AND a back line at every height. Those now
// live as authored Ring tables in the module that owns each mass (torso.ts,
// head.ts, hair.ts, costume.ts) and the numbers below are the joints,
// lengths and stance those tables hang from.

import { PROPORTIONS } from '../spec'

export interface Proportions {
  heightM: number
  headH: number
  bodyH: number
  legH: number
  pelvisH: number
  spineH: number
  chestH: number
  neckH: number
  /** hip joint -> knee, and knee -> ankle. */
  thighLen: number
  calfLen: number
  /** Ankle height above the ground; the boot's own rings run from Y=0 up
   *  past this, so the leg tube's open end is buried inside the boot. */
  ankleHeight: number
  footLength: number
  /** Leg-mass centres in WORLD half-width, not armature half-width: the
   *  legL/legR groups sit at hipHalfWidth because that is the hip the
   *  silhouette test measures, but the femur head is well inboard of the
   *  pelvis's widest point. Authoring the mass inboard of its own joint is
   *  what closes the crotch triangle pass 2 left open, and it gives the leg
   *  line a real inward run from hip to ankle. */
  hipMassHalfX: number
  kneeHalfX: number
  ankleHalfX: number
  /** shoulder joint -> elbow -> wrist -> fingertip. */
  upperArmLen: number
  lowerArmLen: number
  handLen: number
  shoulderHalfWidth: number
  hipHalfWidth: number
  /** Head half-width, half-jaw-width, nose mass radius. */
  skullR: number
  jawR: number
  noseR: number
}

export function deriveProportions(): Proportions {
  const { heightM, headHeightFraction, shoulderHalfWidth, hipHalfWidth } = PROPORTIONS
  const headH = (heightM * (headHeightFraction.min + headHeightFraction.max)) / 2
  const bodyH = heightM - headH

  const legH = bodyH * 0.56
  const pelvisH = bodyH * 0.09
  const spineH = bodyH * 0.15
  const chestH = bodyH * 0.17
  const neckH = bodyH * 0.03

  const footLength = heightM * 0.15
  const ankleHeight = legH * 0.08
  // Knee height is measured anthropometry (0.285 * stature), not a fraction
  // of the leg: the pelvis group sits at crotch height and the femur head
  // rises above it, so the VISIBLE thigh is SHORTER than the shin. Pass 2
  // split the leg 56/44 the other way and put the knee ~9cm low, which is
  // what made the shins read stubby.
  const kneeY = heightM * 0.285
  const thighLen = legH - kneeY
  const calfLen = kneeY - ankleHeight

  const armTotal = heightM * 0.44
  const upperArmLen = armTotal * 0.44
  const lowerArmLen = armTotal * 0.36
  const handLen = armTotal * 0.2

  return {
    heightM, headH, bodyH, legH, pelvisH, spineH, chestH, neckH,
    thighLen, calfLen, ankleHeight, footLength,
    hipMassHalfX: hipHalfWidth * 0.582,
    kneeHalfX: hipHalfWidth * 0.52,
    ankleHalfX: hipHalfWidth * 0.376,
    upperArmLen, lowerArmLen, handLen,
    shoulderHalfWidth, hipHalfWidth,
    skullR: headH * 0.31,
    jawR: headH * 0.21,
    noseR: headH * 0.075,
  }
}
