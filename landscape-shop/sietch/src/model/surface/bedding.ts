// landscape-shop/sietch/src/model/surface/bedding.ts
// THE ROCK IS BEDDED. Long before anyone carved here the stone was laid
// down in flat-lying courses, alternating hard and soft. Every horizontal
// line anywhere in this set comes from ONE table (beds.ts), evaluated at
// world Y — so the course whose top is at y = 6.80 m is at y = 6.80 m on
// the left wall, on the right wall, on the vault above the springing and
// on the back wall alike, and reads as ONE continuous band running round
// the room. That continuity is the whole point: it is what separates
// strata from stripes.
//
// Sign convention, and why it is inverted from geology: hard courses are
// PROUD (they stand into the hall), the soft marl between them IS the
// nominal wall. Physically a cave widens at the soft beds; here the wall
// may only ever move INWARD, because the outermost profile points are the
// vertices seam.test.ts measures FOOTPRINT.widthM from. Same relief,
// baseline chosen so the massing can never drift. carvedProfile.ts also
// gates the two spring courses and the floor corners to zero.
//
// R2.1 — WHAT A COURSE DOES ALONG THE HALL. R2 gave every course the same
// strength everywhere, so a course had no story: it entered frame, ran,
// and left. Four named departures now, all inside the massing guarantee
// because every one of them only ever SCALES a non-negative relief:
//   DIP     a regional tilt across the hall, ~2.2 degrees (2x R2's, and
//           capped by a guard rather than by taste — see DIP_PER_M)
//   SWELL   the arch of the fold the rock was bent over, 1.7 m (4x R2's)
//   FAULT   one break at t = 0.26, where the whole column drops 0.95 m
//   TRIM    the courses are cut back to a third toward the mouth, where
//           the rock was dressed flat for people to walk through
// plus per-course RUNS in beds.ts: a course may simply stop where an
// unquarried block stands in its way.

import { bump, clamp01, mix, smoothstep } from './curves'
import { BEDDED_TOP_Y_M, BEDS, MASSIVE, type Bed } from './beds'
import { beddingLiftAt } from './beddingLift'

export { BEDDED_TOP_Y_M, BEDS }
// Re-exported so every reader of the courses still has one import for
// them and for where they sit.
export { beddingLiftAt }
export type { Bed }

// HALF THE WIDTH OF A COURSE'S RISER, in metres. R2 blended 0.14 m each
// side of a boundary — 0.28 m of ramp across courses only 0.32 m deep, so
// the riser WAS the course and every band rendered as a raised cosine.
// 0.06 m makes a 0.12 m riser against 0.62-0.78 m dominant courses: a
// sixth of the step, which reads as an edge and throws a shadow.
//
// It can be this sharp only because wallSampling.ts puts a vertex pair
// exactly on every boundary, at every depth. Shot three times on an even
// grid first: at 0.03 m the edges STAIRCASED (the riser snapped between
// sample rows as the swell lifted the course down the hall), at 0.15 m
// they were smooth and soft again. Placing the vertices removed the
// trade entirely.
export const PROUD_BLEND_M = 0.06
const TONE_BLEND_M = 0.06
const FLOOR_FADE_LO_M = 0.10
const FLOOR_FADE_HI_M = 0.45

// Wide and shallow, not thin and deep: a 0.2 m pinstripe at this texel
// density reads as a ruled line on a drawing. A course boundary is a
// half-metre band of shadow.
const PARTING_HALF_M = 0.28
const PARTING_DEPTH_M = 0.045
const LAMINA_HALF_M = 0.10
const LAMINA_DEPTH_M = 0.010

/** Every lamina's world Y, precomputed once from BEDS. */
const LAMINA_Y: number[] = (() => {
  const ys: number[] = []
  let base = 0
  for (const bed of BEDS) {
    for (let i = 0; i < bed.laminae; i++) {
      ys.push(base + ((bed.topM - base) * (i + 0.5)) / bed.laminae)
    }
    base = bed.topM
  }
  return ys
})()

// A PARTING IS ONLY AS STRONG AS THE BED IT TOPS. R2 cut every boundary
// to the same depth, so the four courses that are meant to nearly vanish
// still drew four full-strength lines across the wall — measured, they
// were most of what a dipping course had to fight to stay readable (the
// back wall's across-vs-along ratio, surfaceMaps.test.ts). Weighted by
// relief, a vanishing course gets a vanishing line, and the three
// dominant courses own the wall.
const MAX_PROUD_M = BEDS.reduce((m, b) => Math.max(m, b.proudM), 0)

