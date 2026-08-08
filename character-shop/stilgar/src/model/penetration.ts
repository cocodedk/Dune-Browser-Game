// character-shop/stilgar/src/model/penetration.ts
// How deep one mesh's vertices sit inside another's surface, read off the
// built geometry.
//
// R2 pass 4 added this because a blind panel reported the mouth region as
// "boolean stair-step intersections". Nothing in this shop is a boolean —
// there is no CSG anywhere, and every hair-to-skin boundary is the level set
// of a summed thickness field (see beardField.ts). But the panel was
// describing something real: pass 3 drove the beard sheet 44.7 mm inside the
// skull through the mouth window, and a sheet crossing a surface that deep
// and that obliquely produces exactly the ragged edge a bad boolean does.
// The distinction between "we do not use booleans" and "nothing looks like
// one" is a number, so the number goes in the manifest.
//
// The head is star-shaped about its own axis over the front half, so "inside"
// is decided by radius: bin the host's vertices by (height, angle), take the
// furthest radius in each bin, and compare.

import type { Object3D } from 'three'
import { headLocalVertices, type P3 } from './faceMetrics'

const Y_BIN = 0.002
const A_BIN = 0.05

function key(p: P3): string {
  const theta = Math.atan2(p[0], -p[2])
  return `${Math.round(p[1] / Y_BIN)}|${Math.round(theta / A_BIN)}`
}

/** Deepest excursion of `guest`'s vertices inside `host`'s surface, in
 *  metres. Zero means the guest never crosses the host. */
export function deepestInside(root: Object3D, host: string, guest: string): number {
  const surface = new Map<string, number>()
  for (const p of headLocalVertices(root, host)) {
    const k = key(p)
    const r = Math.hypot(p[0], p[2])
    const seen = surface.get(k)
    if (seen === undefined || r > seen) surface.set(k, r)
  }
  let deepest = 0
  for (const p of headLocalVertices(root, guest)) {
    const r = surface.get(key(p))
    if (r === undefined) continue
    const depth = r - Math.hypot(p[0], p[2])
    if (depth > deepest) deepest = depth
  }
  return deepest
}
