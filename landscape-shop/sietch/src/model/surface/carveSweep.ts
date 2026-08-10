// landscape-shop/sietch/src/model/surface/carveSweep.ts
// HOW THE VAULT WAS CUT. The cutters worked from staging, swung the blade
// in one long arc across the whole span, then stepped deeper into the
// rock and swung again. Where two sweeps met they left a low ridge
// standing. Those overlap ridges are the named forms below: each one is
// an ARC, wrapping over the vault from springing to springing at a fixed
// depth into the hall, so from the camera rig they nest one inside the
// next and read as the throat of something cut by hand.
//
// Direction and reason, per the R2 bar: the ridges run ACROSS the hall
// (constant depth) while bedding.ts's courses run ALONG it (constant
// height). The two families cross at right angles everywhere on the
// vault.
//
// R2.1 — WHY THE R2 TABLE FAILED, in the critic's words: "evenly-pitched
// parallel ribbing wrapping the dome at constant spacing and width ...
// reads as a ribbed tube, not carved strata ... no width variation and no
// termination logic." He was right and the table proves it: eleven ridges
// at a pitch of 0.072 +- 0.01, half-widths 0.026-0.034, depths 0.17-0.28.
// Authored one by one, and still a grating. Three changes:
//   PITCH now runs 0.036 to 0.363 — nearly 10x. Two thin pairs, three
//     massive bands, and real stretches of unscored rock between them.
//   DEPTH now runs 0.07 to 0.86 m. Three ridges DOMINATE; four are
//     almost not there. A ridge you can pick out needs ridges you can't.
//   TERMINATION. ridgeProudAt() is no longer a function of depth alone:
//     every ridge carries the stretch of ARCH it lives on, so a sweep can
//     die out before it reaches a springing (the crew could not reach),
//     and a skew so its line is not parallel to its neighbour's. Nested
//     concentric arcs were half the "ribbed tube" read on their own.
//
// Placement rule that must survive edits: NOTHING may sit within
// t = 0.44 .. 0.62, INCLUDING the skew. The vault reaches its full spec'd
// height only near t = 0.55 (vaultScale.ts), and that crown vertex is
// what seam.test.ts measures FOOTPRINT.heightM from. The gap is a named
// form in its own right — the swell mid-hall the cutters left unscored —
// and it is now the widest stretch of plain rock in the table.

import { bump, smoothstep } from './curves'

export interface SweepRidge {
  /** Depth into the hall as a fraction: 0 at the back wall, 1 at the mouth. */
  atT: number
  /** Half-width of the ridge in the same fraction (x52 m for metres). */
  halfT: number
  /** How far the ridge stands proud of the swept surface, in metres. */
  proudM: number
  /** Where along the arch this sweep reaches, as a fraction from the LEFT
   *  springing (0) to the right (1), and how far it takes to die out. */
  fromA: number
  toA: number
  fadeA: number
  /** How far the ridge's own line walks down the hall between the two
   *  springings. Two neighbours with different skews are not parallel. */
  skewT: number
  name: string
}

/** The unscored swell mid-hall. Asserted in surface.test.ts. */
export const CROWN_CLEAR_T = { min: 0.44, max: 0.62 }

export const SWEEP_RIDGES: SweepRidge[] = [
  { atT: 0.030, halfT: 0.024, proudM: 0.11, fromA: 0, toA: 1, fadeA: 0.3, skewT: 0.008, name: 'first sweep off the back wall' },
  { atT: 0.068, halfT: 0.022, proudM: 0.08, fromA: 0, toA: 0.58, fadeA: 0.28, skewT: -0.006, name: 'its twin — dies before the right springing' },
  { atT: 0.175, halfT: 0.056, proudM: 0.72, fromA: 0, toA: 1, fadeA: 0.32, skewT: 0.028, name: 'DOMINANT — the deep overlap band near the back' },
  { atT: 0.352, halfT: 0.046, proudM: 0.52, fromA: 0.14, toA: 1, fadeA: 0.34, skewT: -0.022, name: 'DOMINANT — starts a third of the way over the arch' },
  { atT: 0.715, halfT: 0.070, proudM: 0.86, fromA: 0, toA: 1, fadeA: 0.3, skewT: 0.034, name: 'DOMINANT — the deepest band in the hall, past the swell' },
  { atT: 0.836, halfT: 0.024, proudM: 0.07, fromA: 0, toA: 0.52, fadeA: 0.26, skewT: -0.006, name: 'thin pair, left half only' },
  { atT: 0.872, halfT: 0.026, proudM: 0.10, fromA: 0, toA: 0.56, fadeA: 0.26, skewT: -0.008, name: 'thin pair, left half only' },
  { atT: 0.952, halfT: 0.044, proudM: 0.30, fromA: 0.18, toA: 1, fadeA: 0.32, skewT: 0.018, name: 'last full sweep before the collar' },
]

// A SWEEP RIDGE IS NOT A HILL. R2's ridges were raised cosines — as long
// coming as going — which at 3 m wide and 0.2 m tall is a ripple however
// you space them. A blade that swept up to a line and stopped leaves a
// gentle back and a STEP: the far side rises over metres, the near side
// falls in centimetres. That near face is what the camera sees (it faces
// the mouth, and the rig stands in the mouth) and it is the only thing on
// the vault that can throw a hard line rather than a gradient. Steep is
// bounded below by the ring spacing — 0.22 of a half-width puts the fall
// across about two rings, which loftGeometry.ts's crease normals then
// keep as an edge.
const RIDGE_STEEP = 0.22

function ridgeBump(d: number, halfT: number): number {
  return bump(d, d >= 0 ? halfT * RIDGE_STEEP : halfT)
}

