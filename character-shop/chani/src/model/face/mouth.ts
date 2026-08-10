// character-shop/chani/src/model/face/mouth.ts
// The lower centre-line forms — lips, philtrum, mentolabial sulcus, chin —
// as fields on the same surface warp.ts displaces. The nose moved to
// nose.ts in pass 2; everything here is still summed into the identical
// surface point before a single triangle exists.
//
// Destination: FULL lips with a defined cupid's bow and a moderate mouth
// width; a narrow, slightly pointed chin. Soft forms against the angular
// cheekbones warp.ts builds — that contrast IS the read.
//
// PASS 1 AUTHORED A 1.9mm CUPID'S BOW AND IT RENDERED AS NOTHING. The
// vertex table was right and the picture was empty, and the cause is not
// in this file: the mesh row spacing at the upper lip measured 2.06mm, so
// the bow's two peaks and its notch fell between rows and were averaged
// into a straight line by computeVertexNormals before anything was drawn.
// Stilgar's loop diagnosed the same failure independently. The fix is in
// station.ts (four rows through the mouth instead of two) and head.ts (174
// mesh rows instead of 128), which together put a row every ~0.75mm here.
// What this file owes that fix is FORM COARSE ENOUGH TO SURVIVE IT: every
// relief below is quoted against that 0.75mm, and the bow is now 4.8mm
// peak-to-notch rather than 1.9 — six rows across it instead of one.

import { bell } from './curves'
import { MENTON_Y, STOMION_Y, SUBNASALE_Y } from './plan'

import type { Delta } from './warp'

// Lips. 16.8mm and 18.2mm of vermillion against a 9.8mm crease between
// them is a ~27mm step — the relief budget the brow needed to read, and
// the mouth needs more of it because it is the only feature with a seam.
//
// LIP_HALF is a Gaussian SIGMA, not the mouth's half-width, and it has
// cost two measurements now. profile.test.ts measures the vermillion's
// projection against the philtrum plane above it and reads the zero
// crossing: 28.3mm here, so a 57mm mouth on a 146mm face — 'moderate', as
// the brief asks. No bounding box can find a mouth carved into a skull,
// because the widest vertex at lip height is the jaw.
//
// PASS 3 ADDED 2mm TO EACH VERMILLION on an explicit lead ruling, and the
// ruling is what makes it possible: the upper lip may now REACH the E-line
// rather than sitting strictly behind it, because Zendaya's lips sit
// forward of the classical balance. profile.test.ts's E-line band was
// re-banded from (0, +5mm) behind to (-1.5, +5mm), declared. Without that
// the guard and the brief were in direct conflict — every millimetre of
// vermillion pushes the lip toward the line, and pass 2 had already spent
// the margin down to 0.68mm.
// 28.2mm of sigma. Widening the mouth costs NOTHING on the profile
// guards — LIP_HALF spreads the vermillion sideways and never moves the
// centre line, so the E-line and the nose clearance are untouched by it —
// and the mouth was the one feature still reading undersized against a
// 146mm face in the capture.
const LIP_HALF = 0.0282
const UPPER_Y = STOMION_Y + 0.0052
const UPPER_OUT = 0.0180
const UPPER_WY = 0.0064
// LOWER_Y tracks STOMION_Y, which rose 6.5mm this pass (plan.ts). The
// sampling windows in head.test.ts, profile.test.ts and headReport.ts moved
// with it — they are windows onto the mouth, not independent constants, and
// leaving them at pass 2's heights would have had them measuring chin.
const LOWER_Y = STOMION_Y - 0.0068
const LOWER_OUT = 0.0212
const LOWER_WY = 0.0088
// 11.8mm, not 9.8. THE STEP IS THE READ, not the projection. The brief
// asks for fuller vermillion on both lips and the E-line asks the upper
// one not to run away from the nose, and those two only fit together if
// the extra fullness is bought by cutting the SEAM deeper rather than by
// pushing the lips further out. At portrait framing what says "lips" is
// the shadow line between two lit vermillions; pass 3's first cut added
// 2mm to each lip, measured the seam-to-lip step at 6.03mm against pass
// 2's 8.2, and looked FLATTER for the extra mass.
const SEAM_OUT = 0.0118
const SEAM_WY = 0.0025

/** Cupid's bow: the upper vermillion's own centre line rises 3.0mm at
 *  x = +/-8.6mm and drops 1.8mm at the centre line. Two peaks and a notch
 *  is the whole shape — authored, because a symmetric bulge is what an
 *  un-authored lip becomes. 4.8mm peak-to-notch, against 0.75mm rows. */
function upperLipY(ax: number): number {
  return UPPER_Y + 0.0030 * bell(ax - 0.0086, 0.0056) - 0.0018 * bell(ax, 0.0040)
}

// The white roll — the raised rim along the top edge of the upper
// vermillion, riding the bow's own curve 5.8mm above it. PASS 2 ADDED IT.
// It is small and it is the single form that most makes a mouth read as
// lips rather than as a horizontal crease, because it puts a lit edge
// directly above the vermillion's shadowed one. 2.6mm over 0.75mm rows.
const ROLL_OUT = 0.0026
const ROLL_UP = 0.0058
const ROLL_WY = 0.0026

