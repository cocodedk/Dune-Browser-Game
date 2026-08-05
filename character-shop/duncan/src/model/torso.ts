// character-shop/duncan/src/model/torso.ts
// The macro landmass: ONE lofted surface from the crotch to the collar
// opening — pelvis, glute seat, waist, ribcage, lat spread and the
// trapezius ramp are all the same skin, so there is no seam to step at and
// no flat disc anywhere on it. Then ONE meso mass on that landmass: the
// trapezius pads that carry the neck-to-deltoid line.
//
// Neither the PECTORAL nor the GLUTE is a blob any more, and for the same
// reason both times. As paired ellipsoids they read as objects stuck to a
// barrel — the pecs as a bust rising out of the chest rig's top edge, the
// glutes as two balls with a crease between them in the back view. Both
// masses now live in the TABLE: rf 154mm against rb 132mm through
// 1.39-1.42m is the chest, rb 150mm against rf 108mm at the trochanter is
// the seat. Same volume, one surface, no seam to notice.
//
// Pass 4 (progress.md) replaced three stacked elliptical cylinders. Their
// worst artifact was structural, not cosmetic: the top cylinder was capped
// with a horizontal disc at the shoulder line, which at bust framing read
// as a tabletop with a head sitting on it, and the arms bolted to its rim
// as pauldrons. A closed surface cannot branch, so the SHOULDER is not part
// of this loft at all: the deltoid belongs to the arm (arm.ts) and the
// trapezius bridges the two as a meso mass below.
//
// Real Z-depth is authored, not implied — and pass 4's values were TIMID,
// which a critic caught and the render confirmed: the back edge of the left
// profile ran nearly straight from shoulder to hip (0.112 -> 0.128 -> 0.116,
// a 16mm wobble over 400mm) and the seat barely cleared the thigh. A spine
// is not a line. Reading the `back` column below downwards, the edge now
// changes direction THREE times:
//
//   1.580 -> 1.457   0.118 -> 0.144   thoracic curve, carrying rearward
//   1.457 -> 1.187   0.144 -> 0.096   the long sweep into the LUMBAR HOLLOW
//   1.187 -> 0.984   0.096 -> 0.184   the seat, 88mm of glute projection
//   0.984 -> 0.897   0.184 -> 0.140   back under the buttock
//
// The glute peak stands 62mm proud of the thigh's own back (leg.ts, 0.122),
// so the fold between them is a real step in profile, not a suggestion. On
// the front, the pec crown at -0.174 leads the abdomen by 36mm and the waist
// by 54mm. Left profile is where all of this is checked, and the check is
// the RENDER, not this table.

import { Group } from 'three'
import type { DuncanMaterials } from './materials'
import { blob } from './primitives'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'
import { LM, JOINTS } from './bodyPlan'

/** Stature metres. rig.ts samples this same table so the chest rig and belt
 *  can never sit off the body they are worn on. */
export const TORSO_STATIONS: Station[] = [
  //                        rx      rb      rf      cz          back    front
  { y: LM.crotch, rx: 0.150, rb: 0.126, rf: 0.100, cz: 0.014 }, // 0.140  -0.086
  { y: LM.hipJoint, rx: 0.174, rb: 0.168, rf: 0.104, cz: 0.014 }, // 0.182 -0.090
  { y: LM.trochanter, rx: 0.184, rb: 0.172, rf: 0.106, cz: 0.012 }, // 0.184 -0.094
  { y: LM.hipCrest, rx: 0.176, rb: 0.130, rf: 0.106, cz: 0.000 }, // 0.130 -0.106
  { y: LM.waist, rx: 0.164, rb: 0.104, rf: 0.112, cz: -0.008 }, // 0.096  -0.120
  { y: LM.lowRib, rx: 0.186, rb: 0.118, rf: 0.128, cz: -0.010 }, // 0.108 -0.138
  { y: LM.chest, rx: 0.206, rb: 0.134, rf: 0.164, cz: -0.010 }, // 0.124  -0.174
  { y: 1.420, rx: 0.212, rb: 0.140, rf: 0.162, cz: -0.006 }, //     0.134  -0.168
  { y: LM.armpit, rx: 0.216, rb: 0.144, rf: 0.152, cz: 0.000 }, //  0.144  -0.152
  { y: 1.510, rx: 0.198, rb: 0.140, rf: 0.130, cz: 0.004 }, //      0.144  -0.126
  { y: 1.550, rx: 0.166, rb: 0.124, rf: 0.112, cz: 0.010 }, //      0.134  -0.102
  { y: 1.580, rx: 0.120, rb: 0.104, rf: 0.088, cz: 0.014 }, //      0.118  -0.074
]

// The seat: a rounded end, not a flat bottom. It reaches below the crotch
// landmark into the span where both thigh lofts have already crossed the
// midline — which is what closes the crotch as SOLID rather than as two
// shapes that meet at a notch.
const SEAT_DOME = 0.030
const COLLAR_RISE = 0.012

export interface Torso {
  pelvis: Group
  spine: Group
  chest: Group
}

export function buildTorso(bin: Bin, materials: DuncanMaterials, root: Group): Torso {
  const pelvis = new Group()
  pelvis.name = 'pelvis'
  pelvis.position.set(0, JOINTS.pelvisY, 0)
  root.add(pelvis)

  // One mesh, hung from the base of the armature chain: the surface spans
  // pelvis, spine and chest, so it cannot live in any one of them.
  loft(bin, pelvis, TORSO_STATIONS, materials.fabric, 'torsoMass', {
    originY: JOINTS.pelvisY, rings: 56, radial: 32,
    domeBottomH: SEAT_DOME, topCapRise: COLLAR_RISE,
  })

  const spine = new Group()
  spine.name = 'spine'
  spine.position.set(0, JOINTS.spineY - JOINTS.pelvisY, 0)
  pelvis.add(spine)

  const chest = new Group()
  chest.name = 'chest'
  chest.position.set(0, JOINTS.chestY - JOINTS.spineY, 0)
  spine.add(chest)

  for (const side of [-1, 1] as const) {
    // Trapezius: the bridge from the collar opening out to the deltoid
    // cap. Its inner end crosses the midline so no gap opens beside the
    // neck; its outer end is buried deep inside the deltoid so the two
    // read as one slope rather than as a plate meeting an arm. It is the
    // only thing carrying the shoulder above the collar rim, because a
    // closed surface cannot branch and the deltoid belongs to the arm.
    blob(bin, pelvis, 0.116, 0.054, 0.074, materials.fabric,
      side * 0.078, 1.556 - JOINTS.pelvisY, 0.012, 'trapezius')
  }

  return { pelvis, spine, chest }
}
