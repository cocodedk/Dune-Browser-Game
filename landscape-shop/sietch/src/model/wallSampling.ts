// landscape-shop/sietch/src/model/wallSampling.ts
// WHERE THE WALL'S VERTICES GO — the fix for the last artefact R2.1 could
// see in its own clay: course edges that came out as STAIRCASES.
//
// The cause, measured over three shots: bedding.ts's courses climb and
// fall along the hall (the swell, and the fault), the wall's own sample
// heights did not, so a course boundary drifted across a fixed grid and
// SNAPPED from one sample row to the next every metre or so of depth.
// Softening the riser hid it, but a soft riser is the very thing this
// round exists to remove.
//
// So the grid is not fixed any more. Every ring places a PAIR of vertices
// on each course boundary it actually has — at the boundary plus and
// minus the riser half-width — and the boundary is wherever the lift has
// put it at that depth. A riser is then exactly one quad at every depth,
// its edge is exactly where the geology says, and nothing can snap.
//
// TWO RULES THAT KEEP THE TUBE FROM TWISTING:
//   The layout is decided ONCE, from the zero-lift stratigraphy. Vertex
//   n is the same feature at every depth — filler between the same two
//   courses, or the same edge of the same course. Re-deciding per ring
//   (say, allocating fillers by the gaps' current sizes) would let vertex
//   n change meaning between two rings and the surface would shear.
//   Everything is fitted into the wall it actually has by a ceiling that
//   BENDS (softCeiling) rather than one that clips. A hard clip stacked
//   every boundary the swell had lifted above this ring's springing onto
//   one height, and that row of coincident vertices printed as a line of
//   teeth along the spring line.

import { WALL_SEGMENTS } from './crossSection'
import { BEDS } from './surface/beds'
import { PROUD_BLEND_M } from './surface/bedding'

/** Courses above this never fit on a wall, so they get no vertex pair —
 *  the arch carries them, faded (carvedProfile.ts). */
const TEMPLATE_TOP_M = 7.6
/** Vertices below the first course boundary. protectionGate() zeroes the
 *  displacement within one index of the floor and ramps over two more, so
 *  the lowest boundary needs this much clearance or the footing seam
 *  would be flattened by the guard that protects the footprint. */
const MIN_BASE_FILLERS = 3
/** A gap this small IS a riser — it must stay one segment. */
const RISER_GAP_M = 2 * PROUD_BLEND_M + 0.03
const MIN_STEP_M = 0.002
const EDGE_GAP_M = 0.02
/** How gently the ceiling bends. Measured up from 0.14: the wider the
 *  bend, the smaller what is left of the teeth at the frame edge. */
const SOFT_CEIL_M = 0.45

/** Heights, in BEDDING coordinates, of every interior vertex of a wall.
 *  Decided once — see the header. */
export const WALL_TEMPLATE_M: number[] = (() => {
  const anchors: number[] = []
  for (const bed of BEDS) {
    if (bed.topM > TEMPLATE_TOP_M - 0.4) continue
    anchors.push(bed.topM - PROUD_BLEND_M, bed.topM + PROUD_BLEND_M)
  }
  anchors.sort((a, b) => a - b)

  const edges = [0, ...anchors, TEMPLATE_TOP_M]
  const gaps = edges.slice(0, -1).map((lo, i) => ({ lo, size: edges[i + 1] - lo }))
  const open = gaps.map((g, i) => (g.size > RISER_GAP_M ? i : -1)).filter((i) => i >= 0)

  const fillers = new Array<number>(gaps.length).fill(0)
  let left = WALL_SEGMENTS - 1 - anchors.length
  fillers[0] = Math.min(left, MIN_BASE_FILLERS)
  left -= fillers[0]
  const total = open.reduce((s, i) => s + gaps[i].size, 0)
  for (const i of open) {
    const share = Math.floor((left * gaps[i].size) / total)
    fillers[i] += share
  }
  let spare = WALL_SEGMENTS - 1 - anchors.length - fillers.reduce((a, b) => a + b, 0)
  for (const i of [...open].sort((a, b) => gaps[b].size - gaps[a].size)) {
    if (spare <= 0) break
    fillers[i]++
    spare--
  }

  const out: number[] = []
  for (let i = 0; i < gaps.length; i++) {
    const { lo, size } = gaps[i]
    for (let k = 1; k <= fillers[i]; k++) out.push(lo + (size * k) / (fillers[i] + 1))
    if (i < anchors.length) out.push(anchors[i])
  }
  return out
})()

/** A ceiling that bends instead of clipping. A hard Math.min stacked
 *  every course the swell had lifted above this ring's wall onto one
 *  height, and the row of coincident vertices printed as a line of teeth
 *  along the springing — chased through four other suspects before it was
 *  found. Softplus asymptotes to the same ceiling, stays strictly
 *  increasing, and so keeps every vertex distinct and the surface smooth. */
function softCeiling(y: number, ceiling: number): number {
  return ceiling - SOFT_CEIL_M * Math.log(1 + Math.exp((ceiling - y) / SOFT_CEIL_M))
}

/**
 * World heights of one wall's WALL_SEGMENTS + 1 vertices, floor to
 * springing inclusive, for a ring whose bedding sits `lift` metres high.
 */
export function wallSampleYs(springY: number, lift: number): number[] {
  const ceiling = Math.max(EDGE_GAP_M, springY - EDGE_GAP_M)
  const ys: number[] = [0]
  let prev = 0
  for (const bedM of WALL_TEMPLATE_M) {
    const y = softCeiling(Math.max(prev + MIN_STEP_M, bedM + lift), ceiling)
    ys.push(Math.max(prev, y))
    prev = ys[ys.length - 1]
  }
  ys.push(springY)
  return ys
}
