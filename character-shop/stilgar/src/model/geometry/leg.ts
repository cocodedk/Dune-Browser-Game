// character-shop/stilgar/src/model/geometry/leg.ts
// One leg: stillsuit-covered thigh and calf (FABRIC) plus a boot mass
// (also FABRIC — desert boot, not bare skin) that reaches exactly to the
// ground. Legs stay straight (weight even, planted stance — no bend angle,
// same "implied not posed" joint approach as arm.ts) with the toe pointing
// -Z, the figure's own forward.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { buildTwoSegmentLimb } from './limb'
import { attach, taperedGeo } from './primitives'
import {
  thighH, calfH, bootH, thighTopR, kneeR, calfTopR, ankleR, bootHalfW, bootHalfD,
} from '../proportions'

export type Side = 'L' | 'R'

export function buildLeg(disposables: BufferGeometry[], legGroup: Group, side: Side, fabric: MeshStandardMaterial): void {
  const ankleY = buildTwoSegmentLimb(disposables, legGroup, {
    material: fabric,
    topY: 0,
    upperTopR: thighTopR, upperBottomR: thighTopR * 0.78, upperLen: thighH,
    jointR: kneeR,
    lowerTopR: calfTopR, lowerBottomR: ankleR, lowerLen: calfH,
    namePrefix: `leg${side}`,
  })

  // Boot: ankle down to the ground, stretched deeper (toe-to-heel) than
  // wide and shifted forward so more of its bulk sits ahead of the ankle
  // line than behind it, the way a foot actually hangs off a leg.
  const bootGeo = taperedGeo(ankleR * 1.1, bootHalfW, bootH, 10)
  bootGeo.scale(1, 1, bootHalfD / bootHalfW)
  attach(disposables, legGroup, bootGeo, fabric, 0, ankleY - bootH / 2, -bootHalfD * 0.35, `boot${side}`)
}
