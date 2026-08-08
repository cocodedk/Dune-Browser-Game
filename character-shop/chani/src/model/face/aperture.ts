// character-shop/chani/src/model/face/aperture.ts
// The eye APERTURE as a station table, plus the two things that have to
// agree about it: the blue lens (eyes.ts) and the lids that wrap it
// (lids.ts). PASS 3 split this out of eyes.ts so the lids can ask the lens
// where its own front surface is at any (x, y) instead of re-deriving it —
// a lid that drifts off the eye it is supposed to cover is worse than no
// lid, and re-deriving is how that happens.
//
// Local frame: x runs outward (toward the ear), y up, z back into the
// skull; the origin is the aperture centre and z = 0 is its canthus plane,
// which sits within a millimetre of the surrounding skin. Rings stack in y
// and each ring's own X CENTRE shifts — the upper lid's peak sits inboard
// of centre and the lower lid's trough outboard, which is what makes an
// almond an almond instead of a lens.
//
// Mirroring is negating x, never scaling by -1: a negative determinant
// would flip the winding and depth.test.ts would find the volume negative.

import type { Object3D } from 'three'
import { lookupByKey } from './curves'
import { EYE_X, EYE_Y, EYE_Z } from './plan'

/** 38.8mm wide by 16.8mm tall in the table, which the cant and the wrap
 *  bring to a MEASURED 37.1 x 16.4: LARGE, per the brief, against a 146mm
 *  bizygomatic — 0.25 of the face's own width.
 *
 *  NINE RINGS, AND A NEARLY FLAT rzF COLUMN. Both are capture findings.
 *  Seven rings put a straight segment every 2.4mm up a 16mm outline, and
 *  the almond rendered with a visibly chorded edge. The rzF column mattered
 *  more: at 3.4mm on the bottom ring against 6.3 at the widest, the eye's
 *  lower half sat BEHIND the lower-lid skin and the renderer drew skin over
 *  it — a blue shape with a hard straight bottom edge, reading as a
 *  half-closed slit. With full ibad there is no white to say where the eye
 *  stops, so the entire authored outline has to stand clear of the skin or
 *  it is not the outline any more.
 *
 *  PASS 3 ROUNDED THE BOTTOM RING from 3.0mm of half-width to 4.4 and
 *  raised the one above it. The brief asks the lower lid for "a rounder
 *  curve", and the lid can only be as round as the edge it follows: a
 *  3.0mm bottom ring is a point, and a lid swept along a point is a V. */
export const APERTURE: readonly number[][] = [
  // y,       rx,      xc,      rzF,     rzB
  [-0.0079, 0.0044, 0.0028, 0.0048, 0.0060], // lower lid trough, biased outboard
  [-0.0062, 0.0092, 0.0022, 0.0054, 0.0070],
  [-0.0042, 0.0134, 0.0012, 0.0058, 0.0080],
  [-0.0018, 0.0176, -0.0004, 0.0062, 0.0090],
  [0.0009, 0.0194, -0.0014, 0.0064, 0.0096], // canthus line — the widest slice
  [0.0034, 0.0176, -0.0022, 0.0062, 0.0092],
  [0.0058, 0.0134, -0.0030, 0.0058, 0.0084],
  [0.0076, 0.0084, -0.0036, 0.0052, 0.0072],
  [0.0089, 0.0032, -0.0040, 0.0042, 0.0060], // upper lid peak, biased inboard
]

/** The canthus line: the ring the two corners sit on, and the baseline both
 *  lid margins arc away from. */
export const CANTHUS_Y = 0.0009
export const INNER_X = -0.0208
export const OUTER_X = 0.0180
export const MID_X = (INNER_X + OUTER_X) / 2
export const HALF_X = (OUTER_X - INNER_X) / 2

/** Outer-corner cant. 10 degrees lifts the outer canthus ~2.9mm above the
 *  inner one — the brief's "subtle upward cant", which at 15 degrees would
 *  stop being subtle and start being a mask. */
export const CANT = (10 * Math.PI) / 180
/** Wrap. The eye follows the face's own curvature instead of sitting on a
 *  flat plate: 15 degrees carries the outer canthus ~4mm back. */
export const YAW = (15 * Math.PI) / 180

/** The lens's own front surface at an eye-local (x, y) — the ellipse of the
 *  ring at that height, solved for z. Outside the outline it returns the
 *  canthus plane, which is BEHIND the front everywhere, so a caller that
 *  takes the more-forward of this and its own floor gets a lid that wraps
 *  the eye where there is an eye and lies on skin where there is not. */
export function apertureFront(x: number, y: number): number {
  const n = APERTURE.length
  if (y <= APERTURE[0][0] || y >= APERTURE[n - 1][0]) return 0
  const [, rx, xc, rzF] = lookupByKey(APERTURE, y)
  const d = (x - xc) / rx
  if (d <= -1 || d >= 1) return 0
  return -rzF * Math.sqrt(1 - d * d)
}

/** Park an eye-frame mesh on the face. `side` is +1 for the figure's own
 *  right (+X), which is the side armR sits on. Every mesh built in the
 *  aperture's frame — lens, upper lid, lower lid — takes this and only
 *  this, so the three can never drift apart. */
export function placeAtEye(mesh: Object3D, side: number): void {
  mesh.position.set(side * EYE_X, EYE_Y, EYE_Z)
  mesh.rotation.set(0, -side * YAW, side * CANT)
}
