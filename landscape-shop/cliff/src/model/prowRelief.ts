// landscape-shop/cliff/src/model/prowRelief.ts
// How far the gate prow's surface stands back from its own front plane at any
// (x, y) — the whole of the prow's SHAPE, split out of model/gateWall.ts so
// that file stays inside the 200-line rule. gateWall.ts owns the lattice, the
// rim and the burial into the baked rock; this file owns the relief.
//
// Everything here is kept NON-NEGATIVE: the prow may recede from its front
// plane, never advance past it. model/socket.ts hangs the carved mouth a
// fixed step in front of the frontmost vertex, and that is what makes the
// entrance own the set's -Z extreme by construction rather than by luck.

import { beddingHeightAt, COURSE_M, HERO_PLANE } from './strata'
import { flutePhase } from './weathering'

export const PROW_FRONT_Z = -219.4

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// R1.5: the inner panel (low rim, before plating's ramp engages) is nearly
// flat at the scale the grazing key light sees it — grain/flute/bed all vary
// over 30 m+ wavelengths, so across any few-meter patch the surface is almost
// tangent to the light. The renderer's shadow map (fixed bias, main.ts,
// read-only) then self-shadows that patch into a fine checkerboard ("shadow
// acne" — confirmed by a shadows-off diagnostic render, which erases the
// pattern completely). A modest higher-frequency ripple breaks the local
// tangency across the panel THIS surface actually controls. It measurably
// softens the acne without reading as its own shape. It does NOT reach the
// outer, high-rim band: there gateWallZ blends toward the baked massif's own
// surface, which this file cannot reshape.
//
// R2.1 LENGTHENED AND QUIETENED IT. Its 12 m wavelength was three and a half
// of the lattice's own cells, and once the prow was flat-shaded that sampled
// into a regular plaid of facet tilts — measured on the landing frame as the
// most patterned thing on the wall. At 30 to 55 m it is nine cells and more,
// well clear of the lattice. The acne it was insurance against is in any case
// now handled at the root by shadowSide (model/grid.ts's meshFrom).
function chatter(x: number, y: number): number {
  return 0.1 * Math.sin(x * 0.115 + y * 0.148 + 1.3) + 0.07 * Math.sin(x * 0.21 - y * 0.084 + 3.7)
}

/** WIND-CARVING. The prevailing wind runs down the Z axis (model/weathering.ts
 *  derives that from the harness's own dune stretch), so this face — the one
 *  both camera rigs look at — is the windward one, and a windward sandstone
 *  wall gets scoured into vertical scoops.
 *
 *  Two things make it read as wear rather than corrugation. The ribs LEAN with
 *  the bedding, because scour eats out the softer beds and follows them. And
 *  they DEEPEN WITH HEIGHT: down at the foot the saltating sand is choked by
 *  the drift banked against the wall, while the upper face takes the full
 *  stream.
 *
 *  R2.1 SHAPES the scoop instead of leaving it a bare sine. A sine spends its
 *  whole span turning gently, so every facet cut on it differs from its
 *  neighbour by a degree or two and the grazing key light finds no edge — the
 *  landing critic's "blur-blob". Pushed toward its own ends the same
 *  wavelength gives broad flat-bottomed scoops separated by narrow ribs, with
 *  the slope change concentrated on the flanks where it makes a crease. The
 *  minimum is still exactly 0, so the prow's frontmost point — and with it
 *  the set's -Z contract (model/socket.ts) — does not move. */
function windFlute(x: number, y: number): number {
  const depth = 1.2 + 1.6 * smoothstep(0, 86, y)
  const scoop = 0.5 + 0.5 * Math.sin(flutePhase(x, y))
  return 2 * depth * scoop * scoop * (3 - 2 * scoop)
}

/** Coarse STEPPED relief that is absent across the sheer panel around the
 *  mouth and full strength out at the rim. The R1.3 seam was not really a gap
 *  in the geometry — the prow is buried in rock out there — it was a gap in
 *  SHAPE LANGUAGE: a smooth, finely fluted panel running straight into 30 m
 *  faceted plates, which reads as two rock kits meeting. This makes the prow's
 *  own surface break into plates of the same coarseness before the two
 *  surfaces ever touch. Quantized on purpose: steps and risers, not ripples. */
function plating(x: number, y: number, rim: number): number {
  // Ramped over 0.40..0.78, NOT out to the rim: past about 0.78 the prow has
  // already sunk behind the rock and nothing it does there is visible. The
  // band that matters is where the two surfaces cross, so the crossing line
  // comes out as a ragged edge between plates instead of one smooth curve.
  const ramp = smoothstep(0.4, 0.78, rim)
  if (ramp <= 0) return 0
  const field = Math.sin(x * 0.031 + 1.4)
    + Math.sin(y * 0.048 - 0.7)
    + Math.sin(x * 0.017 - y * 0.026 + 3.2)
  return ramp * 2.8 * (Math.round(field) + 3)
}

/** Wind-scoured undulation plus stacked beds, matching the feedstock's own
 *  shape language so the procedural prow and the baked rock read as the same
 *  material. `rim` is gateWall.ts's 0-at-the-panel, 1-at-the-burial-line
 *  radius. */
export function prowRelief(x: number, y: number, rim: number): number {
  const grain = 1.2 * Math.sin(x * 0.061 + y * 0.043)
    + 0.8 * Math.sin(x * 0.13 - y * 0.097 + 2.1)
    + 0.5 * Math.sin(x * 0.021 + y * 0.19 + 4.4)
  // Sawtooth, three grid rows to the bed: each bed juts at its base and is
  // worn back by its top, then the next one starts proud again. Cut along the
  // HERO MASS'S OWN BEDDING (model/strata.ts), not along world Y, so the
  // prow's steps run into the baked rock's courses instead of crossing them.
  const s = beddingHeightAt(HERO_PLANE, x, y, PROW_FRONT_Z)
  const bed = s / COURSE_M - Math.floor(s / COURSE_M)
  return grain + 2.5 + windFlute(x, y) + 3.5 * bed + chatter(x, y) + plating(x, y, rim)
}
