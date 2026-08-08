// character-shop/stilgar/src/model/geometry/orbit.ts
// THE EYE'S OWN REGION: the palpebral aperture, the socket hollow that
// carries it, the two lid margins that wrap it, the sulcus above and the two
// canthi at its ends. Split out of faceFields.ts in R2 pass 4, which is when
// the eye stopped being one hole in a lid ring and became five forms.
//
// The pass-3 eye failed a blind panel on two measured counts and both are
// answered here.
//
// 1. SPACING. The visible aperture rendered 118 px wide with 198 px between
//    the two, i.e. an inner gap of 1.68 aperture-widths against a canon of
//    about 1.0, and the face measured 6.7 apertures across against a canon of
//    5. The APERTURE WAS TOO SMALL, not the eyes too far apart: at 25.6 mm the
//    opening was a third narrower than a real palpebral fissure on a 169 mm
//    face. Widening it to 33 mm and moving the centre out 1.2 mm puts the gap
//    at 1.01 widths and the face at 5.1, and moves the MEDIAL CANTHUS 2.8 mm
//    inboard while the lateral one goes 5.2 mm out — the eye grows toward the
//    nose, which is what "bring them medial" means on a face this broad.
//
// 2. THE EYE SAT ON THE CHEEK. Measured on the pass-3 mesh, the lens stood
//    9.35 mm PROUD of the skin at its centre and was still 0.4-5.3 mm proud
//    all the way round its rim, so it had a hard convex silhouette and no lid
//    could ever cross it; on the nasal side the skin caught up and buried the
//    medial tip instead. Both are the same bug: the lens was seated on the
//    BARE loft plus the socket hollow while the skin around it was the
//    finished sculpt, so lens and skin were two surfaces that met wherever
//    they happened to. eyes.ts now seats the lens ON the finished skin with a
//    signed offset, so "in front" and "behind" are authored rather than
//    emergent, and this file's job is only to make the lid mass that covers
//    the offset's negative half.

import { bell, smoothstep } from './curves'
import { eyeLineLocal } from '../proportions'

const EY = eyeLineLocal

// --- The aperture: one definition, shared with eyes.ts ------------------
export const EYE_X = 0.0334
export const EYE_Y = EY
export const APERTURE_HALF_LEN = 0.0165
export const APERTURE_HALF_HEIGHT = 0.0062
/** Tilt of the fissure's long axis: positive drops the OUTER corner, which
 *  is the difference between stern and startled. */
export const APERTURE_TILT = 0.15

/** Signed height above the fissure's own tilted axis. */
export function apertureRise(ax: number, y: number): number {
  return y - EYE_Y + APERTURE_TILT * (ax - EYE_X)
}

/** Elliptical radius in aperture space: < 1 inside the eye opening. */
export function apertureS(ax: number, y: number): number {
  return Math.hypot((ax - EYE_X) / APERTURE_HALF_LEN, apertureRise(ax, y) / APERTURE_HALF_HEIGHT)
}

/** 0 inside the palpebral opening, 1 clear of it. face.ts fades the nose and
 *  cheek out through this, so the surface the eye sits on is the ORBIT and
 *  nothing else. Pass 3's medial canthus sat under 2.5 mm of nasal dorsum
 *  and the lens tip disappeared into the bridge; a form that reaches across
 *  the opening is the thing that buries an eye, whatever the eye does. */
export function orbitOpen(ax: number, y: number): number {
  return smoothstep(0.86, 1.10, apertureS(ax, y))
}

// The socket, hollowed back under the ridge. Sized against the brow rather
// than on its own: crest-to-cornea is the guard, and it runs 20-30 mm here.
// Both widths grew with the aperture — a hollow narrower than the opening it
// carries pinches the eye at its corners.
const SOCKET_IN = 0.0170
const SOCKET_WX = 0.0262
const SOCKET_WY = 0.0148

