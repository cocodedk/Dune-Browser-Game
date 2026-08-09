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
import { buildGridGeometry, largestComponentMask, meshFrom, type GridColumns } from './grid'
import { rockFrontAt } from './massif'
import { PALETTE } from '../spec'

export const PROW_FRONT_Z = -219.4
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
const COLUMNS = 49
// Rows land exactly four to a stratum, so the sawtooth below samples as a
// staircase of courses instead of a blurred ripple.
export const STRATUM_M = 13
const ROWS = Math.round(TOP_M / (STRATUM_M / 4))
const BURY_M = 8

// The socket's own mouth, in the same (x, y) frame — see model/socket.ts.
export const SOCKET = { halfWidthM: 25, halfHeightM: 15.5, centreYM: 15 }

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// R1.5: the inner panel (low rim, before plating.ts's ramp engages) is
// nearly flat at the scale the grazing key light sees it — grain/flute/
// course all vary over 30m+ wavelengths, so across any few-meter patch the
// surface is almost tangent to the light. The renderer's shadow map (fixed
// bias, main.ts, read-only) then self-shadows that patch into a fine
// checkerboard ("shadow acne" — confirmed by a shadows-off diagnostic
// render, which erases the pattern completely; see the round notes). A
// modest higher-frequency ripple breaks the local tangency across the panel
// THIS surface actually controls (low rim, where core dominates gateWallZ —
// see the sink()/blend comment below). It measurably softens the acne here
// without reading as its own shape. It does NOT reach the outer, high-rim
// band: there gateWallZ blends toward the baked massif's own surface, which
// this file cannot reshape (massif.ts's geometry is the visible one there).
function chatter(x: number, y: number): number {
  return 0.18 * Math.sin(x * 0.29 + y * 0.37 + 1.3) + 0.12 * Math.sin(x * 0.53 - y * 0.21 + 3.7)
}

/** Wind-scoured undulation plus stacked courses, matching the feedstock's own
 *  shape language so the procedural prow and the baked rock read as the same
 *  material. Kept NON-NEGATIVE: the prow may recede from its front plane, never
 *  advance past it. */
function relief(x: number, y: number, rim: number): number {
  const grain = 1.2 * Math.sin(x * 0.061 + y * 0.043)
    + 0.8 * Math.sin(x * 0.13 - y * 0.097 + 2.1)
    + 0.5 * Math.sin(x * 0.021 + y * 0.19 + 4.4)
  // Vertical fluting: wind scours a cliff face into shallow ribs running down
  // it. Without this the prow is a smooth panel among faceted rock and reads
  // as a different, softer material.
  const flute = 1.25 * (1 + Math.sin(x * 0.16 + 0.8 * Math.sin(y * 0.045)))
  // Sawtooth, four grid rows to the course: each stratum juts at its base and
  // is worn back by its top, then the next one starts proud again.
  const course = y / STRATUM_M - Math.floor(y / STRATUM_M)
  return grain + 2.5 + flute + 3 * course + chatter(x, y) + plating(x, y, rim)
}

/** Coarse STEPPED relief that is absent across the sheer panel around the
 *  mouth and full strength out at the rim. The R1.3 seam was not really a
 *  gap in the geometry — the prow is buried in rock out there — it was a
 *  gap in SHAPE LANGUAGE: a smooth, finely fluted panel running straight
 *  into 30 m faceted plates, which reads as two rock kits meeting. This
 *  makes the prow's own surface break into plates of the same coarseness
 *  before the two surfaces ever touch. Quantized on purpose: steps and
 *  risers, not ripples. Never negative — the prow may recede from its
 *  front plane, never advance past it. */
function plating(x: number, y: number, rim: number): number {
  // Ramped over 0.40..0.78, NOT out to the rim: past about 0.78 the prow has
  // already sunk behind the rock and nothing it does there is visible. The
  // band that matters is where the two surfaces cross, which is where the
  // steps have to be, so the crossing line comes out as a ragged edge
  // between plates instead of one smooth curve.
  const ramp = smoothstep(0.4, 0.78, rim)
  if (ramp <= 0) return 0
  const field = Math.sin(x * 0.031 + 1.4)
    + Math.sin(y * 0.048 - 0.7)
    + Math.sin(x * 0.017 - y * 0.026 + 3.2)
  return ramp * 2.8 * (Math.round(field) + 3)
}

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

/** The prow's surface at (x, y). Defined everywhere, not just on the grid, so
 *  the socket lip can lie exactly on it. */
export function gateWallZ(x: number, y: number): number {
  const rim = rimRadius(x, y)
  const core = PROW_FRONT_Z + PROW_LEAN * Math.max(0, y) + relief(x, y, rim)
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

  const columns: GridColumns = xs.map((x) => ys.map((y) => ({ x, y, z: gateWallZ(x, y) })))
  const geometry = buildGridGeometry(columns, {
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
  const mesh = meshFrom(geometry, PALETTE.rock)
  mesh.name = 'gateWall'

  geometry.computeBoundingBox()
  return { mesh, minZ: geometry.boundingBox?.min.z ?? PROW_FRONT_Z }
}
