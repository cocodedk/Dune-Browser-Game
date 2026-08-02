// vehicle-shop/harvester/src/model/testSupport.ts
// Shared helpers for the per-component bounding tests (hull.test.ts,
// tracks.test.ts, cutter.test.ts, cab.test.ts, machinery.test.ts) and for
// ../assembled-footprint.test.ts. Split out of the old components.test.ts
// (round I0) so each component's assertions grow in their own file without
// re-declaring `mats()`/`bounds()` everywhere — that headroom is the point,
// since I1-I5 each add to one component's test file.
//
// NOT a test file itself (no `describe`/`it`), so vitest does not try to run
// it as a suite — it is exercised indirectly by every suite that imports it.
// Built with throwaway materials and measured off the REAL geometry (Box3),
// never off spec constants — a stale spec entry and a stale builder cannot
// cancel each other out.

import { Box3, Vector3, MeshStandardMaterial } from 'three'
import type { Object3D } from 'three'

export function mats() {
  return {
    body: new MeshStandardMaterial(),
    dark: new MeshStandardMaterial(),
    wheel: new MeshStandardMaterial(),
    accent: new MeshStandardMaterial(),
  }
}

export function bounds(group: Object3D): { min: Vector3; max: Vector3; size: Vector3 } {
  group.updateMatrixWorld(true)
  const box = new Box3().setFromObject(group)
  const size = box.getSize(new Vector3())
  return { min: box.min, max: box.max, size }
}

/** Every descendant carrying `name`, in build order. Measuring a named part
 *  instead of a whole group is how the belt tests tell a plate from a lug or
 *  a sprocket's drum from its teeth. Call updateMatrixWorld(true) on the ROOT
 *  first when you measure a descendant: bounds() only refreshes the subtree
 *  it is handed, so a nested mesh would otherwise inherit a stale transform. */
export function named(root: Object3D, name: string): Object3D[] {
  const found: Object3D[] = []
  root.traverse((child) => {
    if (child.name === name) found.push(child)
  })
  return found
}
