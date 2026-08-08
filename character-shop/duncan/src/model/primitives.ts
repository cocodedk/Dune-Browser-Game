// character-shop/duncan/src/model/primitives.ts
// What is left after pass 4's method change: the ONLY three shapes allowed
// outside loft.ts, and the rule for when each may be used.
//
//   blob      — a MESO mass laid on top of a lofted macro surface (pectoral,
//               glute, trapezius, brow ridge, ear, topknot). Never a body
//               region on its own: an ellipsoid standing in for a skull, a
//               beard or a joint is what read as "geometric cones and
//               spheres, not living form" for three passes running.
//   box/rbox  — genuinely RIGID hardware only: the boot's sole and shaft,
//               the chest rig's straps. A boot really is a stiff shell with
//               edges; an arm never is.
//
// Everything continuous — torso, arms, legs, neck, skull, beard, hair — is a
// station table skinned by loft.ts. See stations.ts for why.
//
// Every helper pushes its geometry onto the caller's disposal bin, so
// Duncan.ts's dispose() is one loop over one array regardless of how many
// part files fed it.

import {
  BoxGeometry, Mesh, SphereGeometry,
  type BufferGeometry, type MeshStandardMaterial, type Object3D,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export type Bin = BufferGeometry[]

function land(
  bin: Bin, parent: Object3D, geometry: BufferGeometry, material: MeshStandardMaterial,
  x: number, y: number, z: number, name: string,
): Mesh {
  bin.push(geometry)
  const mesh = new Mesh(geometry, material)
  mesh.position.set(x, y, z)
  mesh.name = name
  parent.add(mesh)
  return mesh
}

/** A sharp-edged rigid mass — the chest rig's straps. */
export function box(
  bin: Bin, parent: Object3D, w: number, h: number, d: number,
  material: MeshStandardMaterial, x: number, y: number, z: number, name = '',
): Mesh {
  return land(bin, parent, new BoxGeometry(w, h, d), material, x, y, z, name)
}

/** A softened rigid mass — the boot shaft and sole. `radius` must stay
 *  under half the smallest dimension. */
export function roundedBox(
  bin: Bin, parent: Object3D, w: number, h: number, d: number, radius: number,
  material: MeshStandardMaterial, x: number, y: number, z: number, name = '',
): Mesh {
  return land(bin, parent, new RoundedBoxGeometry(w, h, d, 3, radius), material, x, y, z, name)
}

/** A meso mass — a unit sphere scaled per-axis and BAKED into the geometry
 *  (not mesh.scale), so a later Box3 measures the true size directly with no
 *  scale factor for a test to carry. 18x12 segments by default: these sit ON
 *  a 32-sided loft and must not be the faceted thing beside a smooth one.
 *
 *  `segments` exists for the ONE case where the default is not enough. The
 *  eyeball sits in a 108-segment skull and shows through a 30mm aperture at
 *  head framing, where 12 rings across a 20mm globe are visible facets — and
 *  a faceted eye is the one place on this face where a polygon edge reads as
 *  a defect rather than as stylisation. */
export function blob(
  bin: Bin, parent: Object3D, radiusX: number, radiusY: number, radiusZ: number,
  material: MeshStandardMaterial, x: number, y: number, z: number, name = '',
  segments: [number, number] = [18, 12],
): Mesh {
  const geometry = new SphereGeometry(1, segments[0], segments[1])
  geometry.scale(radiusX, radiusY, radiusZ)
  return land(bin, parent, geometry, material, x, y, z, name)
}