/** 0..1 — how much of this sweep survives at this point along the arch.
 *  The fade is anchored so reach is EXACTLY 0 at fromA and at toA, not
 *  half way through, and it is LONG. Both matter where fromA = 0: the
 *  wall below the springing was quarried, not swept, so it carries no
 *  ridges at all. A ridge that arrived at the spring line still half
 *  proud cut a wedge there, and eight of them printed as a row of teeth
 *  along the springing — shot, cropped, and chased through two other
 *  suspects before it was found. Over a third of the arch, the same
 *  ridge arrives at a few centimetres and hands over invisibly. */
function reachAt(ridge: SweepRidge, a: number): number {
  return smoothstep(ridge.fromA, ridge.fromA + ridge.fadeA, a) *
    smoothstep(ridge.toA, ridge.toA - ridge.fadeA, a)
}

/**
 * Metres the vault stands proud at this depth fraction.
 * @param a Position along the arch, 0 at the LEFT springing to 1 at the
 *   right. Defaults to the crown, which is the only point the massing
 *   guard actually measures from.
 * Always >= 0, and exactly 0 across CROWN_CLEAR_T for EVERY a — the reach
 * term is a 0..1 multiplier and the skew is bounded by the table, so no
 * value of `a` can walk a ridge into the crown gap.
 */
export function ridgeProudAt(t: number, a = 0.5): number {
  let proud = 0
  for (const ridge of SWEEP_RIDGES) {
    const reach = reachAt(ridge, a)
    if (reach <= 0) continue
    const centre = ridge.atT + ridge.skewT * (a - 0.5)
    const p = ridge.proudM * reach * ridgeBump(t - centre, ridge.halfT)
    if (p > proud) proud = p
  }
  return proud
}

/**
 * Two lighter passes inside every sweep. Each sweep between two overlap
 * ridges got worked twice more before the crew moved on, leaving a pair
 * of much lower arcs at a third and two thirds of the span. GEOMETRY, not
 * texture: at one ring every 0.5 m the tube resolves them, whereas the
 * shell map has only 0.8 m per texel down the hall and would alias them
 * into mush. R2.1: a span now has to be neither too wide (that is the
 * unscored swell, and the plain rock between bands, both of which must
 * stay plain) nor too narrow — a chatter mark inside a 1.9 m gap is
 * thinner than the ring spacing and would alias into a stutter.
 */
const CHATTER_PROUD_M = 0.13
const MIN_SWEEP_SPAN_T = 0.07
const MAX_SWEEP_SPAN_T = 0.12

export function chatterProudAt(t: number): number {
  let proud = 0
  for (let i = 0; i < SWEEP_RIDGES.length - 1; i++) {
    const from = SWEEP_RIDGES[i].atT
    const span = SWEEP_RIDGES[i + 1].atT - from
    if (span > MAX_SWEEP_SPAN_T || span < MIN_SWEEP_SPAN_T) continue
    for (const frac of [1 / 3, 2 / 3]) {
      const p = CHATTER_PROUD_M * bump(t - (from + span * frac), span / 6)
      if (p > proud) proud = p
    }
  }
  return proud
}

/** Albedo shift for the sweep structure: a ridge catches the hearth and
 *  reads lighter, the hollow behind it reads darker. -1..1.
 *  Only the sweeps that cross the WHOLE arch are painted. A ridge that
 *  dies half way over has no business printing a full-length arc into the
 *  albedo — that is the back wall's R2 mistake (relief in paint, none in
 *  the rock) moved onto the vault. */
const FULL_RUN = SWEEP_RIDGES.filter((r) => r.fromA <= 0 && r.toA >= 1)

export function sweepToneAt(t: number): number {
  let proud = 0
  for (const ridge of FULL_RUN) {
    const p = ridge.proudM * ridgeBump(t - ridge.atT, ridge.halfT)
    if (p > proud) proud = p
  }
  const strongest = FULL_RUN.reduce((m, r) => Math.max(m, r.proudM), 0)
  return (proud / strongest) * 0.24 - 0.07
}

// THE FLUTES. Above the last bedded course the hall is cut through
// massive stone with nothing in it to follow, and the blade was drawn
// straight down the length of the hall instead of swung across it. The
// flutes it left run the OTHER way to everything else on the vault — one
// more crossing family, and the only detail the crown has. Their rhythm
// repeats every FLUTE_RHYTHM_M because a crew's reach repeats; the
// spacing inside one repeat does not, because a crew's aim does not.
const FLUTE_RHYTHM_X_M = [0, 2.6, 6.1, 9.0]
const FLUTE_RHYTHM_M = 13
const FLUTE_HALF_M = 0.42
const FLUTE_DEPTH_M = 0.032
const FLUTE_FADE_LO_Y_M = 12.4
const FLUTE_FADE_HI_Y_M = 15.2

/** Groove depth in metres at world x, on the massive stone above y. */
export function fluteDepthAt(x: number, y: number): number {
  const fade = (y - FLUTE_FADE_LO_Y_M) / (FLUTE_FADE_HI_Y_M - FLUTE_FADE_LO_Y_M)
  if (fade <= 0) return 0
  const gate = fade >= 1 ? 1 : fade * fade * (3 - 2 * fade)
  const local = ((x % FLUTE_RHYTHM_M) + FLUTE_RHYTHM_M) % FLUTE_RHYTHM_M
  let depth = 0
  for (const at of FLUTE_RHYTHM_X_M) {
    for (const shift of [-FLUTE_RHYTHM_M, 0, FLUTE_RHYTHM_M]) {
      const d = FLUTE_DEPTH_M * bump(local - at - shift, FLUTE_HALF_M)
      if (d > depth) depth = d
    }
  }
  return depth * gate
}
