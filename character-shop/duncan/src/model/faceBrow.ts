// character-shop/duncan/src/model/faceBrow.ts
// The UPPER face as summed displacement: the brow shelf, the boss between
// the pair, the nasion under it, the forehead's bosses, the scar's groove —
// and the orbit the eyeball sits in. Split out of faceSculpt.ts when this
// round's rebuild took that file past 200 lines; the sign convention is
// unchanged and is faceSculpt.ts's (positive = back into the head).
//
// TWO PASS-1 FAILURES ARE FIXED HERE, both of them the same mistake:
//
//   THE CREASE DENTS beside the nasion. A 5.5mm glabella boss with a 13mm
//   radius sat directly on top of a 6mm nasion dip with a 9mm radius. Two
//   opposed forms that narrow leave a hard rim where they cross, and at head
//   framing that rim rendered as a pair of diagonal dents flanking the bridge
//   — read by a critic as glitches, and they were. Both are now broad enough
//   that their gradients overlap instead of colliding: same displacements,
//   nearly double the radii, no rim.
//
//   THE LIDS as smooth ramps. A bell-shaped lid ridge is a hill, and a hill
//   has no edge; the eye needs a LEDGE. The two lid terms are plateaus now,
//   which hold their forward reach across the lid and then fall off it, so
//   the skin steps rather than slopes. lids.ts adds the geometry that the
//   step alone still cannot give — the margin itself.

import { patch, plateau } from './faceFields'
import { FACE, SCAR, SCAR_ACROSS } from './faceLandmarks'

const SIDES = [-1, 1] as const

/** How far each eye's long axis drops toward its outer corner. Shared by the
 *  socket, both lid ledges, the lid geometry (lids.ts) and the globe itself
 *  (eyes.ts), so the whole orbit tilts as one thing — the "slight downturn at
 *  the outer corners". */
export const ORBIT_TILT = 0.10

/** Brow ridge, the glabella boss between the pair, the nasion dip below it,
 *  the forehead's paired bosses, and the scar. Positive = back into the head.
 *
 *  The ridge is a SHELF: 17mm of projection over a 48 x 15mm patch, tilted
 *  down and out. Its job is to overhang the eye, and every millimetre of
 *  shadow the eye reads by is cast from here. */
export function browRelief(x: number, y: number): number {
  let fwd = 0
  for (const side of SIDES) {
    fwd -= 0.0170 * patch(x - side * FACE.browX, y - FACE.browCrest, 0.0480, 0.0150, -0.13 * side)
  }
  fwd -= 0.0042 * patch(x, y - FACE.glabella, 0.0250, 0.0175)
  fwd += 0.0052 * patch(x, y - FACE.nasion, 0.0175, 0.0125)
  // Broadened again this pass: these are also the only forms that carry the
  // upper skull's WIDTH forward onto the face, and the front render read the
  // cranium as narrow with everything crowded into the lower half.
  for (const side of SIDES) {
    fwd -= 0.0046 * patch(x - side * 0.0330, y - FACE.frontalEminence, 0.0380, 0.0250)
  }
  // The scar's TROUGH, offset onto one flank of the cord scar.ts lofts rather
  // than centred under it — faceLandmarks.ts SCAR argues the offset, the
  // shading arithmetic behind it and the side; headFeatures.test.ts hard-codes
  // the side so a flip fails loudly.
  const gx = x - SCAR.x + SCAR_ACROSS.x * SCAR.offset
  const gy = y - SCAR.y + SCAR_ACROSS.y * SCAR.offset
  fwd += SCAR.depth * patch(gx, gy, SCAR.long, SCAR.across, SCAR.tilt)
  return fwd
}

/** The orbit: a socket bowl, a flat-bottomed palpebral slot inside it, and
 *  the two lid LEDGES that close it top and bottom with the hood's crease
 *  tucking under the brow between them.
 *
 *  The slot is flat-bottomed on purpose and faceFields.ts's plateau explains
 *  why a bell cannot do it — the skin curves forward away from the pupil at
 *  very nearly the rate a globe curves back, so a belled recess shows the eye
 *  at one point in the middle and nowhere else.
 *
 *  The LOWER ledge is deliberately weaker than pass 1's. It used to surge the
 *  skin 6mm forward right under the pupil, which buried lids.ts's lower lid
 *  before it could draw anything; the margin is geometry's job now and the
 *  field only has to get out of its way and then come forward into the cheek. */
export function orbitRelief(x: number, y: number): number {
  let fwd = 0
  for (const side of SIDES) {
    const dx = x - side * FACE.pupilX
    const tilt = -ORBIT_TILT * side
    fwd += 0.0125 * patch(dx, y - FACE.eye, 0.0470, 0.0200, tilt)
    fwd += 0.0080 * plateau(dx, y - FACE.eye, 0.0330, 0.0130, 0.66, tilt)
    fwd -= 0.0092 * plateau(dx, y - 1.8180, 0.0300, 0.0072, 0.50, tilt)
    fwd += 0.0048 * patch(dx, y - FACE.lidCrease, 0.0310, 0.0050, tilt)
    fwd -= 0.0034 * plateau(dx, y - 1.7972, 0.0310, 0.0068, 0.45, tilt)
  }
  return fwd
}
