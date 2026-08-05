// character-shop/stilgar/src/model/geometry/arm.ts
// One arm: stillsuit-sleeved upper arm and forearm (FABRIC) plus a massed
// bare hand (SKIN), tilted to the neutral A-pose. The armL/armR GROUP
// itself carries the ~25-30 degree abduction as a single static rotation —
// simpler and safer than bending the forearm, and it keeps armL/armR exact
// mirror images for silhouette.test.ts's bilateral-symmetry check.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { buildTwoSegmentLimb } from './limb'
import { attach, ballGeo } from './primitives'
import {
  upperArmLen, forearmLen, handLen, upperArmTopR, elbowR, forearmTopR, wristR, ARM_ABDUCTION_RAD,
} from '../proportions'

export type Side = 'L' | 'R'

const HAND_RX = wristR * 1.3
const HAND_RY = handLen * 0.45
const HAND_RZ = wristR * 1.1

export function buildArm(
  disposables: BufferGeometry[], armGroup: Group, side: Side,
  fabric: MeshStandardMaterial, skin: MeshStandardMaterial,
): void {
  // Palms-in has no geometry to get wrong yet: the hand is a single massed
  // blob (no thumb/fingers until a likeness round authors them), so there
  // is no palm-facing surface for this rotation to orient — the abduction
  // angle is the only pose input that matters at this fidelity.
  armGroup.rotation.z = side === 'L' ? -ARM_ABDUCTION_RAD : ARM_ABDUCTION_RAD

  const wristY = buildTwoSegmentLimb(disposables, armGroup, {
    material: fabric,
    topY: 0,
    upperTopR: upperArmTopR, upperBottomR: upperArmTopR * 0.86, upperLen: upperArmLen,
    jointR: elbowR,
    lowerTopR: forearmTopR, lowerBottomR: wristR, lowerLen: forearmLen,
    namePrefix: `arm${side}`,
  })

  attach(
    disposables, armGroup, ballGeo(HAND_RX, 1, HAND_RY / HAND_RX, HAND_RZ / HAND_RX),
    skin, 0, wristY - HAND_RY * 0.7, 0, `hand${side}`,
  )
}
