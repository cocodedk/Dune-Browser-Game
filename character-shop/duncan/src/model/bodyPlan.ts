// character-shop/duncan/src/model/bodyPlan.ts
// ANATOMY LANDMARKS FIRST. Every height in this shop is a fraction of
// PROPORTIONS.heightM, laid out here before a single surface exists, and
// every station table in torso/arm/leg/head is authored to pass THROUGH
// these numbers. Nothing downstream invents a height of its own.
//
// Pass 4 (progress.md) replaced a budget that split the body into four
// stacked fractions of a leftover "bodyH". That arithmetic guaranteed the
// total came to heightM, and guaranteed nothing else: it put the chin at
// 0.916 of stature, which left the head 0.086 of the figure — a measured
// 11.6 head-units, a doll's head on a wall of shoulders, and the root cause
// of the "mecha" read no amount of shoulder tuning could have fixed.
//
// The frame: Y up from the ground, the face down -Z (seam.test.ts), X the
// figure's own right. Fractions are the standard artist's canon fitted to
// Momoa's Duncan — 7.7 head-units, wide lat spread, thick neck.

import { PROPORTIONS } from '../spec'

const H = PROPORTIONS.heightM
const { headHeightFraction, shoulderHalfWidth, hipHalfWidth } = PROPORTIONS

/** Crown to chin, mid-band of the spec's own range: 0.13 * 1.93 = 251mm,
 *  which is 7.69 head-units of stature. */
const headH = H * (headHeightFraction.min + headHeightFraction.max) / 2
const crownY = H * 0.993 // hair, not skull, is the figure's tallest point

export const LM = {
  H,
  headH,
  ground: 0,
  ankle: H * 0.039,
  calfBelly: H * 0.194,
  knee: H * 0.280,
  thighBelly: H * 0.443,
  crotch: H * 0.465,
  hipJoint: H * 0.485,
  trochanter: H * 0.510,
  hipCrest: H * 0.585,
  waist: H * 0.615,
  lowRib: H * 0.665,
  chest: H * 0.720,
  armpit: H * 0.755,
  shoulder: H * 0.820, // acromion — the TOP of the shoulder, not its width
  collar: H * 0.826, // where the fatigues' own neck opening sits
  elbow: H * 0.630,
  wrist: H * 0.485,
  eye: H * PROPORTIONS.eyeLineFraction,
  chin: crownY - headH,
  crown: crownY,
  hairTop: H, // the topknot, and the only thing that reaches stature height
} as const

/** Where the armature's joints sit. The groups are static pivots here (no
 *  animation — contracts.ts), but they are still the honest place to hang
 *  each region from, and every table is written in stature metres and
 *  offset by the owning group's height at build time (loft.ts originY). */
export const JOINTS = {
  pelvisY: LM.hipJoint,
  spineY: LM.waist,
  chestY: LM.chest,
  headY: LM.chin,
  /** Deltoid centre. Its own dome tops out on the acromion line; the arm
   *  hangs from here at ARM_ANGLE so the widest deltoid point lands on
   *  spec's shoulderHalfWidth. */
  // Pass 5: the widened deltoid at a 25-degree A-pose measured 0.2898 in
  // the shoulder band — past spec's own +10% ceiling of 0.286. The socket
  // moved inboard to hold the MEASURED half-width just under the ceiling
  // rather than the deltoid shrinking again; spec is the law, the socket
  // is not.
  shoulderX: 0.169,
  shoulderY: 1.548,
  shoulderZ: 0.004,
  hipX: 0.098,
} as const

/** The two widths spec.ts names, and the Y bands they are measured in —
 *  shared with proportions.test.ts so the test reads the same anatomy the
 *  builder aimed at, instead of the bounding box of some sub-mesh that
 *  happens to be called "chest". Shoulder half-width is the DELTOID's
 *  widest point (a shoulder is measured across the deltoids, and they sit
 *  30-50mm below the acromion); hip half-width is the pelvis at the
 *  trochanter, measured on the torso alone so the thighs cannot flatter it. */
export const MEASURE = {
  shoulderHalfWidth,
  hipHalfWidth,
  shoulderBand: [H * 0.775, H * 0.825] as const,
  hipBand: [LM.hipJoint, LM.hipCrest] as const,
} as const
