// character-shop/stilgar/src/model/geometry/browField.ts
// THE BONE ABOVE THE EYE — supraorbital shelf, glabella, the undercut that
// turns the shelf into a ledge, and (new in R2 pass 3) the sulcus and
// forehead-base mass that give the bar an EDGE ALONG ITS TOP.
//
// Pass 2 built the shadow BELOW the brow and it works: measured on the built
// mesh at |x| = 26 mm, N.L against the portrait key is exactly 0.000 at
// y-EY = 12, 15 and 18 mm — an 8 mm band of true black on the side the key
// is flooding. That stays untouched.
//
// What pass 2 did not build is the bone above, and the pass-2 render was
// judged "thin eyebrow strips plus a shadow" for two measured reasons:
//
// 1. THE BAR WAS A CONE. Forward projection along the crest ran 127.8, 124.3,
//    120.2, 114.6, 108.0, 98.8 mm at |x| = 0, 8, 16, 24, 32, 40 — a monotone
//    falloff from the midline. The glabella stood 33.8 mm proud against the
//    peaks' 23.9. That is not a transverse bar with brows on it, it is a
//    central boss continuous with the nose bridge, and it is half of why the
//    nose read hooked. The numbers below flatten it into a real bar: about
//    27 mm at the midline, 28 at |x| = 15, 25 at 30, 21 at 45, 15 at 58.
//
// 2. ABOVE THE CREST THE FOREHEAD IS ONE LIT PLANE. Measured N.L up the same
//    column: 0.902 at the crest, then 0.977, 0.908, 0.874, 0.900, 0.932,
//    0.926, 0.899 ... 0.938 all the way to the hood. No break anywhere.
//
// And the sign trap that made pass 2's fix fail, stated so pass 4 does not
// repeat it: RECEDING AS THE SURFACE RISES DOES NOT DARKEN IT. For z = f(y)
// the outward normal is (0, f', -1)/|.|, so N.L = (0.5 f' + 0.612)/sqrt(1+f'^2)
// under this rig's key. f' > 0 (receding upward) tilts the normal UP, and a
// 30-degree key lights an up-tilted surface BRIGHTER, not darker: f' = +1
// gives 0.79 against a flat plane's 0.61. Only f' < 0 — surface ADVANCING as
// it rises, i.e. the underside of an overhang — goes dark, and f' = -1.22 is
// exactly black. That is precisely what the sub-brow undercut already is.
//
// So the top edge of the bar needs a SECOND overhang: a sulcus, then a
// forehead-base mass whose underside faces down into it. SULC and SHELF
// below are that pair, sized to put an N.L trough of roughly 0.3 against
// 0.75 on either side, over a run long enough for the loft's 2.3 mm rings
// through this band to actually carry it.

import { bell, temporal } from './curves'
import { eyeLineLocal } from '../proportions'

const EY = eyeLineLocal

// The bar. Wider and flatter than pass 2's: the peak moves 3.6 mm outboard
// and the falloff nearly doubles in width, so the bone runs continuously
// from the glabella out past the temporal line instead of dying at 40 mm.
const BROW_Y = EY + 0.0212
const BROW_OUT = 0.0256
const BROW_PEAK_X = 0.0304
const BROW_WX = 0.0440
const BROW_WY = 0.0108

// The glabella is the weld between the two peaks, and pass 2 let it win. It
// is now BROADER and LOWER — a boss that merges into the bar rather than a
// spike that starts a ridge running down the nose. Dropping it 4.6 mm is
// also half of the nasion fix nose.ts documents: the midline dip between
// glabella and bridge was 12.8 mm, which is a scoop, and a scoop is what
// detaches a nose from a brow.
const GLAB_Y = EY + 0.0206
const GLAB_OUT = 0.0134
const GLAB_WX = 0.0185
const GLAB_WY = 0.0140

// THE UNDERCUT. Pass 2's ledge, kept. A narrow recession immediately under
// the crest: dz/dy runs +0.16 at the crest, then -1.04, -2.36, -3.30 and
// -3.07 walking down — an 8 mm band where N.L is exactly zero. The amplitude
// goes up 0.8 mm only because the bar above it is 1.35 mm heavier at this
// height (BROW_WY grew), so the same ledge needs the same bite through more
// bone. The centre rides BROW_PEAK_X and therefore moved out with it.
const SUPRA_Y = EY + 0.0126
const SUPRA_IN = 0.0082
const SUPRA_WX = 0.0380
const SUPRA_WY = 0.0050

