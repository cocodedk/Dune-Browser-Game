// character-shop/chani/src/model/face/warp.ts
// The ORBIT — brow ridge, socket, orbital seat, lid fold, lower-lid mass —
// as displacement FIELDS on the head's own surface (station.ts). Nothing
// here is a mesh; every form is a pair of Gaussians summed into the same
// surface, so the brow grows out of the forehead, the sockets hollow under
// it and the lids answer them with no seam anywhere. The side of the face
// moved to cheeks.ts in pass 3 (200-line rule) and is summed in below.
//
// RELIEF IS SIZED FOR THE HARNESS LIGHTS, not for the vertex table. R1's
// measured-fine 12mm brow rendered as a smudge; the values below are the
// ones that throw a shadow under a 3-point rig at bust framing. A face
// reads by the step between its planes, so every field is quoted with the
// step it makes against its neighbour.
//
// Destination (lead's art notes): softly angular heart shape, high wide
// cheekbones, clean tapering jaw. Large wide-set almond eyes with a strong
// upper-lid line. Everything is placed off EYE_Y and EYE_X so the spec's
// own eye line drives the whole face.

import { bell, bellSplit, medial } from './curves'
import { cheekMass } from './cheeks'
import { EYE_X, EYE_Y } from './plan'

export interface Delta {
  dx: number
  dz: number
}

/** Medial gate for the orbital forms. Tighter than cheeks.ts's, because an
 *  eye socket legitimately reaches further in than a cheekbone does — but
 *  it still has to stop before the nose bridge, and pass 2's did not: the
 *  socket alone pushed 0.11mm into the centre line at bridge height. */
const IN_FROM = 0.0075
const IN_TO = 0.0210

// Brow ridge. Peaks over the outer third of each eye and only softens at
// the glabella, never vanishing: a continuous shelf is what casts the
// shadow that makes the eyes read deep. It is the one orbital form that is
// NOT medially gated — the dish it leaves between the two peaks is the
// glabella, and that dish is anatomy, not interference.
//
// MEASURED, three times now. At 0.0178 the finished vertices put the ridge
// 13.6mm proud of the socket floor, and R1 established on this exact
// harness that 12mm reads as a smudge and ~17mm reads; at 0.0230 it
// measured ~19mm and rendered as a man's brow. head.test.ts holds it above
// 15mm; pass 2 landed at 16.97mm and pass 3 leaves it alone.
//
// PASS 2 TRIED TO DROP THE RIDGE 4.8mm AND PUT IT BACK. At EYE_Y + 10.0 the
// ridge sat 1.1mm above the aperture's own top edge, so its forward mass
// and the lid crease under it buried the top third of the eye. The vertical
// stack is not negotiable: aperture top at EYE_Y + 8.9, lid crease above
// it, ridge above that. The peak follows EYE_X outward so the ridge stays
// over the eye it belongs to.
const BROW_Y = EYE_Y + 0.0150
const BROW_OUT = 0.0190
const BROW_PEAK_X = EYE_X - 0.0050
const BROW_WX = 0.0310
const BROW_WY = 0.0110

// Eye sockets, hollowed back under the ridge. Wide (25.8mm sigma) because
// the eyes themselves are large and wide-set; a tight socket around a large
// eye reads as a bulging eyeball.
//
// PASS 3 SPLIT ITS VERTICAL SIGMA, and that is the whole tear-trough fix.
// One sigma cannot describe a socket: the hollow belongs ABOVE the eye,
// under the ridge, and below the lash line there is no hollow at all on a
// young face. At 16.6mm both ways this field was still worth 2.6mm of
// recess 20mm below the eye line — a shadow crescent under each eye, on a
// 24-year-old, in every capture. 17.0 up and 9.2 down keeps the depth the
// lens is seated in and stops it reaching the cheek.
const SOCKET_Y = EYE_Y + 0.0005
const SOCKET_IN = 0.0120
const SOCKET_WX = 0.0258
const SOCKET_WY_UP = 0.0170
const SOCKET_WY_DOWN = 0.0092

