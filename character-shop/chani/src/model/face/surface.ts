// character-shop/chani/src/model/face/surface.ts
// One function: "where is Chani's skin at this angle and this height?"
// Everything downstream — the mesher, the brows, the ears, the hair
// shell's front line — asks THIS, so nothing can drift away from the
// surface that actually gets triangulated. R1's hair sat on a skull it had
// only been eyeballed against; the hairline came out as a hard diagonal.

import { stationAt, stationRow } from './station'
import { centreFace } from './mouth'
import { noseField } from './nose'
import { frontNarrow, jawCrease } from './jaw'
import { upperFace } from './warp'

export type Pt = [number, number, number]

/** Sampling bias: mesh columns crowd toward the face. theta = a - BIAS *
 *  sin a, whose derivative is 1 - BIAS cos a — so the front centre line
 *  gets columns (1 + BIAS) / (1 - BIAS) times finer than the occiput, and
 *  the map stays monotonic for any BIAS < 1.
 *
 *  0.60, not 0.46. MEASURED across the finished vertices at lip height:
 *  0.46 left a 2.40mm worst-case gap between adjacent columns on the front
 *  of the face, which is coarser than the philtrum (4mm wide), coarser
 *  than the alar crease and about the size of the whole cupid's bow. 0.60
 *  brings it under 1.3mm. The occiput pays for it and has nothing there to
 *  lose. */
const BIAS = 0.60

/** theta for column parameter u. 0 is the front centre line, PI the back
 *  of the skull, matching loft.ts's convention so both meshes wind the
 *  same way. */
export function thetaOf(u: number): number {
  const a = u * Math.PI * 2
  return a - BIAS * Math.sin(a)
}

function warped(x: number, y: number, z: number, cos: number): Pt {
  // -0.28, not 0: the jawline reaches back PAST the ear canal (jaw.ts's
  // own mask fades it out at cos = -0.25), and cutting the warp off at
  // cos = 0 would slice the mandible border in half with a hard step
  // exactly at the widest point of the head. Every other field is masked
  // by a clamped cos, so none of them leak into that band.
  if (cos <= -0.28) return [x, y, z]
  const ax = Math.abs(x)
  const pos = Math.max(0, cos)
  const front = pos * pos
  const wide = pos ** 0.55
  const a = upperFace(ax, y, front, wide)
  const b = jawCrease(ax, y, cos)
  const c = centreFace(x, ax, y, front)
  const d = noseField(x, ax, y, front)
  const dx = (a.dx + b.dx + c.dx + d.dx) * Math.sign(x)
  return [x + dx, y, z + a.dz + b.dz + c.dz + d.dz]
}

function pointFrom(theta: number, row: readonly number[]): Pt {
  const [y, rx, rzF, rzB, zc] = row
  const cos = Math.cos(theta)
  // Blend front half-depth into back half-depth across the ring; at the
  // sides the surface passes through zc either way, which is where a
  // head's widest point genuinely sits.
  const rz = Math.max(0, rzB + (rzF - rzB) * 0.5 * (1 + cos))
  // frontNarrow SCALES x by a factor that is 1 at the sides and pinches
  // toward the front centre line — the chin carved out of a ring that
  // still has to hold a throat. Multiplicative, so it can never drive x
  // through zero and fold the surface back on itself, which an additive
  // pull did at every angle inside 20 degrees.
  const narrow = cos > 0 ? frontNarrow(y, cos * cos) : 1
  return warped(Math.max(0, rx) * Math.sin(theta) * narrow, y, zc - rz * cos, cos)
}

/** The meshed surface. u walks around the head, v walks the station table
 *  from the neck root (0) to the scalp apex (1). */
export function headSurface(u: number, v: number): Pt {
  return pointFrom(thetaOf(u), stationRow(v))
}

/** The skin at an arbitrary angle and HEIGHT, for anything that has to sit
 *  on the face rather than be part of it. */
export function skinAtAngle(theta: number, y: number): Pt {
  return pointFrom(theta, stationAt(y))
}

/** The skin at a head-local (x, y) on the FRONT of the face — the angle
 *  whose surface point lands at this half-width, which is how brows.ts
 *  lays a brow along the brow ridge it is meant to sit on. Solved by
 *  bisection because frontNarrow makes x(theta) non-analytic; 24 steps
 *  resolve it to well under a tenth of a millimetre. */
export function skinAtFront(x: number, y: number): Pt {
  const row = stationAt(y)
  const ax = Math.abs(x)
  let lo = 0
  let hi = Math.PI / 2
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (pointFrom(mid, row)[0] < ax) lo = mid
    else hi = mid
  }
  const theta = (lo + hi) / 2
  return pointFrom(x < 0 ? -theta : theta, row)
}
