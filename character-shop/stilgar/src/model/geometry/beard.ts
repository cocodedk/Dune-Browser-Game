// character-shop/stilgar/src/model/geometry/beard.ts
// THE BEARD IS HAIR MASS — a volume grown OUT OF the face, not a shape
// parked in front of it. Pass 1 stacked three ellipsoids (read: a neck
// brace); pass 2 replaced them with one tapered cylinder (read: a black
// flower pot with a hard rim). Both failed for the same reason: a beard's
// boundary is where hair thins to nothing against skin, and a primitive has
// no such boundary — it has a silhouette edge.
//
// So the mass is a THICKNESS FIELD over the head's own surface
// (head.ts's headPointAtY), spanning the beard region directly: across it in
// angle, and from the hair's lower edge to its upper edge in height, both
// authored curves rather than constants. The field is LIP thin at every edge
// of that region, so the beard fades into the cheek and dies out behind the
// jaw with no cut line anywhere.
//
// The field itself — including everything R2 added to give the interior
// form, and the window that sinks it over the mouth — lives in
// beardField.ts. This file is the mesh.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { smoothTable, smoothstep } from './curves'
import { shellGeo } from './shell'
import type { Pt } from './mesh'
import { headPointAtY } from './head'
import { BOTTOM, EDGE, TOP, ripple } from './beardEdges'
import { thicknessAt } from './beardField'
import { attach } from './primitives'

const THICKNESS = 0.0062
// R2 pass 4 raises the column count. The hair/skin boundary round the mouth
// is a level set of the thickness field, and a level set is only as smooth as
// the grid it is sampled on: at 76 columns over 206 degrees the patch stepped
// 4.0 mm horizontally across the lips, which is the stair-stepping the panel
// read as boolean intersections. 128 columns puts it at 2.4 mm.
const U_SEGS = 128
const V_SEGS = 44

/** Edge irregularity. The top gets three harmonics so the hairline does not
 *  read as a wave; the bottom gets much less than R1 used, because a beard
 *  whose lower contour dips 16 mm off-centre is not "rounded-square", and
 *  because that dip is what pushed the head-height fraction toward its
 *  ceiling (measured on the visible mass — see progress.md).
 *
 *  The top's irregularity is GATED OFF across the front. Every harmonic here
 *  peaks somewhere, and left ungated one of them peaked at 17 degrees off
 *  the midline — over the nose.
 *
 *  R2 pass 3 halves the amplitudes and widens the gate to zero within 19.5
 *  degrees of the chin, full past 48.7. Summed, the old harmonics could reach
 *  15.6 mm, and at 20 degrees off the midline they were still worth +3.5 mm —
 *  which put the hairline at 0.0841 against an alar base at 0.0837, i.e. hair
 *  growing over the wing of the nose. That crossing is the hard-edged dark
 *  wedge the pass-2 headthreequarter shows at the nose/moustache junction: not
 *  a mesh gap (both meshes measure watertight, zero boundary edges) but the
 *  hair boundary running through the alar crease. Now the moustache line under
 *  the nose is authored and only the cheeks are ragged. */
function topEdge(a: number): number {
  const ragged = smoothstep(0.34, 0.85, a)
  return smoothTable(TOP, a, 1) + ragged * (ripple(a, 8.3, 0.0024, 14.1, 0.0013)
    + 0.0008 * (1 - Math.cos(21.7 * a)))
}

function bottomEdge(a: number): number {
  return smoothTable(BOTTOM, a, 1) - ripple(a, 6.1, 0.0016, 10.9, 0.0008)
}

function beardPatch(u: number, v: number): Pt {
  const theta = -EDGE + u * 2 * EDGE
  const a = Math.abs(theta)
  const bottom = bottomEdge(a)
  const y = bottom + (topEdge(a) - bottom) * v
  const skin = headPointAtY(theta, y)
  const thick = thicknessAt(a, v, skin[0], y)
  return [skin[0] + Math.sin(theta) * thick, y, skin[2] - Math.cos(theta) * thick]
}

export function buildBeard(disposables: BufferGeometry[], head: Group, hair: MeshStandardMaterial): void {
  attach(disposables, head, shellGeo(beardPatch, U_SEGS, V_SEGS, THICKNESS), hair, 0, 0, 0, 'beard')
}
