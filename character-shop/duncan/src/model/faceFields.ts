// character-shop/duncan/src/model/faceFields.ts
// The vocabulary every face form in this shop is written in. Three shapes,
// no more:
//
//   bell   — 1 at the centre, exactly 0 at the edge, smooth at both. Fields
//            SUM, so a term has to reach zero and stay there or every form
//            leaks into every other one and the face turns to porridge.
//   patch  — an elliptical, TILTABLE bell in the x/y plane. Brows, sockets,
//            lids, cheekbones, the scar: each is one patch, and the tilt is
//            what stops a paired feature reading as a horizontal bar (R1's
//            "sunglasses" verdict on an untilted brow lens).
//   rib    — a vertical form whose amplitude AND half-width are authored at
//            a handful of heights and Catmull-Rom interpolated between them.
//            A nose bridge is not a bell: it is a profile that eases from
//            nothing at the nasion, through a convexity, out to the tip and
//            back in under the base. Only a table can say that.
//
// All three return a plain scalar. What it displaces — straight along -Z, or
// outward along the surface (loft.ts's SurfacePoint.nx/nz) — is the caller's
// choice: a nose pushes forward, a cheekbone pushes outward.

import { spline } from './stations'

/** 1 at t = 0, 0 at |t| >= 1, C1 at both ends. */
export function bell(t: number): number {
  const a = Math.abs(t)
  return a >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * a))
}

/** An elliptical bell centred on the caller's own offset, rotated by `tilt`
 *  radians — POSITIVE tilt lifts the +x end, the same sense as three.js's
 *  rotation.z, so a patch and the blob that sits on it can share one angle. */
export function patch(
  dx: number, dy: number, rx: number, ry: number, tilt = 0,
): number {
  if (tilt === 0) return bell(Math.hypot(dx / rx, dy / ry))
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return bell(Math.hypot((dx * c + dy * s) / rx, (dy * c - dx * s) / ry))
}

/** A bell with a FLAT TOP: 1 out to `flat` of the radius, then eased to 0 at
 *  the edge. The eye opening needs this and a bell cannot do it. A dark lens
 *  set into a belled recess loses a race it cannot win — the skin curves
 *  forward away from the pupil at very nearly the rate the globe curves
 *  back, so the eye shows at one point in the middle and nowhere else, which
 *  is measurably what R2's second render did (22.5 x 5.6mm of visible eye).
 *  A flat-bottomed recess holds its depth across the whole opening, and the
 *  palpebral fissure is flat-bottomed in the anatomy too. */
export function plateau(
  dx: number, dy: number, rx: number, ry: number, flat: number, tilt = 0,
): number {
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  const t = Math.hypot((dx * c + dy * s) / rx, (dy * c - dx * s) / ry)
  if (t <= flat) return 1
  if (t >= 1) return 0
  return 0.5 * (1 + Math.cos((Math.PI * (t - flat)) / (1 - flat)))
}

/** One authored height of a vertical form: how far it stands proud there
 *  (amp, metres) and how far to each side it reaches (half, metres). */
export interface Rib {
  y: number
  amp: number
  half: number
}

function at(ribs: Rib[], i: number): Rib {
  return ribs[Math.min(ribs.length - 1, Math.max(0, i))]
}

/** The rib's amplitude and half-width at a HEIGHT. Outside the table the
 *  amplitude is zero — a rib's first and last entries are the heights where
 *  the form has already faded, never where it is still doing something. */
export function ribAt(ribs: Rib[], y: number): { amp: number; half: number } {
  const last = ribs.length - 1
  if (y <= ribs[0].y || y >= ribs[last].y) return { amp: 0, half: ribs[0].half }
  let i = 0
  while (i < last - 1 && ribs[i + 1].y < y) i++
  const span = ribs[i + 1].y - ribs[i].y
  const t = span > 0 ? (y - ribs[i].y) / span : 0
  const pick = (f: (r: Rib) => number): number =>
    spline(f(at(ribs, i - 1)), f(at(ribs, i)), f(at(ribs, i + 1)), f(at(ribs, i + 2)), t)
  return { amp: pick((r) => r.amp), half: Math.max(1e-4, pick((r) => r.half)) }
}

/** A rib evaluated at a point: its authored profile down y, belled across x
 *  so the form has a rounded section and ends where the table says it ends. */
export function ribField(ribs: Rib[], y: number, x: number, cx = 0): number {
  const { amp, half } = ribAt(ribs, y)
  if (amp === 0) return 0
  return amp * bell((x - cx) / half)
}
