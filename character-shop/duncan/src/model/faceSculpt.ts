// character-shop/duncan/src/model/faceSculpt.ts
// The face, as one summed displacement field over the skull loft. Nothing
// here adds a mesh; every form is a number added to a vertex that was already
// part of a single continuous head. Two displacement senses:
//
//   fwd — straight along -Z. Anything whose job is to PROJECT: brow, nose,
//         lips, chin. Pushing these radially would fan them sideways and
//         fatten the face as they grew.
//   out — along the surface's own outward direction. Anything that WRAPS:
//         cheekbone, jaw corner, temple. These have to stay on the skull as
//         they travel around it.
//
// The forms themselves live in faceBrow.ts (brow, orbit, scar) and
// faceMouth.ts (nose, lips, the lip lines); this file keeps the masses that
// wrap, solves WHERE THE FACE IS for everything laid on top of it, and hands
// the sum to loft(). It was one file until pass 2's rebuild took it past 200
// lines — the split is by what each group of forms DOES, not by size.

import { patch } from './faceFields'
import type { Sculptor, SurfacePoint } from './loft'
import { profileAtY } from './stations'
import type { Station } from './stations'
import { FACE } from './faceLandmarks'
import { browRelief, orbitRelief } from './faceBrow'
import { featureRelief } from './faceMouth'

export { ORBIT_TILT } from './faceBrow'

const SIDES = [-1, 1] as const

/** The forms that wrap: cheekbone, the hollow under it, the squared jaw
 *  corner, the flattened temple. Positive = outward.
 *
 *  The temple's flattening is HALVED this pass. It was a 4mm scoop out of
 *  each side at exactly the height the forehead is widest, and the front
 *  render read the cranium as narrow with the whole face crowded into the
 *  lower half. The zygion is untouched: face.test.ts holds the bizygomatic
 *  breadth under 0.70 of head height and it already measures 0.673, so the
 *  width this round buys has to come from ABOVE the cheekbone, never from it. */
function massRelief(x: number, y: number): number {
  let out = 0
  for (const side of SIDES) {
    out += 0.0125 * patch(x - side * 0.0580, y - FACE.zygion, 0.0340, 0.0230)
    out -= 0.0040 * patch(x - side * 0.0520, y - 1.7690, 0.0260, 0.0170)
    out += 0.0060 * patch(x - side * FACE.gonionX, y - 1.7230, 0.0260, 0.0195)
    out -= 0.0020 * patch(x - side * FACE.templeX, y - 1.8360, 0.0300, 0.0260)
  }
  return out
}

/** WHERE THE FACE ACTUALLY IS at (x, y) — the front of the sculpted skull,
 *  solved rather than guessed.
 *
 *  R2's first render failed on exactly this. Brow tufts and eye masses were
 *  placed at one authored depth each, and a head is round: at 60mm off the
 *  centreline the skull has already fallen 25mm back, so every one of them
 *  hung in mid-air past the face's own outline — four black pebbles floating
 *  beside a head. Anything laid ON this face asks here first: brows.ts,
 *  lids.ts and eyes.ts all take the answer as a callback.
 *
 *  Inverts loft.ts's own egg ring for the FRONT solution (cos theta < 0),
 *  then runs the same sculptor the surface was built with, so the answer
 *  includes the brow, the socket and every other field. */
export function frontZAt(
  stations: Station[], sculpt: Sculptor, originY: number, x: number, y: number,
): number {
  const p = profileAtY(stations, y)
  const s = Math.max(-1, Math.min(1, (x - p.cx) / p.rx))
  const c = -Math.sqrt(Math.max(0, 1 - s * s))
  const rz = (p.rb * (1 + c) + p.rf * (1 - c)) / 2
  const dx = p.rx * s
  const dz = rz * c
  const len = Math.hypot(dx, dz) || 1
  const point: SurfacePoint = { x, y: y - originY, z: p.cz + dz, nx: dx / len, nz: dz / len }
  sculpt(point)
  return point.z
}

/** How much of the face's field applies at a vertex, by which way that vertex
 *  FACES. Every form in this file and its two neighbours is a function of
 *  (x, y) alone, and a skull is a closed loop in x: the vertex on the occiput
 *  at x = 44mm has the same (x, y) as the one on the cheek and was getting the
 *  same displacement. That is not a stylistic complaint. Measured on the built
 *  surface, the socket bowl (+12.5mm "into the head" at the eye line) and the
 *  cheekbone both landed on the BACK of the skull as a 17mm outward bulge at
 *  |x| 36-56mm, y 1.800-1.812 — which punched through the hair cap and put two
 *  symmetric patches of bare scalp in the back render. Raycast against the
 *  back camera: 226 pixels of skull, x[-57.6, 57.6], y[1800.6, 1811.6].
 *
 *  `nz` is the ring's own outward direction (sculpt.ts): negative on the face,
 *  zero at the widest flank, positive on the occiput. Full weight to the
 *  widest point, so nothing the width guards measure can move, then eased off
 *  behind it. The apexes come in with nz = 0 and keep full weight, which is
 *  what the chin and the crown need (loft.ts argues that case). */
const REAR_FADE = 0.40

function faceWeight(nz: number): number {
  if (nz <= 0) return 1
  if (nz >= REAR_FADE) return 0
  const t = nz / REAR_FADE
  return 1 - t * t * (3 - 2 * t)
}

/** The whole face, ready to hand to loft(). `originY` converts the loft's
 *  group-local heights back into the stature metres every table is written
 *  in — one conversion, in one place. */
export function sculptFace(originY: number): Sculptor {
  return (p: SurfacePoint): void => {
    const y = p.y + originY
    if (y < 1.6600 || y > 1.8900) return
    const w = faceWeight(p.nz)
    if (w === 0) return
    const fwd = browRelief(p.x, y) + orbitRelief(p.x, y) + featureRelief(p.x, y)
    const out = massRelief(p.x, y) * w
    p.z += fwd * w
    p.x += out * p.nx
    p.z += out * p.nz
  }
}
