// landscape-shop/cliff/src/model/gateWall.ts
// The prow: the sheer stratified face the sietch gate is cut into. It grows
// out of the baked scarp rather than sitting on it — at its centre it stands
// about 20 m forward of the rock, and by its rim it has sunk BURY_M behind
// the rock's own front surface (sampled from the bake's gateField), so it has
// no edge, no outline and no seam anywhere. That is the whole point: the
// previous round's straight mass-to-mass joins were what read as "boolean".
//
// The hole for the carved socket is punched here; model/socket.ts fills it.

import type { Mesh } from 'three'
import { buildGridGeometry, flatShade, largestComponentMask, meshFrom, type GridColumns } from './grid'
import { rockFrontAt } from './massif'
import { latticeNode } from './prowLattice'
import { prowRelief, smoothstep, PROW_FRONT_Z } from './prowRelief'
import { COURSE_M } from './strata'
import { PALETTE } from '../spec'
// The prow leans back with height at the same rate the baked formation does
// (tools/bake/compose.mjs's LEAN), so it stands a roughly CONSTANT 7 m proud
// of the rock all the way up instead of swelling into a lens near the top.
const PROW_LEAN = 0.14
// R1.4: widened from 95 x 85. The rim is where the prow's own surface dies
// into the baked rock, and at 95 m that line landed about 70 m from the
// mouth — close enough that the critic read one object: "sharp jagged
// crystalline shards butt directly against the smooth rounded cave-mouth
// rock". Moving the rim out puts the join in the flank, away from the
// mouth, and `plating` below closes the shape-language gap that made it a
// seam in the first place.
const HALF_WIDTH_M = 118
const RIM_HEIGHT_M = 92
const RIM_CENTRE_Y = 8
const TOP_M = 104
// R2: 49 -> 73. The wind flutes below were widened to a 24 m wavelength and
// deepened; at the old 4.9 m column pitch that is four and a half samples to
// a rib, which renders as a zigzag rather than a scoop. 3.3 m resolves it.
const COLUMNS = 73
// Rows land three to a bed, so the sawtooth below samples as a staircase of
// courses instead of a blurred ripple. The bed thickness is the formation's
// own (model/strata.ts), not a second number: the prow's steps and the rock's
// colour bands have to be one rhythm.
const ROWS = Math.round(TOP_M / (COURSE_M / 3))
const BURY_M = 8

// The socket's own mouth, in the same (x, y) frame — see model/socket.ts.
export const SOCKET = { halfWidthM: 25, halfHeightM: 15.5, centreYM: 15 }

/** How far back into the massif this point of the prow has sunk: 0 across the
 *  sheer panel, 1 out at the rim where it is safely inside rock. Flat for the
 *  first half of the radius on purpose — an even falloff from the centre gave
 *  a smooth DOME, which is the exact "soft dune hump" the critics rejected
 *  twice. */
function sink(rim: number): number {
  return smoothstep(0.45, 1, rim)
}

/** Distance out toward the rim, 0 at the panel's centre and 1 at the line
 *  where the prow disappears into the rock. Wobbled so that line is an
 *  irregular curve, not the rim of an ellipse — an ellipse there is what
 *  made the prow read as a dome pasted onto the front. */
function rimRadius(x: number, y: number): number {
  const wobble = 1 + 0.18 * Math.sin(x * 0.041 + 2.4) + 0.12 * Math.sin(y * 0.055 - 1.1)
  return Math.hypot(x / HALF_WIDTH_M, (y - RIM_CENTRE_Y) / RIM_HEIGHT_M) * wobble
}

/** Distance from the socket's mouth in mouth-radii. */
export function socketRadius(x: number, y: number): number {
  return Math.hypot(x / SOCKET.halfWidthM, (y - SOCKET.centreYM) / SOCKET.halfHeightM)
}

/** How free a lattice node at (x, y) is to leave its ruling — see
 *  model/prowLattice.ts for what it is for. Pinned in three places, each one
 *  a joint that would otherwise open:
 *
 *  THE HOLE'S EDGE. The socket hole is punched on UNJITTERED quad midpoints,
 *  so the ring of quads either side of socketRadius 1 has to stay where the
 *  punch thought it was. Only that ring: model/gateLip.ts's annulus covers
 *  the prow outward to socketRadius 1.68 at its widest wobble, which leaves
 *  half a mouth-radius of overlap over a node that can move 1.1 m. A first
 *  pass pinned everything inside 2.7 and measured the result on the shot —
 *  that is a 95 m swath across the middle of the landing frame, which left
 *  the wall the panel actually complained about still ruled into a grid.
 *
 *  THE FOOT. model/skirtApron.ts seats against y = 0 and the drift is painted
 *  in world height; a bottom row that wandered in y would ripple both.
 *
 *  THE PANEL EDGE. The outermost columns and the top row hold the lattice's
 *  own rectangle, which is what keeps the prow's bounding box — and with it
 *  the footprint guard — exactly where it was. */
