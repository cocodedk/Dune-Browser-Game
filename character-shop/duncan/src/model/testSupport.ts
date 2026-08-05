// character-shop/duncan/src/model/testSupport.ts
// Shared helpers for this shop's own tests, measured off real geometry
// (Box3), never off spec constants — mirrors the vehicle shops'
// testSupport.ts pattern (vehicle-shop/harvester/src/model/testSupport.ts,
// read as reference only, never imported — the fence forbids it).
//
// NOT a test file itself (no describe/it), so vitest does not try to run it
// as a suite — it is exercised indirectly by every suite that imports it.

import { Box3, Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'

export function bounds(object: Object3D): { min: Vector3; max: Vector3; size: Vector3 } {
  object.updateMatrixWorld(true)
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  return { min: box.min, max: box.max, size }
}

/** Every descendant carrying `name`, in build order. Call
 *  root.updateMatrixWorld(true) yourself before measuring a part found this
 *  way — bounds() only refreshes the subtree it is directly handed, so a
 *  nested mesh measured on its own would otherwise combine a fresh local
 *  matrix with a stale (identity) parent chain. */
export function named(root: Object3D, name: string): Object3D[] {
  const found: Object3D[] = []
  root.traverse((child) => {
    if (child.name === name) found.push(child)
  })
  return found
}

/** The one named descendant, or throws — every call site here wants
 *  exactly one match and a clear failure if the armature ever loses a
 *  name, not a silently-empty array. */
export function part(root: Object3D, name: string): Object3D {
  const [first] = named(root, name)
  if (!first) throw new Error(`no part named "${name}" in the armature`)
  return first
}

/** The widest half-width found in a HEIGHT BAND, walked vertex by vertex in
 *  world space. A bounding box cannot answer "how wide is this figure at the
 *  shoulder line" once a region is one continuous surface spanning many
 *  landmarks — it only knows the widest point anywhere. Pass 4 moved
 *  proportions.test.ts onto this so the measurement is anatomical (the
 *  deltoid band, the trochanter band) instead of "the bounding box of
 *  whichever mesh happens to be named chest". */
export function halfWidthInBand(object: Object3D, yMin: number, yMax: number): number {
  object.updateMatrixWorld(true)
  const v = new Vector3()
  let widest = 0
  object.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      mesh.localToWorld(v)
      if (v.y < yMin || v.y > yMax) continue
      widest = Math.max(widest, Math.abs(v.x))
    }
  })
  return widest
}
