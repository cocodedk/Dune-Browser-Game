// character-shop/stilgar/src/model/geometry/limb.ts
// The two-segment-plus-joint shape arm.ts and leg.ts both build: an upper
// segment, a joint bulge implying the elbow/knee (per the destination:
// "with elbow/knee implied" — a bulge and a radius change, not a bend
// angle; a static figure's joints do not need to look posed to read), and
// a lower segment. Shared here so the two files do not duplicate the walk-
// downward-from-the-joint placement math.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { attach, taperedGeo, ballGeo } from './primitives'

export interface TwoSegmentLimbSpec {
  material: MeshStandardMaterial
  topY: number
  upperTopR: number
  upperBottomR: number
  upperLen: number
  jointR: number
  lowerTopR: number
  lowerBottomR: number
  lowerLen: number
  namePrefix: string
}

/** Builds upper segment, joint bulge, lower segment, all hanging DOWNWARD
 *  from `topY` in `group`'s local frame (the shoulder/hip convention every
 *  armature group already uses). Returns the Y of the lower segment's
 *  bottom end, so the caller can attach a hand or a boot there. */
export function buildTwoSegmentLimb(disposables: BufferGeometry[], group: Group, spec: TwoSegmentLimbSpec): number {
  const {
    material, topY, upperTopR, upperBottomR, upperLen, jointR, lowerTopR, lowerBottomR, lowerLen, namePrefix,
  } = spec

  attach(
    disposables, group, taperedGeo(upperTopR, upperBottomR, upperLen),
    material, 0, topY - upperLen / 2, 0, `${namePrefix}Upper`,
  )

  const jointY = topY - upperLen
  attach(disposables, group, ballGeo(jointR), material, 0, jointY, 0, `${namePrefix}Joint`)

  attach(
    disposables, group, taperedGeo(lowerTopR, lowerBottomR, lowerLen),
    material, 0, jointY - lowerLen / 2, 0, `${namePrefix}Lower`,
  )

  return jointY - lowerLen
}