function partingWeight(bed: Bed): number {
  return 0.25 + 0.75 * (bed.proudM / MAX_PROUD_M)
}

const RUN_FADE_T = 0.035

/** 0..1 — how much of this course is present at this depth. */
function runAt(bed: Bed, t: number): number {
  const from = bed.runFromT === undefined ? 1 : smoothstep(bed.runFromT - RUN_FADE_T, bed.runFromT + RUN_FADE_T, t)
  const to = bed.runToT === undefined ? 1 : smoothstep(bed.runToT + RUN_FADE_T, bed.runToT - RUN_FADE_T, t)
  return from * to
}

// THE MOUTH WAS DRESSED FLAT. Where everybody walks in, the courses were
// trimmed back so the passage is clean, and by t = 0.86 only a fifth of
// the relief is left. The band is chosen off the FRUSTUM, not off the
// hall: R2.1 first put it at t = 0.82-0.98, which is z = -42.6..-51 —
// entirely BEHIND the rig at z = -40, so it did nothing at all. What the
// camera actually sees at the extreme frame edges is the wall from about
// t = 0.6 on, so the band now ends inside the frame and the courses
// visibly thin out toward the mouth instead of stopping where only the
// geometry knows.
const TRIM_FROM_T = 0.72
const TRIM_TO_T = 0.94
const TRIM_FLOOR = 0.30

/** 1 through the hall, TRIM_FLOOR at the dressed mouth collar. */
function mouthTrimAt(t: number): number {
  return mix(1, TRIM_FLOOR, smoothstep(TRIM_FROM_T, TRIM_TO_T, t))
}

function valueAcrossBeds(pick: (index: number) => number, y: number, blendM: number): number {
  let value = pick(0)
  for (let k = 0; k < BEDS.length; k++) {
    const w = smoothstep(BEDS[k].topM - blendM, BEDS[k].topM + blendM, y)
    value += (pick(k + 1) - value) * w
  }
  return value
}

/** Metres this height stands proud of the nominal wall. Always >= 0, and
 *  driven to 0 at the floor line so floor.ts's edge never pokes past a
 *  wall that moved. `t` is depth into the hall (0 back wall, 1 mouth) —
 *  it decides which courses are still running here. */
export function bedProudAt(y: number, lift = 0, t = 0): number {
  const proud = valueAcrossBeds(
    (k) => (k < BEDS.length ? BEDS[k].proudM * runAt(BEDS[k], t) : MASSIVE.proudM),
    y - lift, PROUD_BLEND_M,
  )
  return proud * smoothstep(FLOOR_FADE_LO_M, FLOOR_FADE_HI_M, y) * mouthTrimAt(t)
}

/** Groove depth in metres at this height: the deep parting at each bed
 *  boundary plus the shallow laminae inside the soft courses. Texture
 *  relief only — never geometry, so it can be as fine as the bake. */
export function partingDepthAt(y: number, lift = 0, t = 0): number {
  let depth = 0
  const yb = y - lift
  for (const bed of BEDS) {
    const d = PARTING_DEPTH_M * partingWeight(bed) * bump(yb - bed.topM, PARTING_HALF_M) * runAt(bed, t)
    if (d > depth) depth = d
  }
  for (const ly of LAMINA_Y) {
    const d = LAMINA_DEPTH_M * bump(yb - ly, LAMINA_HALF_M)
    if (d > depth) depth = d
  }
  return depth * mouthTrimAt(t)
}

/** Albedo shift for this height: the course's own tone, darkened inside
 *  every parting groove so the boundary reads as a drawn line and not
 *  merely a change of shade. A course that has run out (beds.ts) is not
 *  painted either — a stripe with no step under it is the same lie in
 *  paint that the R2 back wall was in geometry. */
export function bedToneAt(y: number, lift = 0, t = 0): number {
  const base = valueAcrossBeds(
    (k) => (k < BEDS.length ? BEDS[k].tone * runAt(BEDS[k], t) : MASSIVE.tone),
    y - lift, TONE_BLEND_M,
  )
  const groove = clamp01(partingDepthAt(y, lift, t) / PARTING_DEPTH_M)
  return Math.max(-1, Math.min(1, (base - groove * 0.42) * mouthTrimAt(t)))
}
