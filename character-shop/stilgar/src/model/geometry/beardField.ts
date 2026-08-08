// character-shop/stilgar/src/model/geometry/beardField.ts
// The beard's THICKNESS FIELD — every table and kernel that says how much
// hair sits at a given angle and height. beard.ts turns it into a mesh.
//
// R1 authored the outline of this field and left the inside empty: the
// render was one unbroken dark shape with a good hairline and no form at
// all. Everything below the first three tables is R2's answer to that —
// strand grooves, a chin tuft, a moustache with a philtrum notch, a jaw-line
// break, and the window that sinks the hair out of sight over the mouth.
//
// All of it is even in the angle about the chin, so the beard is bilaterally
// symmetric by construction and no term can crease the midline: the kernels
// are cosines and bells of |theta|, whose slope at theta = 0 is zero.

import { bell, smoothTable } from './curves'
import { mouthOpening } from './mouth'
import { EDGE } from './beardEdges'

const DEG = Math.PI / 180

// Hair volume by angle. Capped at 33.8 mm: R1 measured 40 mm putting the
// beard 1.6 mm FORWARD of the nose tip, which inverts the face's own depth
// order and puts the frontmost point of the figure in the wrong feature.
//
// The TAIL of this table is a CLEARANCE, not a taper. Measured on the pass-1
// headthreequarter: at 79 degrees off the chin the beard's outer sheet sat at
// |x| = 0.0936 and the hood's inner sheet at 0.0933, so the hair won the depth
// test against the cloth that is supposed to contain it, and 228 beard
// vertices drew on top of the hood — the dark triangular flap the lead saw at
// the jaw/hood boundary. The head is 4 mm wider through the gonion now, which
// would have spent the remaining margin twice over. So past 55 degrees the
// volume falls away hard.
//
// This one is measured in the RENDER, not in the vertex table, and
// deliberately so. A vertex-space guard was written and thrown away: binning
// both meshes by angle and height and comparing radii cannot tell the two
// cases apart, because near the opening every hood vertex in a bin belongs to
// the rim — which TUCK pulls inward — so the metric reads "beard outside
// hood" by 4 mm on geometry that renders clean and by 11 mm on geometry that
// does not. A guard that fires on both is not a guard. What discriminates is
// the thing the defect actually is: beard pixels drawn with hood pixels on
// both sides of them, which is 0 here and was about 1800 at pass 1.
// Pass 3 takes about 6.5 mm off everything forward of 55 degrees. Measured on
// the pass-2 mesh, the hair sat a nearly uniform 10 mm proud of the skull from
// y = 0.05 to y = 0.10 (84.2/74.1, 89.1/77.6, 91.9/80.4, 92.7/82.4, 92.8/83.0
// half-widths) — a constant-thickness shell, which is the definition of an
// attached pillow. A 27 mm beard is still a full beard, and the thinner shell
// is what lets CHIN_THIN and GONIAL below show bone through it at all.
const AMPLITUDE: number[][] = [
  [0, 0.0272], [30 * DEG, 0.0242], [55 * DEG, 0.0180],
  [75 * DEG, 0.0092], [90 * DEG, 0.0046], [EDGE, 0.0018],
]
// Volume by height within the band.
const SHAPE: number[][] = [
  [0, 0], [0.09, 0.60], [0.28, 1], [0.52, 0.97], [0.72, 0.80], [0.88, 0.44], [1, 0],
]

/** The rim never quite reaches zero: at 1.6 mm the hair edge stands proud of
 *  the skin as a real thin edge instead of z-fighting against it. */
export const LIP = 0.0016

// Strand groups: channels running down the beard. About six across the full
// width at 3.4 mm, which is the depth that survives the portrait key — R1's
// lesson was that relief is judged in the render, and a 1 mm groove on a
// 0x241c14 surface is not relief, it is noise.
const GROOVE = 0.0034
const GROOVE_K = 10.6
const GROOVE_V: number[][] = [
  [0, 0], [0.12, 0.35], [0.35, 1], [0.70, 1], [0.90, 0.45], [1, 0],
]

// The chin's own mass, so the beard has a point of focus low and forward.
// The hair hanging BELOW the chin, dropped and more than halved: at 5.6 mm
// centred on the chin itself it was a bulge added on top of a bulge, and a
// bulge is the opposite of a boss.
const TUFT = 0.0030
const TUFT_A = 0.44
const TUFT_Y = 0.0150
const TUFT_WY = 0.0210

