// character-shop/stilgar/src/model/geometry/primitives.ts
// Small shared mesh-building helpers every body-part file composes from —
// one definition of "attach a mesh to a group, track it for dispose" so
// there is one, not eight (mirrors vehicle-shop/harvester's hullDetail.ts
// box()/rbox() pattern). Named forms only: tapered cylinders for limb and
// torso segments, scaled spheres (ellipsoids) for masses and joint bulges —
// no literal BoxGeometry as a primary form, which is the placeholder's
// language, not this round's.

import {
  BufferGeometry, CylinderGeometry, SphereGeometry, Mesh, MeshStandardMaterial, Group,
} from 'three'

/** Attach `geometry` as a named mesh at (x, y, z) in `group`'s local frame.
 *  Pushes the geometry onto `disposables` so the caller's dispose() can
 *  free it without every builder re-implementing the bookkeeping. */
export function attach(
  disposables: BufferGeometry[], group: Group, geometry: BufferGeometry,
  material: MeshStandardMaterial, x: number, y: number, z: number, name = '',
): Mesh {
  disposables.push(geometry)
  const mesh = new Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(x, y, z)
  group.add(mesh)
  return mesh
}

/** A tapered cylinder — the limb-segment and torso-taper workhorse. Centred
 *  on its own local origin, spanning -height/2..+height/2 (callers place it
 *  with `attach`'s y). */
export function taperedGeo(radiusTop: number, radiusBottom: number, height: number, segments = 12): CylinderGeometry {
  return new CylinderGeometry(radiusTop, radiusBottom, height, segments)
}

/** A scaled sphere (ellipsoid) — masses, joint bulges, the skull. Baking the
 *  scale into the geometry (not the mesh) keeps every consumer's bounding-
 *  box math simple: Box3.setFromObject sees the true radii directly. */
export function ballGeo(radius: number, rx = 1, ry = 1, rz = 1, segments = 14): SphereGeometry {
  const geometry = new SphereGeometry(radius, segments, Math.max(8, segments - 4))
  geometry.scale(rx, ry, rz)
  return geometry
}