function jitterHold(x: number, y: number): number {
  const edge = smoothstep(0, 7, HALF_WIDTH_M - Math.abs(x)) * smoothstep(0, 7, TOP_M - y)
  return smoothstep(1.15, 1.75, socketRadius(x, y)) * smoothstep(0.6, 5.5, y) * edge
}

/** The prow's surface at (x, y). Defined everywhere, not just on the grid, so
 *  the socket lip can lie exactly on it. */
export function gateWallZ(x: number, y: number): number {
  const rim = rimRadius(x, y)
  const core = PROW_FRONT_Z + PROW_LEAN * Math.max(0, y) + prowRelief(x, y, rim)
  const rock = rockFrontAt(x, y)
  const blend = sink(rim)
  if (rock === null) return core + blend * 30
  return Math.min(core + (rock + BURY_M - core) * blend, -25)
}

export interface GateWall {
  mesh: Mesh
  /** The prow's own frontmost vertex. model/socket.ts hangs the carved mouth
   *  a fixed step in front of it, which is what makes the entrance own the
   *  set's -Z extreme deterministically instead of by luck. */
  minZ: number
}

/** True where the massif has rock behind this quad's midpoint — the raw
 *  "would this quad hang in open sky" test, BEFORE the connectivity pass
 *  below. Separated out because largestComponentMask needs to flood-fill
 *  exactly this predicate, not the socket hole on top of it (a hole does
 *  not disconnect the rock AROUND it — the flood fill still walks the
 *  ring — so it is applied afterward, in skipQuad, not folded in here). */
function hasRock(xs: number[], ys: number[], c: number, r: number): boolean {
  const x = (xs[c] + xs[c + 1]) / 2
  const y = (ys[r] + ys[r + 1]) / 2
  return rockFrontAt(x, y) !== null
}

export function buildGateWall(): GateWall {
  const xs: number[] = []
  for (let c = 0; c < COLUMNS; c++) xs.push(-HALF_WIDTH_M + (2 * HALF_WIDTH_M * c) / (COLUMNS - 1))
  const ys: number[] = []
  for (let r = 0; r <= ROWS; r++) ys.push((TOP_M * r) / ROWS)

  // R1.5: rockFrontAt's coarse field (bakeMassif.mjs) reads "rock present"
  // at a couple of cells with no rock on any side of them — a single
  // isolated quad (or a raft of two) with no connected path back to the
  // main prow surface. Rendered, that is a bright lit shard floating with
  // nothing visibly holding it up (the critic's exact reading). Keeping
  // only the LARGEST connected component of "has rock" quads drops those
  // islands without moving a single vertex of the real surface.
  const onMainSurface = largestComponentMask(COLUMNS - 1, ROWS, (c, r) => hasRock(xs, ys, c, r))

  // The lattice is sampled OFF its own rulings (model/prowLattice.ts): the
  // node moves first, then the surface is read at where it ended up, so the
  // prow is the same shape sampled by an irregular net instead of a grid.
  const pitch = { x: (2 * HALF_WIDTH_M) / (COLUMNS - 1), y: TOP_M / ROWS }
  const columns: GridColumns = xs.map((x, c) => ys.map((y, r) => {
    const at = latticeNode(c, r, x, y, pitch, jitterHold(x, y))
    return { x: at.x, y: at.y, z: gateWallZ(at.x, at.y) }
  }))
  const lattice = buildGridGeometry(columns, {
    skipQuad(c, r) {
      const x = (xs[c] + xs[c + 1]) / 2
      const y = (ys[r] + ys[r + 1]) / 2
      if (socketRadius(x, y) < 1) return true
      // No rock behind means no prow: a quad out here would hang in open sky
      // instead of vanishing into the massif. Islands too small to connect
      // to the main surface get the same treatment (see onMainSurface).
      return !onMainSurface(c, r)
    },
  })
  // FLAT-SHADED, like the baked rock it grows out of — see grid.flatShade.
  const geometry = flatShade(lattice)
  const mesh = meshFrom(geometry, PALETTE.rock)
  mesh.name = 'gateWall'

  geometry.computeBoundingBox()
  return { mesh, minZ: geometry.boundingBox?.min.z ?? PROW_FRONT_Z }
}