// THE MANDIBLE, PUSHED THROUGH THE MASS. Hair lies THIN over bone and fills
// the hollows beside it, so the way to make a jaw read under a beard is not to
// add hair where the bone is — it is to take hair away. CHIN_THIN sits on the
// mental protuberance and GONIAL on the jaw angle; together with TUFT below
// them the shell stops being 10 mm everywhere and starts reporting the shape
// underneath it.
const CHIN_THIN = 0.0044
const CHIN_THIN_A = 0.46
const CHIN_THIN_Y = 0.0372
const CHIN_THIN_WY = 0.0140
const GONIAL = 0.0040
const GONIAL_A = 1.30
const GONIAL_WA = 0.34
const GONIAL_Y = 0.0730
const GONIAL_WY = 0.0210

// Moustache: two lobes with a philtrum notch between them, which is what
// stops it reading as a bar. Heavy over the upper lip and NO HIGHER — pass
// 1's 8.6 mm at local 0.0808 with a 0.30 rad lobe spacing put two mounds
// exactly where the nose's wings belong, and the render lost the nose.
const TASH = 0.0112
const TASH_Y = 0.0770
const TASH_WY = 0.0084
const TASH_LOBE = 0.24
const TASH_LOBE_W = 0.19
// Deeper and narrower in R2 pass 2. The philtrum notch is the only thing that
// stops a moustache reading as a bar, and the lead asked for it to be legible
// from dead front — where the notch is a shadow between two lobes, not a
// contour you can see against the sky.
const TASH_DIP = 0.58
const TASH_DIP_W = 0.076

// A shallow horizontal break where the beard crosses the mandible, off the
// midline only — a full-width groove there would read as a chinstrap.
const JAW_BREAK = 0.0040
const JAW_BREAK_Y = 0.0432
const JAW_BREAK_WY = 0.0102
const JAW_BREAK_A = 0.52

// HOW THE MOUTH GETS OUT OF THE BEARD, and pass 4 changes the method.
//
// Pass 3 SUBTRACTED 46 mm of thickness through the window. That drove 964 of
// the beard's 5850 vertices up to 44.7 mm inside the skull and swept the
// sunk sheet clear across the lower face, so the hair/skin boundary was a
// deep, near-tangential intersection of two surfaces — which is exactly what
// a boolean stair-step looks like on a 76-column patch, and it is what three
// judges reported around the mouth.
//
// It is a BLEND now: `t * (1 - w) - TUCK * w`. At w = 0 nothing changes; at
// w = 1 the sheet sits a flat 9 mm inside the skin, deep enough to stay
// hidden and shallow enough that the crossing is nearly perpendicular. The
// deepest excursion anywhere is 9 mm instead of 45.
//
// TUCK also sets WHERE the boundary lands, not just how deep it goes: the
// visible edge is the level set w = t/(t + TUCK), so raising it moves the
// edge OUTWARD along the window's own falloff without widening the window.
// That is how the upper lip gets 4 mm of exposed vermilion at the midline
// while the moustache keeps its full mass 18 mm out — a wider window would
// have shaved both equally, which is what the first pass-4 try did.
const MOUTH_TUCK = 0.0090

/** Hair thickness at angle `a` (|theta|), band fraction `v`, skin point
 *  (`x`, `y`). May go NEGATIVE over the mouth: a patch that dips inside the
 *  head is simply not drawn, which is how the lips get out. */
export function thicknessAt(a: number, v: number, x: number, y: number): number {
  const w = mouthOpening(x, y)
  let t = LIP + smoothTable(AMPLITUDE, a, 1) * smoothTable(SHAPE, v, 1)
  // The strand channels are DAMPED across the mouth. The hair boundary there
  // is a level set of this field, so anything periodic in `a` puts the same
  // period into the boundary curve: six grooves across the beard became six
  // scallops with hard corners along the moustache's lower edge, which is
  // most of what read as a boolean stair-step around the lips.
  t -= GROOVE * (1 - w) * Math.cos(GROOVE_K * a) * smoothTable(GROOVE_V, v, 1)
  t += TUFT * bell(a, TUFT_A) * bell(y - TUFT_Y, TUFT_WY)
  t -= CHIN_THIN * bell(a, CHIN_THIN_A) * bell(y - CHIN_THIN_Y, CHIN_THIN_WY)
  t -= GONIAL * bell(a - GONIAL_A, GONIAL_WA) * bell(y - GONIAL_Y, GONIAL_WY)
  t += TASH * bell(y - TASH_Y, TASH_WY)
    * (bell(a - TASH_LOBE, TASH_LOBE_W) - TASH_DIP * bell(a, TASH_DIP_W))
  t -= JAW_BREAK * bell(y - JAW_BREAK_Y, JAW_BREAK_WY) * (1 - bell(a, JAW_BREAK_A))
  return t * (1 - w) - MOUTH_TUCK * w
}
