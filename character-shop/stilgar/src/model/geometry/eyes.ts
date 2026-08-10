// character-shop/stilgar/src/model/geometry/eyes.ts
// The eye masses — full ibad, so the whole visible eye is one flat
// PALETTE.eyes and there is no white anywhere on this figure.
//
// THE LENS IS AN OFFSET OF THE SKIN, and that is the pass-4 change.
//
// Passes 1-3 built the lens on its own datum — the bare loft plus the socket
// hollow — while the skin around it was the finished sculpt. Two surfaces
// with two datums meet wherever they happen to, and the measurement said
// exactly that: the lens stood 9.35 mm PROUD at its centre, was still 0.4 to
// 5.3 mm proud all the way round its rim (so no lid could ever cross in
// front of it, and it read as a bead sitting on a cheek), and on the nasal
// side the dorsum caught up and swallowed the medial tip. A blind panel
// reported all three as separate defects. They were one.
//
// So the lens is now `skin(x, y) - offset(s)`, where s is the point's own
// aperture radius. `offset` is POSITIVE (forward of the skin) inside the
// opening and NEGATIVE (behind it) outside, so:
//
//   - the visible blue is exactly the contour offset(s) = 0. Not a silhouette
//     the lens happens to have, an authored curve.
//   - past that contour the lens plunges 13 mm behind the skin, so the lid
//     margins orbit.ts builds necessarily occlude it — the "lens in front of
//     the lid slab" depth inversion the 3/4 showed cannot occur, at any
//     camera, because the lens is behind the lid IN THE GEOMETRY.
//   - the eye follows the socket it sits in instead of cutting across it.
//
// The offset crosses zero at s = 1.012, so the visible aperture is 33.4 mm on
// a 33.0 mm authored opening, and it crosses STEEPLY: 43 mm of separation per
// unit s, which is 0.7 mm per pixel at the head framing. There is no band of
// near-coplanar surface to stipple.
//
// The left eye is the right eye MIRRORED THROUGH X WITH ITS U REVERSED.
// Mirroring alone flips a surface's handedness and would render the eye as
// an interior wall under FrontSide culling; reversing u flips it back, and
// the pair comes out bit-exactly symmetric, which is what the symmetry guard
// in face.test.ts measures.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { revolveGeo, type Pt, type Surface } from './mesh'
import { skinFrame } from './head'
import { smoothstep } from './curves'
import {
  APERTURE_HALF_HEIGHT, APERTURE_HALF_LEN, APERTURE_TILT, EYE_X, EYE_Y,
} from './orbit'
import { attach } from './primitives'

/** Corneal rise at the centre, measured from the skin the eye sits in. A
 *  full-ibad eye is one flat colour with no iris, no highlight and no white,
 *  so its FORM is the only thing carrying it — but the form wanted here is a
 *  cornea filling an opening, not a berry in a hole. */
const DOME = 0.0058
/** How far the rim tucks back behind the lids. Generous on purpose: the rim
 *  is a mesh boundary and the one thing that must never be visible. */
const PLUNGE = 0.0130
/** Where the dome dies. Just past the aperture, so the lens still stands
 *  proud AT the rim and the zero crossing is on the plunge's steep flank. */
const S_DOME = 1.02
/** The mesh rim, deep under the lid mass. */
const S_RIM = 1.28
/** Fullness of the lens: below 1 it fills more of the aperture before
 *  falling away, so the eye reads as a rounded eyeball rather than a cone. */
const CAP_POWER = 0.55

/** How far each lid RESTS ON the eye, as a fraction of the aperture's own
 *  half-height. An eye whose blue fills its opening edge to edge is a lozenge
 *  painted on a face: on a real one the upper lid covers the top of the
 *  cornea and the lower lid takes a little off the bottom, so the visible
 *  shape is flatter on top than the opening it sits in. Applied by scaling
 *  the radius the offset is evaluated at, and faded out with |sin(phi)| so
 *  it takes nothing off the WIDTH — the inner-gap ratio the panel measured
 *  has to survive this. */
const UPPER_BITE = 0.16
const LOWER_BITE = 0.05

const U_SEGS = 44
const V_SEGS = 14

/** Signed standoff from the skin at aperture radius `s`. Positive is toward
 *  camera (visible); negative is behind the skin (occluded). */
function offsetAt(s: number): number {
  const r = s / S_DOME
  const dome = r >= 1 ? 0 : Math.pow(1 - r * r, CAP_POWER)
  return DOME * dome - PLUNGE * smoothstep(1, S_RIM, s)
}

/** One eye on the figure's RIGHT (+X). u sweeps the aperture's rim angle, v
 *  runs rim (0) to centre (1) — so revolveGeo's apexTop lands on the pupil
 *  and capBottom closes the back flat, inside the head where nobody sees it. */
function rightEye(u: number, v: number): Pt {
  const phi = u * Math.PI * 2
  const s = S_RIM * (1 - v)
  const sin = Math.sin(phi)
  const ex = APERTURE_HALF_LEN * s * Math.cos(phi)
  const rise = APERTURE_HALF_HEIGHT * s * sin
  const ax = EYE_X + ex
  // Invert orbit.apertureRise: rise = (y - EYE_Y) + TILT * ex.
  const y = EYE_Y + rise - APERTURE_TILT * ex
  const bite = UPPER_BITE * Math.max(0, sin) + LOWER_BITE * Math.max(0, -sin)
  return [ax, y, skinFrame(ax, y).p[2] - offsetAt(s * (1 + bite))]
}

/** Mirror a surface through X and reverse its u, which preserves winding. */
function mirrored(surface: Surface): Surface {
  return (u, v) => {
    const p = surface(1 - u, v)
    return [-p[0], p[1], p[2]]
  }
}

function eyeGeo(surface: Surface): BufferGeometry {
  return revolveGeo(surface, { uSegs: U_SEGS, vSegs: V_SEGS, apexTop: true, capBottom: true })
}

export function buildEyes(disposables: BufferGeometry[], head: Group, eyes: MeshStandardMaterial): void {
  attach(disposables, head, eyeGeo(rightEye), eyes, 0, 0, 0, 'eyeR')
  attach(disposables, head, eyeGeo(mirrored(rightEye)), eyes, 0, 0, 0, 'eyeL')
}

/** The aperture centre in head-local coordinates, for the placement and
 *  symmetry guards. Sign is the figure's own right. */
export const EYE_CENTRE: Pt = [EYE_X, EYE_Y, 0]
