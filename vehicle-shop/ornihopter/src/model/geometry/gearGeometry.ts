// vehicle-shop/ornihopter/src/model/geometry/gearGeometry.ts
// Landing gear: six segmented insect legs, one mesh.
//
// What this replaces: three vertical struts per side, a capped cylinder each,
// with a flat plate on the bottom. Read against the reference kit
// (docs/dune_ornihopter_kit-2.png, the craft standing on its own legs) that
// was wrong in every way a stance can be wrong — one length for three
// different hip heights, so four of six feet hung in the air; nothing forward
// of the seat, so the deep pod it has to hold up sat outside the support
// polygon; and a smooth tube where the kit has slotted plate. gear/stance.ts
// owns the geometry of the stance and gear/leg.ts the geometry of one leg;
// this file is only the assembly and the mirror.
//
// THE MIRROR. Negating X inverts every triangle's handedness, so reusing one
// index list across both sides makes computeVertexNormals() point the
// mirrored side's normals inward and that side renders black under the same
// light as its twin. That is not hypothetical here: it is exactly what
// happened to the wings (see wingGeometry.ts's own note, and the blind
// critic's "left blades render lit tan and the right blades render pitch
// black"). The right side is built, then copied with X negated and TWO
// INDICES PER TRIANGLE SWAPPED. gearMesh.test.ts measures the normals rather
// than trusting this paragraph.

import { BufferGeometry, BufferAttribute, Uint16BufferAttribute } from 'three'
import { GEAR_LEGS } from './gear/stance'
import { pushLeg } from './gear/leg'
import type { MeshBuffers } from './gear/plate'

export { GEAR_LEGS, GROUND_Y } from './gear/stance'

/** Mirrors the accumulated buffer across X, re-winding as it goes. */
function mirrorAcrossX(buffers: MeshBuffers): void {
  const vertexCount = buffers.positions.length / 3
  const triangleCount = buffers.indices.length
  for (let i = 0; i < vertexCount; i++) {
    buffers.positions.push(
      -buffers.positions[i * 3],
      buffers.positions[i * 3 + 1],
      buffers.positions[i * 3 + 2],
    )
  }
  for (let i = 0; i < triangleCount; i += 3) {
    buffers.indices.push(
      buffers.indices[i] + vertexCount,
      buffers.indices[i + 2] + vertexCount,
      buffers.indices[i + 1] + vertexCount,
    )
  }
}

/**
 * One BufferGeometry holding all six legs — 432 triangles, one draw call.
 * The legs are static, so nothing is gained by giving each its own mesh and
 * per-instance transform the way the old strut/foot pair needed: each leg's
 * length, rake and splay differ (gear/stance.ts), so there was never one
 * shape to share.
 */
export function buildLandingGearGeometry(): BufferGeometry {
  const buffers: MeshBuffers = { positions: [], indices: [] }
  for (const leg of GEAR_LEGS) {
    if (leg.side > 0) pushLeg(buffers, leg)
  }
  mirrorAcrossX(buffers)

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(buffers.positions), 3))
  geometry.setIndex(new Uint16BufferAttribute(buffers.indices, 1))
  geometry.computeVertexNormals()
  return geometry
}
