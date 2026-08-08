// character-shop/chani/src/model/face/station.ts
// The head's control profile: ONE table, swept into ONE closed surface.
// Neck, jaw, chin, cheeks, temples, forehead and cranium are all rows of
// it; the face (warp.ts, mouth.ts) is a displacement OF that surface. R1
// built the head as a loft plus a nose blob plus two ear blobs and the
// critic read a blank egg — every primitive-assembly pass in this shop's
// history regressed, so nothing here is an assembly.
//
// Columns: [y, half-width X, half-depth FRONT, half-depth BACK, centre Z].
// Front and back depths are independent because a head is not an ellipsoid
// — the face plane sits close to the ear axis while the occiput swings well
// behind it — and they are BLENDED per angle, not switched, so the sides
// stay smooth.
//
// Every section is a TRUE ELLIPSE. The first cut carried a sixth column, a
// shape exponent |sin|^p that pulled the section toward its front centre
// line so one ring could hold a 36mm chin over a 103mm throat. It works on
// paper and it cusps in the mesh: for p > 1 the x-derivative vanishes at
// theta = 0, so the front centre line becomes a CREASE. The capture came
// back with a seam down the middle of the chin and a chin shaped like a
// wedge. jaw.ts's frontNarrow does the same job multiplicatively, which
// is smooth everywhere.
//
// Row SPACING is mesh density: the sweep parameterises on row INDEX, so
// rows crowded through the mouth and the eye band buy triangles exactly
// where 7mm lips and a 6mm lid fold live. At 17 rows over 277mm the lips
// measured correctly and rendered as nothing at all.
//
// The neck is IN this table (rows below Y = 0). It used to be a separate
// loft in torso.ts, and a separate loft cannot taper into a jaw. The rows
// below -0.021 sit inside the collar, which is unchanged R1 costume.

import { catmull, lookupByKey, resample } from './curves'
import { EYE_Y, GONION_Y, SCALP_Y, ZYGION_Y } from './plan'

