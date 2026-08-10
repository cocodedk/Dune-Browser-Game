// landscape-shop/sietch/src/testHelpers.ts
// Shared measurement helpers for seam.test.ts — split out once the guards
// grew past the 200-line rule (mirrors landscape-shop/cliff/src/
// testHelpers.ts). Not itself a test file; no vitest globals here.

import { Box3, Vector3 } from 'three'
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

/** The R3 dressing subtree (model/dressing/Dressing.ts), which owns its
 *  own three materials and its own zone groups. */
export function dressingOf(root: Object3D): Object3D {
  const dressing = root.getObjectByName('dressing')
  if (!dressing) throw new Error('dressing group missing from the set')
  return dressing
}

/** Everything the R2 rounds built: the set minus the dressing. The
 *  material-family guard measures the HALL, so adding props may never
 *  quietly relax it. */
export function hallMeshesOf(root: Object3D): Mesh[] {
  const props = new Set<Object3D>()
  dressingOf(root).traverse((child) => props.add(child))
  return meshesOf(root).filter((mesh) => !props.has(mesh))
}

/** The dressing's meshes grouped by the zone they hang under — the tree
 *  IS the zone membership (model/dressing/Dressing.ts), so a piece cannot
 *  leave its cluster without this map changing. */
export function dressingZonesOf(root: Object3D): Map<string, Mesh[]> {
  const zones = new Map<string, Mesh[]>()
  for (const zone of dressingOf(root).children) zones.set(zone.name, meshesOf(zone))
  return zones
}

/** Every world-space vertex of a mesh, as [x, y, z] triples. */
export function worldVerticesOf(mesh: Mesh): number[][] {
  mesh.updateMatrixWorld(true)
  const position = mesh.geometry.attributes.position
  const point = new Vector3()
  const out: number[][] = []
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position as never, i).applyMatrix4(mesh.matrixWorld)
    out.push([point.x, point.y, point.z])
  }
  return out
}

/** True if any mesh's world-space bounding box satisfies `predicate` —
 *  shared by seam.test.ts's tier guards so each `it` stays a one-liner. */
export function someMeshBoxMatches(root: Object3D, predicate: (box: Box3) => boolean): boolean {
  return meshesOf(root).some((mesh) => predicate(new Box3().setFromObject(mesh)))
}
