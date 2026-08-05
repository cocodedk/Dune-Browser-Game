// character-shop/stilgar/src/model/geometry/beard.ts
// THE BEARD IS HAIR MASS — a volume grown OUT OF the face, not a shape
// parked in front of it. Pass 1 stacked three ellipsoids (read: a neck
// brace); pass 2 replaced them with one tapered cylinder (read: a black
// flower pot with a hard rim). Both failed for the same reason: a beard's
// boundary is where hair thins to nothing against skin, and a primitive
// has no such boundary — it has a silhouette edge.
//
// So the mass is authored as a THICKNESS FIELD over the head's own surface
// (head.ts's headPointAtY). The patch spans the beard region directly:
// across it in angle, and from the hair's lower edge to its upper edge in
// height, both of which are authored curves, not constants. The field is
// LIP thin at every edge of that region, so the beard fades into the cheek
// and dies out behind the jaw with no cut line anywhere — and the edges
// themselves are gently irregular, because a hairline is not a lathe cut.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { bell, smoothTable } from './curves'
import { shellGeo } from './shell'
import type { Pt } from './mesh'
import { headPointAtY } from './head'
import { attach } from './primitives'

const DEG = Math.PI / 180
// Ends behind the jaw angle and well under the hood's rim (hood.ts opens
// no wider than 79 degrees anywhere), so the patch's own end never shows.
const EDGE = 103 * DEG

// Upper hairline, keyed on |angle from front|: low at the moustache (just
// under the nose base), climbing across the cheek to a full sideburn.
const TOP: number[][] = [
  [0, 0.0952], [20 * DEG, 0.0972], [40 * DEG, 0.1014],
  [60 * DEG, 0.1076], [80 * DEG, 0.1152], [EDGE, 0.1218],
]
// Lower edge: hangs below the chin at the front and sweeps up along the
// jaw toward the ear — following the jaw's own curve, which is what a
// straight-edged cone can never do.
const BOTTOM: number[][] = [
  [0, -0.0062], [25 * DEG, -0.0032], [50 * DEG, 0.0092],
  [70 * DEG, 0.0272], [88 * DEG, 0.0472], [EDGE, 0.0630],
]
// Hair volume by angle — deepest at the chin, thinning toward the ear.
// Capped at 33.5 mm: at 40 mm the beard's chin mass measured 1.6 mm FORWARD
// of the nose tip, which inverts the face's own depth order and puts the
// figure's frontmost point in the wrong feature.
const AMPLITUDE: number[][] = [
  [0, 0.0335], [30 * DEG, 0.0300], [55 * DEG, 0.0248],
  [75 * DEG, 0.0178], [90 * DEG, 0.0104], [EDGE, 0.0030],
]
// Volume by height WITHIN the band: thickest a third of the way up (the
// mass under the chin), thinning to nothing at both edges.
const SHAPE: number[][] = [
  [0, 0], [0.10, 0.62], [0.30, 1], [0.55, 0.95], [0.78, 0.66], [0.92, 0.30], [1, 0],
]
// The rim never quite reaches zero: at 1.6 mm the hair edge stands proud
// of the skin as a real thin edge instead of z-fighting against it.
const LIP = 0.0016
const THICKNESS = 0.0062
// A moustache ridge across the lip line, so the beard has an internal form
// break instead of being one smooth bib from nose to collar.
const TASH = 0.0062
const TASH_Y = 0.0886
const TASH_WY = 0.0104
const TASH_WT = 0.62

/** Deterministic, bilaterally symmetric ripple. Built from cos(k*|angle|)
 *  terms with no phase so its slope is zero at the chin — a phase term
 *  there would crease the beard straight down the middle. */
function ripple(a: number, k1: number, w1: number, k2: number, w2: number): number {
  return w1 * (1 - Math.cos(k1 * a)) + w2 * (1 - Math.cos(k2 * a))
}

function beardPatch(u: number, v: number): Pt {
  const theta = -EDGE + u * 2 * EDGE
  const a = Math.abs(theta)
  const top = smoothTable(TOP, a, 1) + ripple(a, 8.3, 0.0042, 14.1, 0.0022)
  const bottom = smoothTable(BOTTOM, a, 1) - ripple(a, 6.1, 0.0068, 10.9, 0.0035)
  const y = bottom + (top - bottom) * v
  const thick = LIP + smoothTable(AMPLITUDE, a, 1) * smoothTable(SHAPE, v, 1)
    + TASH * bell(y - TASH_Y, TASH_WY) * bell(theta, TASH_WT)
  const skin = headPointAtY(theta, y)
  return [skin[0] + Math.sin(theta) * thick, y, skin[2] - Math.cos(theta) * thick]
}

export function buildBeard(disposables: BufferGeometry[], head: Group, hair: MeshStandardMaterial): void {
  attach(disposables, head, shellGeo(beardPatch, 56, 30, THICKNESS), hair, 0, 0, 0, 'beard')
}
