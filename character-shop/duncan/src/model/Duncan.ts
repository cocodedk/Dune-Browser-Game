// character-shop/duncan/src/model/Duncan.ts
// Full-body assembly: root/pelvis/spine/chest/head/armL/armR/legL/legR, the
// armature contracts.ts and seam.test.ts require. Every part builder owns
// its own geometry; this file only wires them onto the armature, collects
// their geometries into one disposal bin and disposes the four shared
// materials once. Static: no update() — see contracts.ts.
//
// Pass 4 (progress.md) is a topology change, not a tuning pass: the figure
// is now SIX lofted surfaces (torso, two arms, two legs, head parts) with
// meso masses laid on them, where it used to be twenty-odd cylinders,
// capsules and spheres stacked end to end. The armature groups survive
// unchanged — they are the joint pivots, and the seam rests on them — but
// each continuous region is one mesh, so it can no longer step at a seam or
// cap itself with a disc.

import { Group } from 'three'
import type { BufferGeometry } from 'three'
import type { CharacterModel } from '../contracts'
import { buildMaterials, disposeMaterials } from './materials'
import { buildTorso } from './torso'
import { buildRig } from './rig'
import { buildArm } from './arm'
import { buildLeg } from './leg'
import { buildHead } from './head'
import { JOINTS } from './bodyPlan'

export function createDuncan(): CharacterModel {
  const materials = buildMaterials()
  const geometries: BufferGeometry[] = []

  const root = new Group()
  root.name = 'root'

  const { pelvis, chest } = buildTorso(geometries, materials, root)
  // The rig hangs off the pelvis with the torso surface it is sampled from,
  // not off the chest: one parent for one costume, one frame for both.
  buildRig(geometries, materials, pelvis)

  for (const side of [-1, 1] as const) {
    const leg = buildLeg(geometries, materials, side)
    leg.position.set(JOINTS.hipX * side, 0, 0)
    pelvis.add(leg)

    const arm = buildArm(geometries, materials, side)
    arm.position.set(JOINTS.shoulderX * side, JOINTS.shoulderY - JOINTS.chestY, JOINTS.shoulderZ)
    chest.add(arm)
  }

  const head = buildHead(geometries, materials)
  head.position.set(0, JOINTS.headY - JOINTS.chestY, 0)
  chest.add(head)

  return {
    root,
    dispose(): void {
      for (const geometry of geometries) geometry.dispose()
      disposeMaterials(materials)
      root.clear()
    },
  }
}
