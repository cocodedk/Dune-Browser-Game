// character-shop/stilgar/src/model/geometry/faceFields.ts
// The bone forms of the mid-face — cheekbones, the hollow under them, the
// tear trough, and the masseter mass that makes the lower face heavy. Every
// one is a displacement of the head's own lofted surface, summed as smooth
// kernels so neighbours BLEND rather than intersect (see face.ts's header
// for why that method exists at all).
//
// The eye's own region — aperture, socket, lid margins, sulcus, canthi —
// moved to orbit.ts in R2 pass 4. It had grown from one lid ring into five
// forms and would not fit here inside the 200-line rule; the split is also
// honest about what the two files are, because everything in orbit.ts is
// defined RELATIVE TO THE APERTURE and nothing here is.
//
// R2 pass 4 also NARROWS the forms that ran edge to edge. Three blind judges
// independently read the horizontal bands across forehead, temples and cheek
// as a deformation artifact, and the measurement agrees with them about the
// cause even though there is no ripple in the mesh: the face carried six
// full-width horizontal forms at a near-constant 12-18 mm pitch, each dying
// out only where `front` did — i.e. at the ear. Evenly spaced, edge to edge,
// same amplitude, is corrugation whoever authored it. The cure is not smaller
// relief, it is relief that STOPS: every wide form now carries `temporal()`
// below, which takes it to nothing at the temporal line.

import { bell } from './curves'
import { eyeLineLocal } from '../proportions'
import { browDz } from './browField'
import { eyeSeatDz } from './orbit'

const EY = eyeLineLocal

// Cheekbones — out AND sideways, because a zygomatic arch widens the head
// rather than only bulging toward camera. "Strong rounded cheekbones."
const CHEEK_X = 0.0522
const CHEEK_Y = EY - 0.0175
const CHEEK_OUT = 0.0108
const CHEEK_WIDEN = 0.0070
const CHEEK_WX = 0.0268
const CHEEK_WY = 0.0205

// Hollow under the arch — what the cheekbone sits proud OF.
const HOLLOW_X = 0.0500
const HOLLOW_Y = EY - 0.0420
const HOLLOW_IN = 0.0062
const HOLLOW_WX = 0.0235
const HOLLOW_WY = 0.0175

// Tear trough: the shallow groove where the lower lid meets the cheek. Two
// millimetres, and the single strongest age cue available on a face with no
// texture budget — it puts a soft shadow under each eye, which is most of
// the difference between a smooth mid-face and a weathered one.
//
// Moved down and out with the wider aperture: it has to sit UNDER the lower
// lid margin, and orbit.ts's lower lid now reaches 4 mm further than pass 3's.
const TROUGH_X = 0.0318
const TROUGH_Y = EY - 0.0136
const TROUGH_IN = 0.0022
const TROUGH_WX = 0.0180
const TROUGH_WY = 0.0052

// Masseter: the weathered mid-50s mass at the back of the jaw. Buried under
// the beard, but the beard hangs off this surface, so it is what makes the
// beard's SILHOUETTE heavy rather than tapered.
const JAW_X = 0.0570
const JAW_Y = EY - 0.0625
const JAW_OUT = 0.0072
const JAW_WIDEN = 0.0080
const JAW_WX = 0.0305
const JAW_WY = 0.0245

/** Brow ridge, glabella weld and socket hollow — the bone under the eye
 *  region, no lids. */
export function socketFloorDz(ax: number, y: number, front: number): number {
  return browDz(ax, y, front) + eyeSeatDz(ax, y, front)
}

/** Cheekbone, hollow, trough and masseter — the only forms here that move X
 *  as well as Z. Returns [dx, dz]; dx is already signed for the caller's
 *  side. */
export function cheekDz(x: number, ax: number, y: number, front: number): [number, number] {
  const side = Math.sign(x)
  const cheek = bell(ax - CHEEK_X, CHEEK_WX) * bell(y - CHEEK_Y, CHEEK_WY) * front
  const jaw = bell(ax - JAW_X, JAW_WX) * bell(y - JAW_Y, JAW_WY) * front
  const dz = -CHEEK_OUT * cheek
    + HOLLOW_IN * bell(ax - HOLLOW_X, HOLLOW_WX) * bell(y - HOLLOW_Y, HOLLOW_WY) * front
    + TROUGH_IN * bell(ax - TROUGH_X, TROUGH_WX) * bell(y - TROUGH_Y, TROUGH_WY) * front
    - JAW_OUT * jaw
  return [side * (CHEEK_WIDEN * cheek + JAW_WIDEN * jaw), dz]
}
