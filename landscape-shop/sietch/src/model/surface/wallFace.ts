// landscape-shop/sietch/src/model/surface/wallFace.ts
// THE BACK WALL IS A WORKED FACE. It is the one surface in the hall that
// was not swept or quarried but DRESSED: stood in front of, from staging,
// and struck flat with vertical strokes. Those strokes are the wall's own
// named family, and they run at right angles to bedding.ts's courses, so
// the surface the camera rig looks straight down the hall at carries two
// crossing directions and reads as worked rather than filled.
//
// The strokes reach as high as staging reached. Above that the face was
// left rough, which is also where the smoke sits, so nothing is lost.
// Their rhythm repeats every STROKE_RHYTHM_M — one setting of the
// staging — and is irregular inside that repeat, because a mason's aim
// is.

import { bump, smoothstep } from './curves'

const STROKE_RHYTHM_X_M = [0, 1.6, 3.5, 5.2, 7.4]
const STROKE_RHYTHM_M = 9.4
const STROKE_HALF_M = 0.30
const STROKE_DEPTH_M = 0.020
const STAGING_TOP_Y_M = 5.4
const STAGING_FADE_M = 2.4

/** Groove depth in metres of the dressing strokes at world (x, y). */
export function dressingDepthAt(x: number, y: number): number {
  const reach = smoothstep(STAGING_TOP_Y_M + STAGING_FADE_M, STAGING_TOP_Y_M, y)
  if (reach <= 0) return 0
  const local = ((x % STROKE_RHYTHM_M) + STROKE_RHYTHM_M) % STROKE_RHYTHM_M
  let depth = 0
  for (const at of STROKE_RHYTHM_X_M) {
    for (const shift of [-STROKE_RHYTHM_M, 0, STROKE_RHYTHM_M]) {
      const d = STROKE_DEPTH_M * bump(local - at - shift, STROKE_HALF_M)
      if (d > depth) depth = d
    }
  }
  return depth * reach
}

/** How much darker a stroke reads than the face beside it. 0..1. */
export function dressingShadeAt(x: number, y: number): number {
  return dressingDepthAt(x, y) / STROKE_DEPTH_M
}
