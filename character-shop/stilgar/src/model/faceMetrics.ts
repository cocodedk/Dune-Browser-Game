// character-shop/stilgar/src/model/faceMetrics.ts
// Landmark extraction from the REAL geometry, in the 'head' group's own
// frame. Production code that face.test.ts imports — never the other way
// round — so the numbers a report quotes and the numbers a guard gates are
// read by the same code.
//
// Everything here measures VERTICES. This shop's history is the reason: R1
// reported a beard that cleared the nose and a brow that read at 12.2 mm,
// and both claims came from the authored table rather than from the mesh the
// table produced. A landmark that is not read off the built geometry is an
// intention, not a measurement.

import { Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { namedOrThrow } from './measure'

export type P3 = readonly [number, number, number]

/** Every vertex of a named mesh, expressed in the head group's local frame —
 *  the frame every geometry/*.ts file authors in. */
export function headLocalVertices(root: Object3D, meshName: string): P3[] {
  root.updateMatrixWorld(true)
  const head = namedOrThrow(root, 'head')
  const mesh = namedOrThrow(head, meshName) as Mesh
  const position = mesh.geometry.attributes.position
  const v = new Vector3()
  const out: P3[] = []
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    mesh.localToWorld(v)
    head.worldToLocal(v)
    out.push([v.x, v.y, v.z])
  }
  return out
}

/** The frontmost vertex — smallest Z, because the face looks toward -Z. */
export function frontmost(points: readonly P3[]): P3 {
  let best = points[0]
  for (const p of points) if (p[2] < best[2]) best = p
  return best
}

/** Frontmost vertex inside a box filter on |x| and y. Returns null when the
 *  filter selects nothing, so a guard fails loudly rather than on NaN. */
export function frontmostWhere(
  points: readonly P3[], axMin: number, axMax: number, yMin: number, yMax: number,
): P3 | null {
  let best: P3 | null = null
  for (const p of points) {
    const ax = Math.abs(p[0])
    if (ax < axMin || ax > axMax || p[1] < yMin || p[1] > yMax) continue
    if (!best || p[2] < best[2]) best = p
  }
  return best
}

/** A head's midline runs up the FACE and back down the occiput, and both
 *  halves have |x| = 0. Every "least forward point on the midline" measure
 *  below would otherwise return the back of the skull, which sits at +Z and
 *  wins every maximum by 150 mm. Found by dumping the vertex table when the
 *  facial-thirds guard came out at a ratio of 0.32. */
function onFrontMidline(p: P3, halfWidth: number, yMin: number, yMax: number): boolean {
  return p[2] < 0 && Math.abs(p[0]) <= halfWidth && p[1] >= yMin && p[1] <= yMax
}

/** The LEAST forward vertex on the front midline inside a Y window — how a
 *  notch (subnasale, the mouth line) is found without being told where it
 *  is. */
export function midlineNotch(points: readonly P3[], halfWidth: number, yMin: number, yMax: number): P3 | null {
  let best: P3 | null = null
  for (const p of points) {
    if (!onFrontMidline(p, halfWidth, yMin, yMax)) continue
    if (!best || p[2] > best[2]) best = p
  }
  return best
}

/** Least-forward and most-forward Z on the midline inside a Y window. */
function midlineDepth(points: readonly P3[], halfWidth: number, yMin: number, yMax: number): [number, number] {
  let back = -Infinity
  let front = Infinity
  for (const p of points) {
    if (!onFrontMidline(p, halfWidth, yMin, yMax)) continue
    if (p[2] > back) back = p[2]
    if (p[2] < front) front = p[2]
  }
  return [back, front]
}

/** Menton, read off the loft itself.
 *
 *  Chin and neck are ONE continuous surface here by design — that is the
 *  whole point of head.ts — so no vertex is obviously "the bottom of the
 *  chin", and a fixed Z cut-off lands between mesh rings and moves by a
 *  whole ring whenever the profile is retouched. The landmark is defined by
 *  DEPTH instead: take the neck's own front projection and the chin's, and
 *  call menton the lowest midline vertex still projecting 40% of the way
 *  from one to the other. Self-scaling, so it survives a re-sculpt of
 *  either end. */
export function mentonY(points: readonly P3[], halfWidth = 0.012): number {
  const [neckZ] = midlineDepth(points, halfWidth, 0.000, 0.020)
  const [, chinZ] = midlineDepth(points, halfWidth, 0.030, 0.060)
  const threshold = neckZ + 0.4 * (chinZ - neckZ)
  let best = Infinity
  for (const p of points) {
    if (p[2] >= 0 || Math.abs(p[0]) > halfWidth || p[2] > threshold) continue
    if (p[1] < best) best = p[1]
  }
  return best
}

export function maxY(points: readonly P3[]): number {
  let best = -Infinity
  for (const p of points) if (p[1] > best) best = p[1]
  return best
}

/** Lowest Y within a half-width of the midline. */
export function minYNearMidline(points: readonly P3[], halfWidth: number): number {
  let best = Infinity
  for (const p of points) if (Math.abs(p[0]) <= halfWidth && p[1] < best) best = p[1]
  return best
}

/** Widest |x| inside a Y band, doubled: a bizygomatic-style breadth. */
export function breadthInBand(points: readonly P3[], yMin: number, yMax: number): number {
  let best = 0
  for (const p of points) {
    if (p[1] < yMin || p[1] > yMax) continue
    const ax = Math.abs(p[0])
    if (ax > best) best = ax
  }
  return best * 2
}

export function centroid(points: readonly P3[]): P3 {
  let x = 0
  let y = 0
  let z = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
    z += p[2]
  }
  const n = points.length
  return [x / n, y / n, z / n]
}

/** Signed volume of a closed indexed mesh: positive when the winding faces
 *  outward. FrontSide culling draws an inverted closed surface as an
 *  interior wall, so every new closed form gets checked here. */
export function signedVolume(root: Object3D, meshName: string): number {
  root.updateMatrixWorld(true)
  const head = namedOrThrow(root, 'head')
  const mesh = namedOrThrow(head, meshName) as Mesh
  const points = headLocalVertices(root, meshName)
  const index = mesh.geometry.index
  if (!index) throw new Error(`"${meshName}" has no index buffer`)
  let total = 0
  for (let i = 0; i < index.count; i += 3) {
    const a = points[index.getX(i)]
    const b = points[index.getX(i + 1)]
    const c = points[index.getX(i + 2)]
    total += a[0] * (b[1] * c[2] - b[2] * c[1])
      - a[1] * (b[0] * c[2] - b[2] * c[0])
      + a[2] * (b[0] * c[1] - b[1] * c[0])
  }
  return total / 6
}
