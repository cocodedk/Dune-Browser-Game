// character-shop/stilgar/src/model/geometry/face.ts
// The face, sculpted INTO the head's own surface rather than stuck onto it.
//
// Pass 2 built the face from separate ellipsoids — a wide flat "brow" disc
// and a "nose" ball — and they read exactly as what they were: a mushroom
// cap on a stem. Every form here is instead a displacement of the single
// lofted head surface (head.ts), summed as smooth Gaussians so that
// neighbouring forms BLEND into one continuous surface: the brow ridge
// grows out of the forehead, the sockets are hollowed under it, the
// cheekbones swell out of the sockets' lower edge, and the nose grows out
// of the face plane between them. There is no seam to see because there is
// no second mesh.
//
// Bardem's Stilgar drives the values: heavy continuous brow, deep-set eyes,
// broad nose, wide cheekbones. Everything is placed relative to
// eyeLineLocal, so the spec's eye-line fraction moves the whole face.

import { bell, smoothTable } from './curves'
import { eyeLineLocal } from '../proportions'
import type { Pt } from './mesh'

const EY = eyeLineLocal

// Brow ridge — proud of the forehead, peaking over each eye and only
// softening (never vanishing) at the glabella between them: a continuous
// shelf, which is what casts the shadow that makes the eyes read deep.
// Amplitudes are the pass-3 second-pass values. The first set (brow 12.2,
// socket 11.2, cheek 5.8 mm) measured fine and rendered as a smudge: at
// bust framing a face reads by the SHADOW its relief throws, and a 12 mm
// ridge over an 11 mm hollow was not a big enough step to throw one under
// the harness's soft key/fill pair. Raised until the brow line, the eye
// hollow and the cheek plane each read as separate values.
const BROW_Y = EY + 0.0182
const BROW_OUT = 0.0168
const BROW_PEAK_X = 0.0250
const BROW_WX = 0.0305
const BROW_WY = 0.0135

// Eye sockets — hollowed back under the ridge, then given a lid bulge
// inside the hollow so the socket reads as an eye in shadow rather than as
// an empty skull orbit. Ibad colour is R3's; this round owns the FORM.
const SOCKET_X = 0.0318
const SOCKET_Y = EY - 0.0016
const SOCKET_IN = 0.0170
const SOCKET_WX = 0.0222
const SOCKET_WY = 0.0150
const LID_OUT = 0.0090
const LID_WX = 0.0138
const LID_WY = 0.0088

// Cheekbones — out and forward, the plane change that stops the mid-face
// reading as a smooth egg. Pushed sideways as well as forward, because a
// zygomatic arch widens the head, it does not just bulge toward camera.
const CHEEK_X = 0.0515
const CHEEK_Y = EY - 0.0180
const CHEEK_OUT = 0.0078
const CHEEK_WIDEN = 0.0050
const CHEEK_WX = 0.0255
const CHEEK_WY = 0.0195

// Cheek hollow under the arch — a shallow suck-in above the beard line
// that gives the cheekbone something to sit proud OF.
const HOLLOW_X = 0.0505
const HOLLOW_Y = EY - 0.0400
const HOLLOW_IN = 0.0055
const HOLLOW_WX = 0.0230
const HOLLOW_WY = 0.0165

// Nose, as a profile: [height, protrusion beyond the face plane, half
// width]. Read bottom-up it is philtrum, nostril wings, ball, tip, lower
// bridge, bridge, nasion, brow. The tip is the frontmost value on the
// whole figure by construction — 30 mm proud of a face plane that is
// itself the frontmost surface — which is what keeps seam.test.ts's
// face-toward-minus-Z guard honest without a special-case mesh.
const NOSE: number[][] = [
  [EY - 0.0410, 0.0000, 0.0170],
  [EY - 0.0330, 0.0132, 0.0228],
  [EY - 0.0268, 0.0274, 0.0207],
  [EY - 0.0230, 0.0318, 0.0178],
  [EY - 0.0150, 0.0246, 0.0140],
  [EY - 0.0040, 0.0156, 0.0118],
  [EY + 0.0082, 0.0080, 0.0106],
  [EY + 0.0180, 0.0000, 0.0100],
]

/** Displace one point of the head's lofted surface into a face. `cosT` is
 *  the point's own cos(angle-from-front): squaring it gives a mask that is
 *  1 dead front and 0 at the ears, so nothing here can leak round the back
 *  of the skull. */
export function faceWarp(x: number, y: number, z: number, cosT: number): Pt {
  if (cosT <= 0) return [x, y, z]
  const front = cosT * cosT
  const ax = Math.abs(x)
  let dx = 0
  let dz = 0

  dz -= BROW_OUT * bell(ax - BROW_PEAK_X, BROW_WX) * bell(y - BROW_Y, BROW_WY) * front
  dz += SOCKET_IN * bell(ax - SOCKET_X, SOCKET_WX) * bell(y - SOCKET_Y, SOCKET_WY) * front
  dz -= LID_OUT * bell(ax - SOCKET_X, LID_WX) * bell(y - SOCKET_Y + 0.0011, LID_WY) * front

  const cheek = bell(ax - CHEEK_X, CHEEK_WX) * bell(y - CHEEK_Y, CHEEK_WY) * front
  dz -= CHEEK_OUT * cheek
  dx += Math.sign(x) * CHEEK_WIDEN * cheek
  dz += HOLLOW_IN * bell(ax - HOLLOW_X, HOLLOW_WX) * bell(y - HOLLOW_Y, HOLLOW_WY) * front

  // 0.62 of the authored half-width, not 0.78: at 0.78 the nose still
  // carried a fifth of its protrusion out at its own edge, so it melted
  // into the cheeks as a soft mound instead of standing off the face with
  // a side plane of its own.
  const protrusion = smoothTable(NOSE, y, 1)
  if (protrusion > 0) dz -= protrusion * bell(x, smoothTable(NOSE, y, 2) * 0.62) * front

  return [x + dx, y, z + dz]
}
