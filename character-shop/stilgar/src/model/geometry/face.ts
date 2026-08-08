// character-shop/stilgar/src/model/geometry/face.ts
// The face, sculpted INTO the head's own surface rather than stuck onto it.
//
// Pass 2 built the face from separate ellipsoids — a wide flat "brow" disc
// and a "nose" ball — and they read exactly as what they were: a mushroom
// cap on a stem. Every form is instead a displacement of the single lofted
// head surface (head.ts), summed as smooth kernels so that neighbouring
// forms BLEND into one continuous surface: the brow ridge grows out of the
// forehead, the sockets are hollowed under it, the cheekbones swell out of
// the sockets' lower edge, the nose grows out of the face plane between
// them, and the lips out of the plane below that. There is no seam to see
// because there is no second mesh.
//
// This file is now only the SUM. The forms themselves live in
// faceFields.ts (bone), nose.ts (the landmark) and mouth.ts (the lower
// third) — R2 tripled the amount of face and one file could not hold it
// inside the 200-line rule.

import { eyeLineLocal } from '../proportions'
import type { Pt } from './mesh'
import { cheekDz, socketFloorDz } from './faceFields'
import { lidDz, orbitOpen } from './orbit'
import { noseDz } from './nose'
import { mouthDz } from './mouth'

const EY = eyeLineLocal

/** The landmarks the tests measure against. Held here, next to the sum that
 *  produces them, so a guard can never quietly drift from the sculpt. */
export const FACE_LANDMARKS = {
  eyeLineY: EY,
  browRidgeY: EY + 0.0186,
  noseTipY: EY - 0.0232,
  subnasaleY: EY - 0.0410,
  stomionY: 0.0708,
} as const

/** Displace one point of the head's lofted surface into a face. `cosT` is
 *  the point's own cos(angle-from-front): squaring it gives a mask that is
 *  1 dead front and 0 at the ears, so nothing here can leak round the back
 *  of the skull. */
export function faceWarp(x: number, y: number, z: number, cosT: number): Pt {
  if (cosT <= 0) return [x, y, z]
  const front = cosT * cosT
  const ax = Math.abs(x)
  // Inside the palpebral opening the only forms allowed are the ones an eye
  // actually sits in: the socket floor and the brow above it. The nose and
  // the cheek are faded out through orbitOpen, because a form that reaches
  // ACROSS the opening is what buries an eye — pass 3's medial canthus
  // disappeared under 2.5 mm of nasal dorsum and the panel measured it.
  const open = orbitOpen(ax, y)
  const [dx, cheek] = cheekDz(x, ax, y, front)
  const dz = socketFloorDz(ax, y, front)
    + lidDz(ax, y, front)
    + cheek * open
    + noseDz(x, ax, y, front) * open
    + mouthDz(x, y, front)
  return [x + dx * open, y, z + dz]
}

/** The socket FLOOR at (x, y): brow and hollow, no lids. eyes.ts seats its
 *  masses on this — see head.ts's SkinFrame for why the finished surface is
 *  the wrong thing to sit an eye on. */
export function socketFloorAt(x: number, y: number, front: number): number {
  return socketFloorDz(Math.abs(x), y, front)
}
