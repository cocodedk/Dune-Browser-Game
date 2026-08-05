// character-shop/chani/src/model/Chani.ts
// R1 "body and silhouette": a full-body massed figure — authored body forms
// (torso.ts, head.ts, hair.ts, costume.ts, arms.ts, legs.ts), replacing the
// R0 placeholder boxes. The armature group tree (root/pelvis/spine/chest/
// head/armL/armR/legL/legR) and every joint offset are UNCHANGED from the
// placeholder: later rounds and the release adapter (character-shop/docs/
// gauntlet-loop.md) depend on these names and this nesting, not on what
// fills them. Static: no update() — see contracts.ts.

import { Group, type Mesh } from 'three'
import type { CharacterModel } from '../contracts'
import { PROPORTIONS } from '../spec'
import { deriveProportions } from './proportions'
import { createMaterials } from './materials'
import { buildTorso } from './torso'
import { buildHead } from './head'
import { buildHair } from './hair'
import { buildCollar } from './costume'
import { buildArms } from './arms'
import { buildLegs } from './legs'

function group(name: string, parent: Group, x: number, y: number, z = 0): Group {
  const g = new Group()
  g.name = name
  g.position.set(x, y, z)
  parent.add(g)
  return g
}

export function createChani(): CharacterModel {
  const p = deriveProportions()
  const mat = createMaterials()

  const root = new Group()
  root.name = 'root'

  const pelvis = group('pelvis', root, 0, p.legH)
  const legL = group('legL', pelvis, -PROPORTIONS.hipHalfWidth, 0)
  const legR = group('legR', pelvis, PROPORTIONS.hipHalfWidth, 0)
  const spine = group('spine', pelvis, 0, p.pelvisH)
  const chest = group('chest', spine, 0, p.spineH)
  // Shoulder joints sit 14% of the chest below its top. R1 pass 3 lowered
  // them from the placeholder's chestH: at chestH the joint was level with
  // the trapezius, which left ~46mm between shoulder and chin and no neck
  // to speak of. The armature NAMES and NESTING — what later rounds and the
  // release adapter bind to — are untouched.
  const shoulderY = p.chestH * 0.86
  const armL = group('armL', chest, -PROPORTIONS.shoulderHalfWidth, shoulderY)
  const armR = group('armR', chest, PROPORTIONS.shoulderHalfWidth, shoulderY)
  const head = group('head', chest, 0, p.chestH + p.neckH)

  const meshes: Mesh[] = [
    ...buildTorso({ pelvis, chest }, p, mat),
    ...buildHead(head, p, mat),
    ...buildHair(head, p, mat),
    ...buildCollar(chest, p, mat),
    ...buildArms({ armL, armR }, p, mat),
    ...buildLegs({ legL, legR }, p, mat),
  ]

  return {
    root,
    dispose(): void {
      for (const mesh of meshes) mesh.geometry.dispose()
      for (const material of mat.all) material.dispose()
      root.clear()
    },
  }
}
