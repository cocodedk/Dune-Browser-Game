// character-shop/stilgar/src/model/measure.ts
// Bounding-box measurement helpers shared by silhouette.test.ts and the dev
// harness's capture handle (debug.ts) — one definition of "shoulder half-
// width means the chest group's direct meshes" so the number a critic reads
// off tools/shoot.mjs's manifest.json is the exact number the test gates.
// Not a test file itself (no describe/it) — production code the test
// imports, never the other way round.

import { Box3 } from 'three'
import type { Object3D, Mesh } from 'three'

export function namedOrThrow(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (!found) throw new Error(`"${name}" missing from the armature`)
  return found
}

/** Bounding box of a group's DIRECT mesh children only — does not descend
 *  into nested armature groups (e.g. chest's armL/armR/head). Caller must
 *  have updated the root's world matrices first. */
export function directMeshBBox(group: Object3D): Box3 {
  const box = new Box3()
  for (const child of group.children) {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) continue
    mesh.geometry.computeBoundingBox()
    const meshBox = new Box3()
    if (mesh.geometry.boundingBox) meshBox.copy(mesh.geometry.boundingBox)
    meshBox.applyMatrix4(mesh.matrixWorld)
    box.union(meshBox)
  }
  return box
}

export function halfWidthX(box: Box3): number {
  return Math.max(Math.abs(box.min.x), Math.abs(box.max.x))
}