// Mouth corners. Two small recesses that TERMINATE the lips: without them
// both vermillions fade out into the cheek as Gaussians do, and a mouth
// with no ends is a smear. Placed at 26.8mm, which sets the visible mouth
// at ~54mm on a 143mm face — 'moderate', as the brief asks.
const CORNER_IN = 0.0034
const CORNER_X = 0.0285
const CORNER_WX = 0.0072
const CORNER_WY = 0.0062

// Philtrum: the groove from the columella base down to the bow's notch,
// and the two COLUMNS flanking it. Pass 1 had the groove alone, which on
// its own is just a dent; the columns are what give it edges.
//
// 2.6mm, not 4.6. A 4.6mm groove down a 17mm philtrum is a channel, and at
// bust framing it read as a hard vertical line joining the nose to the
// mouth — one more crease on the face the judges were counting. The columns
// came down with it so the ratio between groove and edge is unchanged.
const PHILTRUM_IN = 0.0026
const PHILTRUM_WX = 0.0040
const PHILTRUM_Y = SUBNASALE_Y - 0.0082
const PHILTRUM_WY = 0.0070
const COLUMN_OUT = 0.0016
const COLUMN_X = 0.0058
const COLUMN_WX = 0.0034

// Mentolabial sulcus: the shadow that separates the lower lip from the
// chin pad, and the form that lets the chin below it read as its own mass.
//
// IT DID NOT FOLLOW THE MOUTH UP, and that is the whole of "shorten the
// chin span". The menton cannot move — head-local Y = 0 is the head group's
// origin and the eye-line guard has 1.1mm of budget left — so the only way
// to shorten the chin when the mouth rises 6.5mm is to leave the sulcus
// near its old absolute height. Pass 2: seam 46.0, sulcus 30.2, a 30mm chin
// under a low mouth. Pass 3: seam 52.5, sulcus 33.0, a 33mm chin under a
// mouth 6.5mm higher — the chin grew 3mm while the mouth moved 6.5, so the
// lower face reads shorter, not longer.
//
// Its depth is down a third and its half-width from 23mm to 20: at 23mm the
// sulcus ran nearly the full width of the mouth and rendered as a
// horizontal shadow band across the whole lower face — a jowl line, on a
// 24-year-old.
const SULCUS_Y = 0.0330
const SULCUS_IN = 0.0052
const SULCUS_WY = 0.0080
const SULCUS_WX = 0.0165

// Chin. Narrow (15.0mm sigma, so a ~30mm pad) and slightly pointed — the
// brief's word — sitting 18.6mm proud of the sulcus above it. Pass 1's
// 10.0mm put the pogonion at z = -79.0 against a nose tip at -94.1, and a
// profile whose chin trails its nose by 15mm reads as a receding jaw
// whatever the front view does.
//
// This number is not free to choose: it is tuned against the E-LINE, the
// tip-to-chin line the upper lip has to sit just behind. Pass 1's lip sat
// 2.9mm in FRONT of it — a muzzle. Every millimetre of vermillion added
// here pushes the lip forward again, so the chin followed the lips out.
// MEASURED: pogonion -90.6, lip 0.68mm behind the line, and the chin
// still 6.6mm behind the lower lip, which is where a woman's sits.
//
// PASS 3 MADE IT ROUNDER AND SHORTER: the pad's half-width sigma up from
// 15.0mm to 16.8 and its vertical sigma down from 13.0 to 11.8. "Slightly
// pointed" was the pass-2 brief and the render came back a V-cone; the pass
// -3 brief is "softly angular, a slightly rounded chin apex", and a chin
// apex is round when the pad is wider than it is tall. Its projection came
// down 1.0mm because the vermillions above it gained 2.0mm each and the
// E-line ties all three together.
const CHIN_Y = MENTON_Y + 0.0230
const CHIN_OUT = 0.0176
const CHIN_WX = 0.0168
const CHIN_WY = 0.0118

/** Lips, philtrum, sulcus and chin, summed. `front` is the same cos^2 mask
 *  warp.ts uses; nose.ts carries the rest of the centre line. */
export function centreFace(x: number, ax: number, y: number, front: number): Delta {
  let dz = 0

  const bow = upperLipY(ax)
  const lipX = bell(ax, LIP_HALF)
  dz -= UPPER_OUT * bell(y - bow, UPPER_WY) * lipX
  dz -= ROLL_OUT * bell(y - (bow + ROLL_UP), ROLL_WY) * lipX
  dz -= LOWER_OUT * bell(y - LOWER_Y, LOWER_WY) * bell(ax, LIP_HALF * 0.95)
  dz += SEAM_OUT * bell(y - STOMION_Y, SEAM_WY) * bell(ax, LIP_HALF * 1.15)
  dz += CORNER_IN * bell(ax - CORNER_X, CORNER_WX) * bell(y - STOMION_Y, CORNER_WY)

  dz += PHILTRUM_IN * bell(ax, PHILTRUM_WX) * bell(y - PHILTRUM_Y, PHILTRUM_WY)
  dz -= COLUMN_OUT * bell(ax - COLUMN_X, COLUMN_WX) * bell(y - PHILTRUM_Y, PHILTRUM_WY)
  dz += SULCUS_IN * bell(y - SULCUS_Y, SULCUS_WY) * bell(ax, SULCUS_WX)
  dz -= CHIN_OUT * bell(ax, CHIN_WX) * bell(y - CHIN_Y, CHIN_WY)

  return { dx: 0, dz: dz * front }
}