// THE MEDIAL GATE. A Gaussian centred on EYE_X with a 26 mm width is still
// worth a sixth of its peak AT THE MIDLINE, so without this the socket hollow
// carves the sides of the nose bridge away from inside the orbit. It is fully
// open by the aperture's own medial end, so no part of the opening moves.
const MEDIAL_EDGE0 = 0.0050
const MEDIAL_EDGE1 = 0.0170

// THE LID MARGINS. A lid is not a ring around a hole, it is a MASS whose
// inner edge overhangs the eye: the surface between the aperture rim and the
// lid's crest ADVANCES as it rises, and browField.ts's sign analysis says
// that is the only thing in this rig that goes dark. At 6.6 mm of rise over
// 2.6 mm of run the margin carries dz/dy = -2.5, which is N.L = -0.24 —
// black — and it is 2.6 mm tall, so the loft has to sample it (see head.ts's
// row count, raised in this pass for exactly this form).
const LID_OUT = 0.0074
const LID_PEAK = 1.62
const LID_W = 0.55
const LID_RAMP = 0.55
/** The lower lid is a lower, flatter ridge than the upper — but it is not
 *  half of one, which is what pass 3's 0.50 made it. */
const LOWER_LID_RATIO = 0.62

// The palpebral sulcus: the crease between the mobile lid and the orbital
// skin under the brow. Pass 3 had bare skin from the lid straight up to the
// brow hair, which is most of why the hair read as a slab painted on a
// forehead rather than as eyebrow growing over an orbit.
const SULCUS_IN = 0.0032
const SULCUS_S = 2.30
const SULCUS_W = 0.62

// The canthi. Both lids run into a corner rather than stopping: the medial
// one is a hollow (the caruncle sits in it), the lateral one a shallower
// crease running out toward the temple. Gated to the rim so neither dishes
// the middle of the lens.
const CANTHUS_IN = 0.0030
const CANTHUS_W = 0.0062
const CANTHUS_RISE = 0.0052

/** The SOCKET HOLLOW alone — the seat, with no brow and no lids.
 *
 *  Deliberately excludes the brow. An eyeball does not follow the ridge that
 *  overhangs it: seat an eye on a surface that includes the brow and the
 *  eye's upper edge is dragged forward with the ridge until the lens is
 *  concave and shades inside-out. */
export function eyeSeatDz(ax: number, y: number, front: number): number {
  return SOCKET_IN * smoothstep(MEDIAL_EDGE0, MEDIAL_EDGE1, ax)
    * bell(ax - EYE_X, SOCKET_WX) * bell(y - EYE_Y, SOCKET_WY) * front
}

/** Lid margins, sulcus and canthi. Zero inside the aperture BY
 *  CONSTRUCTION, and zero-sloped at its rim, so the opening is a genuine
 *  hole in the lid mass and the lens fills exactly it. */
export function lidDz(ax: number, y: number, front: number): number {
  const s = apertureS(ax, y)
  const rise = apertureRise(ax, y)
  // Smooth in both arguments: a linear ramp off the aperture edge, or a hard
  // upper/lower switch across the fissure axis, each draw a crease.
  const up = smoothstep(-0.006, 0.006, rise)
  const ramp = smoothstep(1, 1 + LID_RAMP, s)
  const mass = LOWER_LID_RATIO + (1 - LOWER_LID_RATIO) * up
  let dz = -LID_OUT * mass * ramp * bell(s - LID_PEAK, LID_W) * front
  dz += SULCUS_IN * up * smoothstep(1, 1.7, s) * bell(s - SULCUS_S, SULCUS_W) * front
  const corner = bell(ax - (EYE_X - APERTURE_HALF_LEN), CANTHUS_W)
    + 0.75 * bell(ax - (EYE_X + APERTURE_HALF_LEN), CANTHUS_W)
  dz += CANTHUS_IN * corner * bell(rise, CANTHUS_RISE) * smoothstep(0.78, 1.02, s) * front
  return dz
}
