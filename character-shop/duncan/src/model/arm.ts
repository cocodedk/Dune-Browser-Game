// character-shop/duncan/src/model/arm.ts
// ONE surface from the deltoid cap to the wrist, plus a leather cuff and the
// hand. The deltoid is the top of THIS loft, not a plate on the torso — that
// is the whole point: a shoulder that belongs to the arm blends into the
// arm, and a shoulder bolted to the ribcage is a pauldron. torso.ts's
// trapezius mass laps over the deltoid's inboard side to finish the join.
//
// The taper is alive, not linear. Reading down the table: deltoid swell,
// deltoid insertion, bicep/tricep belly, a narrowing to the ELBOW WAIST,
// then the forearm swells AGAIN before it runs down to a wrist that is
// flatter side-to-side than it is deep. A cone can do none of that.
//
// Pass 5: the A-pose went back to 25 degrees. Pass 4 narrowed it to 17 to
// buy daylight under the arm, and paid for it in the only currency that
// counts at silhouette framing — BREADTH. A blind critic read the result as
// "slender, sex-ambiguous". 25 degrees carries the deltoid's mass outboard
// where the shoulder line can actually be seen.
//
// Stations are written as WORLD heights and converted, so every landmark
// bodyPlan.ts fixes survives the tilt exactly: elbow 0.630H, wrist 0.485H,
// fingertip 0.385H. Change the angle and they still land — which is the
// whole reason not to hand-write local offsets, as pass 4 did.

import { Group, MathUtils } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'
import { LM, JOINTS } from './bodyPlan'

const ARM_ANGLE_DEG = 25
const COS_ARM = Math.cos(MathUtils.degToRad(ARM_ANGLE_DEG))

/** World height -> distance down the arm's own tilted axis. */
function s(worldY: number): number {
  return -(JOINTS.shoulderY - worldY) / COS_ARM
}

const SLEEVE: Station[] = [
  { y: s(0.912), rx: 0.032, rb: 0.040, rf: 0.034 }, // cuff end, past the wrist
  { y: s(LM.wrist), rx: 0.035, rb: 0.043, rf: 0.037 },
  { y: s(1.051), rx: 0.049, rb: 0.050, rf: 0.050 },
  { y: s(1.157), rx: 0.060, rb: 0.061, rf: 0.063 }, // forearm swell
  { y: s(LM.elbow), rx: 0.055, rb: 0.059, rf: 0.055 }, // elbow WAIST
  { y: s(1.271), rx: 0.064, rb: 0.068, rf: 0.064 },
  { y: s(1.357), rx: 0.073, rb: 0.079, rf: 0.075 }, // bicep/tricep belly
  { y: s(1.424), rx: 0.079, rb: 0.083, rf: 0.081 }, // deltoid insertion
  { y: s(1.494), rx: 0.086, rb: 0.089, rf: 0.087 }, // deltoid belly, widest
  { y: 0, rx: 0.083, rb: 0.086, rf: 0.084 },
]

/** Rolled-leather cuff. The sleeve has to END somewhere, and pass 4 let it
 *  end on a bare taper, which read as an unexplained oval of skin on the
 *  forearm. Committing to the read costs one ring. */
const CUFF: Station[] = [
  { y: s(0.912), rx: 0.036, rb: 0.044, rf: 0.038 },
  { y: s(0.952), rx: 0.041, rb: 0.047, rf: 0.042 },
  { y: s(0.986), rx: 0.044, rb: 0.049, rf: 0.045 },
]

/** Palms toward the thighs, so the hand's broad plane faces front-to-back:
 *  thin in X, wide in Z. Its top station is narrower than the sleeve at the
 *  same height and sits inside it — skin first appears below the cuff. */
const HAND: Station[] = [
  { y: s(0.743), rx: 0.020, rb: 0.034, rf: 0.028 }, // fingertips, 0.385H
  { y: s(0.813), rx: 0.027, rb: 0.050, rf: 0.046 },
  { y: s(0.870), rx: 0.028, rb: 0.052, rf: 0.050 },
  { y: s(0.908), rx: 0.027, rb: 0.044, rf: 0.042 },
  { y: s(0.932), rx: 0.024, rb: 0.032, rf: 0.030 },
]

/** 47mm of dome above the last station puts the top of the shoulder on the
 *  acromion line with no ring of flat geometry up there. */
const DELTOID_DOME = 0.047

/** side: -1 for armL (-X), +1 for armR (+X). */
export function buildArm(bin: Bin, materials: DuncanMaterials, side: -1 | 1): Group {
  const group = new Group()
  group.name = side < 0 ? 'armL' : 'armR'
  group.rotation.z = MathUtils.degToRad(ARM_ANGLE_DEG) * side

  loft(bin, group, SLEEVE, materials.fabric, 'armMass', {
    rings: 46, radial: 28, domeTopH: DELTOID_DOME, domeBottomH: 0.014,
  })
  loft(bin, group, CUFF, materials.accent, 'cuff', { rings: 8, radial: 24 })
  loft(bin, group, HAND, materials.skin, 'hand', {
    rings: 20, radial: 24, domeTopH: 0.010, domeBottomH: 0.018,
  })

  return group
}