// PASS 2 REBUILT THE LOWER HALF OF THIS TABLE. Pass 1's rx column ran
// 90.6mm at the neck, 94.3 at the menton, 96.4 at the chin body, 93.8 at
// the mouth and 99.6 at the jaw angle — measured off the finished
// vertices, not read off here. That is a 90-100mm COLUMN standing for
// 120mm of height, and it is why the critic wrote "the lower face is a
// long wide flat-edged plane; the chin is as wide as the jaw with no
// apex". No warp can rescue it: jaw.ts's frontNarrow scales x by
// (1 - k cos^2), whose maximum over the ring is at theta = 90 degrees
// where the factor is exactly 1 — so the pinch reshapes the chin's FRONT
// and cannot move the head's own outline by a millimetre. The outline is
// this column, and this column is the only place it can be fixed.
//
// The rebuilt ladder is a heart: MEASURED 146mm at the cheekbone, 105 at
// the jaw angle, 77 at the chin — and then FLARING BACK OUT to 96mm at
// the neck below it. That flare is the point. In a front portrait the
// narrowest place between the cheekbone and the collar is the chin, with
// the neck visible wider behind it; pass 1 had the chin 6mm WIDER than
// the neck, which is a jaw, and a man's.
//
// 77mm, not the 63 the first cut of this table tried. The capture threw
// that one out: at 63 the ring is 31.8mm of half-width, which is narrower
// than the mandible border jaw.ts has to draw ON it, so the crease ran
// down the front of the chin and the render came back a narrow muzzle.
// The chin has to be narrow RELATIVE to the cheekbone — 0.527 of it here,
// against pass 1's 0.676 — while still being wide enough to carry a jaw.
export const HEAD_KEY: readonly number[][] = [
  // y,        rx,      rzF,     rzB,     zc
  [-0.0560, 0.0650, 0.0500, 0.0740, 0.0250], // neck root, buried in collar + trapezius
  [-0.0380, 0.0572, 0.0470, 0.0692, 0.0268],
  [-0.0240, 0.0515, 0.0462, 0.0652, 0.0268], // last row the collar still covers
  // The three VISIBLE neck rows came in 4mm this pass. 96mm of neck under
  // a 146mm bizygomatic is 0.66 of the face's own width, which is a
  // soldier's neck; the rows below this sit inside the R1 collar and are
  // untouched, so the join is unchanged. The flare is kept — the neck is
  // still wider than the 77mm chin in front of it, which is what stops the
  // chin reading as a jaw.
  [-0.0160, 0.0458, 0.0472, 0.0630, 0.0262], // the neck proper, 92mm
  [-0.0090, 0.0436, 0.0502, 0.0616, 0.0248],
  [-0.0030, 0.0412, 0.0604, 0.0602, 0.0210], // submental — the tuck under the jaw
  // PASS 3 RE-CUT THE OUTLINE FROM THE CHEEKBONE DOWN, for the one finding
  // every judge gave in the same words: V-cone chin, blocky jaw. Pass 2's
  // ladder ran 71.4mm of half-width at the cheekbone to 51.8 at the jaw
  // angle to 38.0 at the chin — slope -0.50mm per mm above the gonion and
  // -0.24 below it. Two nearly straight runs meeting at a shallow bend is a
  // CONE, and a cone read as a wedge of bone whatever the shading did.
  //
  // A heart is three runs, not two. The outline now falls -0.39 from the
  // cheekbone to the gonion, TURNS to -0.74 through the mouth band, then
  // flattens to -0.12 down the chin's own sides before rounding over. The
  // sharpest bend is at the gonion, which is where a jaw angle is, and the
  // chin's sides end up nearly vertical — so the apex is an ARC and not a
  // point. Bigonial goes 0.72 -> 0.75 of bizygomatic and the chin 0.527 ->
  // ~0.55: both still a clear taper, neither still a wedge. 0.527 was not
  // "correct and misjudged" — it was a chin narrower than the arc of a jaw
  // can round onto, which is what made it a cone.
  [0.0025, 0.0402, 0.0706, 0.0596, 0.0156], // menton
  [0.0085, 0.0387, 0.0778, 0.0606, 0.0120], // CHIN — narrowest ring on the head
  [0.0155, 0.0391, 0.0814, 0.0624, 0.0096],
  [0.0235, 0.0400, 0.0824, 0.0654, 0.0078], // chin body — pogonion
  [0.0320, 0.0410, 0.0810, 0.0692, 0.0062], // mentolabial sulcus
  [0.0395, 0.0426, 0.0801, 0.0722, 0.0053],
  // FIVE rows over the mouth, where pass 1 had two. Row spacing is mesh
  // density — the sweep parameterises on row INDEX — and pass 1's spacing
  // at the upper lip measured 2.06mm against a 1.9mm cupid's bow. A form
  // finer than the sampling is averaged into its neighbours by
  // computeVertexNormals and renders as nothing; that is the same root
  // cause stilgar's loop found, and it is why pass 1's bow vanished.
  //
  // ALL FIVE ROSE 6mm WITH plan.ts STOMION_Y. They are not decoration
  // around the mouth, they ARE the mouth's sampling budget, and leaving
  // them behind would have raised the lips off their own rows and undone
  // pass 2's whole finding. Spacing through the vermillions: ~0.78mm.
  [0.0440, 0.0438, 0.0799, 0.0738, 0.0049],
  [0.0480, 0.0452, 0.0800, 0.0752, 0.0045], // lower lip
  [0.0525, 0.0470, 0.0805, 0.0770, 0.0041], // stomion — the lip seam
  [0.0570, 0.0490, 0.0796, 0.0785, 0.0038], // upper lip
  [0.0615, 0.0518, 0.0799, 0.0799, 0.0035],
  [GONION_Y, 0.0548, 0.0794, 0.0814, 0.0032], // jaw angle — bigonial, 0.75 of bizygomatic
  [0.0740, 0.0580, 0.0788, 0.0850, 0.0026],
  [0.0785, 0.0612, 0.0784, 0.0870, 0.0023], // nose-tip band, for the same density reason
  [0.0830, 0.0642, 0.0778, 0.0892, 0.0020], // lower cheek, nose base level
  [0.0930, 0.0682, 0.0760, 0.0934, 0.0014],
  [ZYGION_Y, 0.0714, 0.0740, 0.0968, 0.0010], // cheekbone — the bizygomatic ring, widest
  [EYE_Y, 0.0698, 0.0722, 0.0982, 0.0010], // eye line
  [0.1265, 0.0674, 0.0714, 0.1002, 0.0013], // brow band
  [0.1360, 0.0658, 0.0718, 0.1018, 0.0016], // temple, pinched in
  // Forehead front lines raised 4-6mm over the first cut: the profile
  // measured a 16.8mm recession from brow to hairline over 48mm of height,
  // which is a male slope. A young woman's forehead is nearly upright.
  [0.1570, 0.0680, 0.0734, 0.1052, 0.0026], // parietal
  [0.1790, 0.0668, 0.0702, 0.1046, 0.0036], // upper forehead
  [0.1990, 0.0578, 0.0602, 0.0966, 0.0048],
  [0.2140, 0.0424, 0.0432, 0.0786, 0.0060],
  [SCALP_Y, 0.0000, 0.0000, 0.0000, 0.0080], // scalp apex
]

/** A dense re-sample keyed on Y so anything that needs to sit ON the skin
 *  — brows, the hair shell's front line, the ears — can ask for the exact
 *  profile the mesher sweeps, not an approximation of it. */
const DENSE = resample(HEAD_KEY, 421)

/** The control row at an arbitrary head-local height. */
export function stationAt(y: number): number[] {
  return lookupByKey(DENSE, y)
}

/** The control row at mesh parameter v (0 = neck root, 1 = scalp apex). */
export function stationRow(v: number): number[] {
  return catmull(HEAD_KEY, v)
}