// The orbital SEAT: a tight second recess right at the aperture, inside the
// broad socket. PASS 3 ADDED IT, for the finding that outranked every other
// one — "two blue marbles pressed into a mask".
//
// The broad socket alone cannot seat an eye. Its 25.8mm sigma means the
// skin falls away over 50mm, so the rim of the aperture meets skin that is
// almost in the aperture's own plane, and what the renderer draws is a
// hard blue-to-skin edge with no form change across it: a decal. The seat
// is 3.0mm over a 16.5 x 9.2mm sigma — barely wider than the almond — so
// the skin steps back within a few millimetres of the lens and the lens
// sits IN something. It is deliberately small: deepen it and the eye
// becomes a bead on a crater, which is the failure pass 2 measured when it
// tried the same fix with socket depth instead.
const SEAT_IN = 0.0030
const SEAT_WX = 0.0165
const SEAT_WY = 0.0092

// Upper-lid FOLD — the crease above the lid, not the lid. lids.ts builds
// the lid itself as geometry now, and this field's job changed with it:
// it is the shadow line where the mobile lid disappears under the orbital
// rim, so it sits just above where the lid mass tops out.
//
// Pass 1 put the crease at EYE_Y + 9.4 against an aperture whose top edge
// is at EYE_Y + 8.9 — the fold was sitting ON the eye, and a pixel scan
// found 10.05mm of blue on screen out of 16.43mm of authored almond. Pass 2
// moved it to +12.0 and exposed 12.8mm. Pass 3 moves it 1.2mm further up
// and takes 1.0mm off its amplitude, because the lid geometry now supplies
// the overhang this field used to fake — two overhangs stacked is a hood.
const LID_Y = EYE_Y + 0.0132
const LID_OUT = 0.0060
const LID_WX = 0.0180
const LID_WY = 0.0058

// Lower lid — the infraorbital mass, and the second half of the de-ageing
// pass. 2.2mm was an "answering form" that stopped the eye reading as a
// hole; 4.6mm is a young lower lid, full enough that the skin under the
// lash line comes forward rather than falling away into the cheek. Between
// this and the socket's split sigma there is no longer any recess at all
// between the eye and the malar pad, which is what the word "careworn" was
// pointing at.
const LOWLID_Y = EYE_Y - 0.0118
const LOWLID_OUT = 0.0046
const LOWLID_WX = 0.0190
const LOWLID_WY = 0.0082

/** Brow, socket, seat, lid fold, lower lid — plus cheeks.ts's side of the
 *  face, summed into the same point.
 *
 *  `front` is the cos^2 mask — 1 dead front, 0 at the ears. `wide` is
 *  cos^0.55, which is still 0.81 where cos^2 has fallen to 0.48. Forms that
 *  sit near the centre line take `front`, because it is the mask that keeps
 *  a nose or a brow from leaking round the skull. Forms that sit on the
 *  SIDE of the face take `wide`, because cos^2 throws away most of their
 *  amplitude exactly where they live. */
export function upperFace(ax: number, y: number, front: number, wide: number): Delta {
  const orbit = front * medial(ax, IN_FROM, IN_TO)
  let dz = 0
  dz -= BROW_OUT * bell(ax - BROW_PEAK_X, BROW_WX) * bell(y - BROW_Y, BROW_WY) * front
  dz += SOCKET_IN * bell(ax - EYE_X, SOCKET_WX)
    * bellSplit(y - SOCKET_Y, SOCKET_WY_UP, SOCKET_WY_DOWN) * orbit
  dz += SEAT_IN * bell(ax - EYE_X, SEAT_WX) * bell(y - EYE_Y, SEAT_WY) * orbit
  dz -= LID_OUT * bell(ax - EYE_X, LID_WX) * bell(y - LID_Y, LID_WY) * orbit
  dz -= LOWLID_OUT * bell(ax - EYE_X, LOWLID_WX) * bell(y - LOWLID_Y, LOWLID_WY) * orbit

  const cheek = cheekMass(ax, y, wide)
  return { dx: cheek.dx, dz: dz + cheek.dz }
}
