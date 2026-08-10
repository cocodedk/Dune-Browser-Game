// landscape-shop/cliff/src/model/paintRock.ts
// Writes model/strata.ts + model/weathering.ts onto real geometry as vertex
// colours. No canvas, no image, no DOM — every gate here runs in node.
//
// TWO MODES, because the two kinds of surface in this set are built
// differently and want opposite things:
//
//   paintFaces    — the baked massif. model/massif.ts splits it with
//                   toNonIndexed() so every facet keeps a FLAT normal, and a
//                   flat-shaded facet wants one flat colour: the whole
//                   triangle is sampled at its own centroid. Band edges then
//                   land on facet edges, which is how a low-poly cliff reads
//                   as bedded rock instead of a smudged gradient.
//   paintVertices — the procedural grids (prow, lip, skirt). They are indexed
//                   lattices a few meters across with smoothed normals, so
//                   they can carry a real gradient and are sampled per vertex.
//
// Materials are switched to vertexColors with a WHITE base colour: three
// multiplies the two, so leaving the old tint on would darken everything
// twice. surfaceR2.test.ts guards that.

import { BufferAttribute, Color, SRGBColorSpace } from 'three'
import type { BufferGeometry, Mesh, MeshStandardMaterial } from 'three'
import { bandColorAt, beddingHeightAt, type BeddingPlane } from './strata'
import { weather, type Point } from './weathering'

/** 1 on rock touching the gate's aperture, 0 clear of it. */
export type HaloAt = (x: number, y: number) => number

const NO_HALO: HaloAt = () => 0

function rockColorAt(plane: BeddingPlane, p: Point, n: Point, halo: number): [number, number, number] {
  return weather(bandColorAt(beddingHeightAt(plane, p.x, p.y, p.z)), p, n, halo)
}

/** Colours authored above are DISPLAY (sRGB) values, the same convention
 *  model/socketTone.ts uses, so they go through the colour-space conversion
 *  once here rather than being guessed at in linear space. */
function writeSrgb(colors: Float32Array, at: number, rgb: [number, number, number], scratch: Color): void {
  scratch.setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace)
  colors[at] = scratch.r
  colors[at + 1] = scratch.g
  colors[at + 2] = scratch.b
}

export function paintFaces(
  geometry: BufferGeometry,
  planeAt: (triangle: number) => BeddingPlane,
  halo: HaloAt = NO_HALO,
): void {
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const scratch = new Color()
  const triangles = position.count / 3
  for (let t = 0; t < triangles; t++) {
    const base = t * 3
    const centre = centroid(position, base)
    const normal = faceNormal(position, base)
    const rgb = rockColorAt(planeAt(t), centre, normal, halo(centre.x, centre.y))
    for (let k = 0; k < 3; k++) writeSrgb(colors, (base + k) * 3, rgb, scratch)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
}

export function paintVertices(
  geometry: BufferGeometry,
  plane: BeddingPlane,
  halo: HaloAt = NO_HALO,
): void {
  const position = geometry.attributes.position
  const normals = geometry.attributes.normal
  const colors = new Float32Array(position.count * 3)
  const scratch = new Color()
  for (let i = 0; i < position.count; i++) {
    const p = { x: position.getX(i), y: position.getY(i), z: position.getZ(i) }
    const n = normals
      ? { x: normals.getX(i), y: normals.getY(i), z: normals.getZ(i) }
      : { x: 0, y: 0, z: -1 }
    writeSrgb(colors, i * 3, rockColorAt(plane, p, n, halo(p.x, p.y)), scratch)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
}

/** Hands the material over to the vertex colours it now carries. */
export function useVertexColors(mesh: Mesh): void {
  const material = mesh.material as MeshStandardMaterial
  material.vertexColors = true
  material.color.setHex(0xffffff)
  material.needsUpdate = true
}

function centroid(position: BufferGeometry['attributes'][string], base: number): Point {
  return {
    x: (position.getX(base) + position.getX(base + 1) + position.getX(base + 2)) / 3,
    y: (position.getY(base) + position.getY(base + 1) + position.getY(base + 2)) / 3,
    z: (position.getZ(base) + position.getZ(base + 1) + position.getZ(base + 2)) / 3,
  }
}

function faceNormal(position: BufferGeometry['attributes'][string], base: number): Point {
  const ax = position.getX(base + 1) - position.getX(base)
  const ay = position.getY(base + 1) - position.getY(base)
  const az = position.getZ(base + 1) - position.getZ(base)
  const bx = position.getX(base + 2) - position.getX(base)
  const by = position.getY(base + 2) - position.getY(base)
  const bz = position.getZ(base + 2) - position.getZ(base)
  const n = { x: ay * bz - az * by, y: az * bx - ax * bz, z: ax * by - ay * bx }
  const length = Math.hypot(n.x, n.y, n.z) || 1
  return { x: n.x / length, y: n.y / length, z: n.z / length }
}