// THE SULCUS — the groove along the top of the brow bar. Broad in X (it runs
// the whole width of the bar) and tight in Y, so the surface above it has
// something to overhang.
//
// Centred ON the midline rather than offset to 16 mm, and that is a crease
// fix, not a taste one. `bell(ax - X, W)` is a function of |x|, so for any
// non-zero X its slope JUMPS by 4X/W^2 * bell(X, W) across x = 0 — a slope
// discontinuity on a smooth-shaded surface, which is a visible line. It cost
// nothing while the hood covered the forehead; now that the aperture is open
// it draws a hairline straight down the middle of it. `bell(ax, W)` is even
// with zero slope at the midline and cannot.
const SULC_Y = EY + 0.0300
const SULC_IN = 0.0086
const SULC_WX = 0.0520
const SULC_WY = 0.0076

// THE FOREHEAD BASE — the mass whose underside is the dark edge. This is the
// "real volume above the brow line": the frontal bone bulging forward over
// the sulcus, so that walking up from the groove the surface ADVANCES and
// therefore darkens, then recedes again into the forehead proper.
const SHELF_Y = EY + 0.0428
const SHELF_OUT = 0.0126
const SHELF_WX = 0.0530
const SHELF_WY = 0.0110

// WHERE THE WIDE FORMS STOP. Three judges read the horizontal bands across
// forehead, temples and cheek as a deformation artifact. Scanned in the
// render they are not one: luminance down any clean column is smooth, with no
// periodic component at any pitch. What they measured is real all the same —
// the sulcus and the frontal shelf are both 70 mm-wide bells of |x|, so each
// ran unbroken from ear to ear at constant height and constant amplitude, and
// a stack of those IS corrugation whatever produced it. Both are narrower now
// and both die at the temporal line, so they read as frontalis creases with
// ends rather than as hoops round the skull.
const TEMPLE0 = 0.0420
const TEMPLE1 = 0.0660

// Frontal eminences: the two low domes a forehead carries above the ridge,
// pushed 7 mm higher than pass 2 so they sit clear of SHELF instead of
// filling the sulcus that has to stay open below them.
//
// Written as a PAIR OF BELLS summed rather than one bell of |x|, for the
// midline reason SULC documents above: bell(ax - X) + bell(ax + X) is the same
// two domes with the slope jump cancelled exactly, because the two terms'
// derivatives at x = 0 are equal and opposite. Narrower in X so the pair still
// reads as two domes rather than merging into one.
const EMIN_X = 0.0250
const EMIN_Y = EY + 0.0600
const EMIN_OUT = 0.0034
const EMIN_WX = 0.0170
const EMIN_WY = 0.0230

// The vertical furrow between the brows. Stern, and the second-strongest age
// cue on this face after the tear trough.
const FURROW_X = 0.0080
const FURROW_Y = EY + 0.0208
const FURROW_IN = 0.0026
const FURROW_WX = 0.0044
const FURROW_WY = 0.0128

/** The bar, its glabellar weld, the ledge under it, the sulcus along its top
 *  and the forehead base overhanging that. Negative Z is forward. */
export function browDz(ax: number, y: number, front: number): number {
  const temple = temporal(ax, TEMPLE0, TEMPLE1)
  let dz = -BROW_OUT * bell(ax - BROW_PEAK_X, BROW_WX) * bell(y - BROW_Y, BROW_WY) * front
  dz -= GLAB_OUT * bell(ax, GLAB_WX) * bell(y - GLAB_Y, GLAB_WY) * front
  dz -= SHELF_OUT * temple * bell(ax, SHELF_WX) * bell(y - SHELF_Y, SHELF_WY) * front
  dz -= EMIN_OUT * (bell(ax - EMIN_X, EMIN_WX) + bell(ax + EMIN_X, EMIN_WX))
    * bell(y - EMIN_Y, EMIN_WY) * front
  dz += SULC_IN * temple * bell(ax, SULC_WX) * bell(y - SULC_Y, SULC_WY) * front
  dz += SUPRA_IN * bell(ax - BROW_PEAK_X, SUPRA_WX) * bell(y - SUPRA_Y, SUPRA_WY) * front
  dz += FURROW_IN * bell(ax - FURROW_X, FURROW_WX) * bell(y - FURROW_Y, FURROW_WY) * front
  return dz
}

/** Where the bar crests, exported so brows.ts can place hair BELOW it rather
 *  than on top of it and the guards can measure the landmark the sculpt
 *  intends. */
export const BROW_CREST_Y = BROW_Y
