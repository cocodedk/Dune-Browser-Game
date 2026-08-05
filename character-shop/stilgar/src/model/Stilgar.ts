// character-shop/stilgar/src/model/Stilgar.ts
// R1 "body and silhouette": a full-body massed figure replacing the
// placeholder-box armature. Group NAMES and NESTING are unchanged from the
// placeholder (root/pelvis/spine/chest/head/armL/armR/legL/legR) — later
// rounds build onto this same armature. Every mesh comes from geometry/*.ts;
// this file only builds the group tree, positions it exactly the way the
// placeholder did (same jointX/jointY convention), and wires materials +
// disposal. Static: no update() — see contracts.ts.

import { Group, BufferGeometry } from 'three'
import type { CharacterModel } from '../contracts'
import { PROPORTIONS } from '../spec'
import { legH, pelvisH, spineH, chestH, hipJointX } from './proportions'
import { createMaterials, disposeMaterials } from './materials'
import { buildTorso } from './geometry/torso'
import { buildShoulderWrap, buildTubeAndPocket } from './geometry/costume'
import { buildHead } from './geometry/head'
import { buildHood } from './geometry/hood'
import { buildBeard } from './geometry/beard'
import { buildArm } from './geometry/arm'
import { buildLeg } from './geometry/leg'

function makeGroup(parent: Group, name: string, x: number, y: number): Group {
  const g = new Group()
  g.name = name
  g.position.set(x, y, 0)
  parent.add(g)
  return g
}

export function createStilgar(): CharacterModel {
  const root = new Group()
  root.name = 'root'

  const pelvis = makeGroup(root, 'pelvis', 0, legH)
  const legL = makeGroup(pelvis, 'legL', -hipJointX, 0)
  const legR = makeGroup(pelvis, 'legR', hipJointX, 0)
  const spine = makeGroup(pelvis, 'spine', 0, pelvisH)
  const chest = makeGroup(spine, 'chest', 0, spineH)
  const armL = makeGroup(chest, 'armL', -PROPORTIONS.shoulderHalfWidth, chestH)
  const armR = makeGroup(chest, 'armR', PROPORTIONS.shoulderHalfWidth, chestH)
  const head = makeGroup(chest, 'head', 0, chestH)

  const disposables: BufferGeometry[] = []
  const materials = createMaterials()

  buildTorso(disposables, { pelvis, spine, chest }, materials.fabric)
  buildShoulderWrap(disposables, chest, materials.accent)
  buildTubeAndPocket(disposables, chest, materials.accent)
  buildHead(disposables, head, materials.skin)
  buildBeard(disposables, head, materials.hair)
  buildHood(disposables, head, materials.accent)
  buildArm(disposables, armL, 'L', materials.fabric, materials.skin)
  buildArm(disposables, armR, 'R', materials.fabric, materials.skin)
  buildLeg(disposables, legL, 'L', materials.fabric)
  buildLeg(disposables, legR, 'R', materials.fabric)

  return {
    root,
    dispose(): void {
      for (const geometry of disposables) geometry.dispose()
      disposeMaterials(materials)
      root.clear()
    },
  }
}
