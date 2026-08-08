// character-shop/duncan/src/model/faceMeasure.ts
// Vertex sweeps for the face guards. testSupport.ts already walks vertices
// for WIDTH in a height band; a face needs the same walk answering DEPTH in
// a height band and in an x column, because every form R2 authored is a
// displacement in z and a bounding box cannot see one of them.
//
// NOT a test file (no describe/it) — it is exercised by face.test.ts and
// headFeatures.test.ts, the same arrangement testSupport.ts uses.
//
// Everything here measures BUILT GEOMETRY in world space. Nothing reads a
// station table or a landmark constant: this shop's own history includes a
// reported "upper-back curve" that turned out to be a 16mm wobble, and the
// only defence against that is to ask the vertices.

import { Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'

export interface Window {
  yMin: number
  yMax: number
  xMin?: number
  xMax?: number
}

/** Every vertex of every mesh under `object`, in world space. Exported for
 *  the guards that measure along an axis the world does not have — the
 *  topknot's own tilted one, for instance. */
export function forEachVertex(object: Object3D, visit: (v: Vector3) => void): void {
  walk(object, visit)
}

function walk(object: Object3D, visit: (v: Vector3) => void): void {
  object.updateMatrixWorld(true)
  const v = new Vector3()
  object.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      mesh.localToWorld(v)
      visit(v)
    }
  })
}

function inside(v: Vector3, w: Window): boolean {
  if (v.y < w.yMin || v.y > w.yMax) return false
  if (w.xMin !== undefined && v.x < w.xMin) return false
  if (w.xMax !== undefined && v.x > w.xMax) return false
  return true
}

/** The FRONTMOST z in a window — most negative, because the face looks
 *  toward -Z. Infinity when the window holds no geometry, so a caller that
 *  measured nothing fails loudly instead of comparing against zero. */
export function frontZ(object: Object3D, window: Window): number {
  let z = Infinity
  walk(object, (v) => {
    if (inside(v, window)) z = Math.min(z, v.z)
  })
  return z
}

/** The REARMOST z in a window. */
export function backZ(object: Object3D, window: Window): number {
  let z = -Infinity
  walk(object, (v) => {
    if (inside(v, window)) z = Math.max(z, v.z)
  })
  return z
}

/** The height at which the frontmost geometry in a band sits — how a test
 *  asks "where is the nose tip" without being told. */
export function frontZHeight(object: Object3D, window: Window): number {
  let z = Infinity
  let y = NaN
  walk(object, (v) => {
    if (!inside(v, window) || v.z >= z) return
    z = v.z
    y = v.y
  })
  return y
}

/** How far the -X side sits BEHIND its +X mirror, swept in `cell`-sized boxes
 *  across a rectangle of the face in BOTH axes. This is how a notch cut
 *  through one brow is found rather than asserted, and why it sweeps two axes
 *  and not one:
 *
 *  R2 pass 1's scar was a 60 x 15mm trench, and collapsing a 27mm band of
 *  brow to ONE frontmost z per x-column could see a thing that big. Pass 2's
 *  is a 34 x 5mm groove — a mark rather than a crater — and the same collapse
 *  is blind to it, because the ungrooved vertices in the same column are
 *  further forward and win the minimum. Measured on the built surface, the
 *  column sweep read 2.0mm of notch where the cell sweep reads 5.3mm; the
 *  geometry did not change between those two numbers, only the ruler.
 *
 *  `deepest` is the notch (signed: positive means -X is missing material).
 *  `worstAbs` is the same sweep unsigned, which is how the REST of the brow
 *  line is proved symmetric — so the notch is a notch and not one side of
 *  the face having been built differently from the other. */
export function mirroredRecess(
  object: Object3D, xFrom: number, xTo: number, yFrom: number, yTo: number, cell: number,
): { deepest: number; worstAbs: number } {
  let deepest = 0
  let worstAbs = 0
  const half = cell / 2
  for (let x = xFrom; x <= xTo + 1e-9; x += cell) {
    for (let y = yFrom; y <= yTo + 1e-9; y += cell) {
      const band = { yMin: y - half, yMax: y + half }
      const right = frontZ(object, { ...band, xMin: x - half, xMax: x + half })
      const left = frontZ(object, { ...band, xMin: -x - half, xMax: -x + half })
      if (!Number.isFinite(right) || !Number.isFinite(left)) continue
      deepest = Math.max(deepest, left - right)
      worstAbs = Math.max(worstAbs, Math.abs(left - right))
    }
  }
  return { deepest, worstAbs }
}

/** The worst margin by which `over` stands ABOVE `under`, compared per
 *  `cell`-sized (x, z) column and counting only geometry above `yFrom`.
 *  Negative means `under` broke through the top of `over`.
 *
 *  This exists because BARE SCALP has now been shipped twice by two opposite
 *  mistakes — a cap held too far back, then a skull widened under a cap that
 *  was not widened with it — and neither was caught by a test. Near the crown
 *  the surfaces are almost horizontal, so the comparison has to be VERTICAL:
 *  a radial sweep of the same geometry reported 4.5mm of clearance everywhere
 *  while the render showed a tan sliver, because the cap was radially wider
 *  and vertically lower at the same time. Columns where only one surface has
 *  a vertex are skipped rather than counted as failures — at 4mm cells that
 *  is sampling, not a hole. */
export function topClearance(
  over: Object3D, under: Object3D, yFrom: number, cell: number,
): number {
  const tops = (object: Object3D): Map<string, number> => {
    const found = new Map<string, number>()
    walk(object, (v) => {
      if (v.y < yFrom) return
      const key = `${Math.round(v.x / cell)}|${Math.round(v.z / cell)}`
      found.set(key, Math.max(found.get(key) ?? -Infinity, v.y))
    })
    return found
  }
  const above = tops(over)
  const below = tops(under)
  let worst = Infinity
  for (const [key, underTop] of below) {
    const overTop = above.get(key)
    if (overTop === undefined) continue
    worst = Math.min(worst, overTop - underTop)
  }
  return worst
}

/** The lowest height at which `over` stands in front of `under` — how the
 *  HAIRLINE is measured. The cap is not authored with a hairline; it crosses
 *  the skull, and the crossing is the hairline (hair.ts). Scans upward in
 *  `step` bands and returns the first crossing, or NaN. */
export function crossingHeight(
  over: Object3D, under: Object3D, yFrom: number, yTo: number, step: number, halfWidth: number,
): number {
  for (let y = yFrom; y <= yTo + 1e-9; y += step) {
    const w = { yMin: y - step / 2, yMax: y + step / 2, xMin: -halfWidth, xMax: halfWidth }
    const a = frontZ(over, w)
    const b = frontZ(under, w)
    if (Number.isFinite(a) && Number.isFinite(b) && a < b) return y
  }
  return NaN
}
