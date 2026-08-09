// landscape-shop/sietch/src/testHelpers.ts
// Shared measurement helpers for seam.test.ts — split out once the guards
// grew past the 200-line rule (mirrors landscape-shop/cliff/src/
// testHelpers.ts). Not itself a test file; no vitest globals here.

import { Box3 } from 'three'
import type { Object3D, Mesh } from 'three'

export function withinOnePercent(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= expected * 0.01
}

export function boundsOf(part: Object3D): Box3 {
  part.updateMatrixWorld(true)
  return new Box3().setFromObject(part)
}

export function entranceOf(root: Object3D): Object3D {
  const entrance = root.getObjectByName('entrance')
  if (!entrance) throw new Error('entrance marker missing from the set')
  return entrance
}

export function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((child) => {
    const mesh = child as Mesh
    if (mesh.isMesh) meshes.push(mesh)
  })
  return meshes
}

/** True if any mesh's world-space bounding box satisfies `predicate` —
 *  shared by seam.test.ts's tier guards so each `it` stays a one-liner. */
export function someMeshBoxMatches(root: Object3D, predicate: (box: Box3) => boolean): boolean {
  return meshesOf(root).some((mesh) => predicate(new Box3().setFromObject(mesh)))
}
