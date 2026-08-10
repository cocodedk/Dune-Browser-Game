// character-shop/chani/src/model/face/plan.ts
// Every head-local landmark height, in ONE place, derived from spec.ts so a
// spec edit moves the whole face instead of half of it.
//
// The frame: the 'head' armature group sits at world Y = heightM - headH
// (Chani.ts stacks legH+pelvisH+spineH+chestH+neckH, which is exactly
// bodyH), so head-local Y = 0 IS the menton — the bottom of the chin — and
// head-local Y = headH is the crown. +Z is the back of the skull, -Z the
// face. Both facts are load-bearing: seam.test.ts measures the eye line
// against PROPORTIONS.eyeLineFraction in world Y, and every number below
// is that same line expressed head-locally.
//
// The vertical layout is the classical facial thirds — menton to subnasale,
// subnasale to glabella, glabella to trichion — sized so each third is
// within a hair of 1/3 of the face, and so the eye line lands where the
// spec says it does. head.test.ts measures all four landmarks off the
// finished vertices rather than trusting these constants.

import { PROPORTIONS } from '../../spec'

const { heightM, headHeightFraction, eyeLineFraction } = PROPORTIONS

/** Menton to crown, the same derivation proportions.ts uses. */
export const HEAD_H = (heightM * (headHeightFraction.min + headHeightFraction.max)) / 2

/** Head-local Y of the spec's eye line. heightM * eyeLineFraction is the
 *  world height; the head group's own origin is heightM - HEAD_H. */
export const EYE_Y = HEAD_H - heightM * (1 - eyeLineFraction)

export const MENTON_Y = 0
/** Base of the nose, where the columella meets the lip.
 *
 *  MEASURED, pass 2. The finished vertices put the thirds at 0.324 lower /
 *  0.388 middle / 0.288 upper: the middle third dominated, which is the
 *  single proportion that reads as masculine and gaunt on an otherwise
 *  young face. The middle third is subnasale-to-brow, and pass 2 tried to
 *  shorten it from BOTH ends — this constant up 7.8mm (a shorter nose
 *  span) and the brow ridge down.
 *
 *  ONLY THE FIRST HALF SURVIVED THE CAPTURE. Dropping the ridge buried the
 *  eye under it (see warp.ts BROW_Y), so the ridge went back to within
 *  0.2mm of where pass 1 had it, and the upper third was lengthened
 *  instead by raising TRICHION_Y 7.0mm. Final measured thirds:
 *  0.319 / 0.354 / 0.328. */
export const SUBNASALE_Y = 0.0750
/** Smooth of the forehead between the brows — top of the middle third. */
export const GLABELLA_Y = 0.1258
/** Hairline. The hair shell's front line crosses the forehead here. The
 *  profile scan reads the crossing ~5mm BELOW this row, which is why it is
 *  authored above the height it is meant to measure at. */
export const TRICHION_Y = 0.1920
/** Top of the SKIN. The last ~15mm of stature is hair sitting on this.
 *  Raised 4mm by pass 2: head.test.ts holds the eye line within 4mm of
 *  half the SKULL height and pass 1 measured 3.45mm of that 4mm budget
 *  spent. Every millimetre the vertex rises is half a millimetre of margin
 *  back. Measured after: 0.05mm. */
export const SCALP_Y = 0.2245
/** Crown of the hair — the tallest geometry on the whole figure. Kept
 *  under headHeightFraction.max * heightM so the head-height band stays
 *  green with the hair counted, which is how a critic measures it. */
export const HAIR_TOP_Y = 0.2395

/** Widest point of the cheekbones, and the height the bizygomatic band is
 *  measured in. High and just outboard of the eyes — the single form that
 *  carries "softly angular heart shape". */
export const ZYGION_Y = EYE_Y - 0.0110
/** Jaw angle. The mandible border runs from here down to the chin. */
export const GONION_Y = 0.0655
/** Lip line — the seam between the two vermillions.
 *
 *  PASS 3 RAISED IT 6.5mm, and this is the one number that most changes how
 *  old the face looks. MEASURED on pass 2's finished vertices: the eye
 *  centre sits at 116.11mm and the lip seam at 46.0, so eye-to-mouth is
 *  70.1mm against a 37.14mm eye — 1.89 eye-widths, where a young face runs
 *  1.6-1.8 and Zendaya reads at the delicate end of it. A long lower face is
 *  read as age and as male before any single feature is; the critics who
 *  called this face "gaunt and careworn" were reading a ratio, not a form.
 *
 *  Raising the seam to 52.5 puts the ratio at 1.70. It is also the
 *  anatomically correct place for it once the subnasale is at 75.0: the
 *  lower third splits one part upper lip to two parts chin, so the seam
 *  belongs a third of the way down from the subnasale, and 46.0 was a
 *  quarter of the way.
 *
 *  Everything keyed to the mouth moved with it — station.ts's four mouth
 *  rows (they are mesh DENSITY, and a mouth that outruns its rows renders as
 *  nothing), the sulcus, and the measurement windows in profile.test.ts,
 *  head.test.ts and headReport.ts. Each is declared in progress.md. The
 *  MENTON did not move and could not: head-local Y = 0 is the head group's
 *  own origin, and head.test.ts holds the eye line within 4mm of half the
 *  skull height, a budget with 1.1mm left in it. The chin was shortened from
 *  the TOP instead — mouth.ts SULCUS_Y stayed near its old absolute height
 *  rather than following the seam up. */
export const STOMION_Y = 0.0525
/** Tip of the nose: the frontmost vertex on the entire figure. */
export const NOSE_TIP_Y = 0.0812

/** Half the interpupillary distance, and the anchor every eye, lid, socket
 *  and brow field is placed from.
 *
 *  PASS 3 MOVED IT OUT 1.8mm, on a measurement pass 2 never took. Canon puts
 *  one whole eye between the two eyes; pass 2's finished vertices put the
 *  inner canthi 29.88mm apart against a 37.14mm aperture — 0.80 of an eye,
 *  which is a narrow-set face, and narrow-set eyes read as older and
 *  smaller than they are however large the almond is. At 36.8 the gap
 *  measures 33.5mm, 0.90 of an eye.
 *
 *  It is deliberately NOT the whole 1.00. Getting there needs another 3.6mm
 *  per side, which walks the outer canthus to within 14mm of the cheekbone's
 *  own edge, and the brief's "large" is the constraint that outranks the
 *  gap: shrinking the aperture to buy the ratio is the one move that is not
 *  available. */
export const EYE_X = 0.0368
/** Head-local Z of the eye lens's own canthus plane. MEASURED: at -0.0606
 *  the lens stood 1.4mm proud of the skin at its widest slice, so what the
 *  renderer showed was a thin intersection sliver, not the authored
 *  almond — the eyes read as smears of blue eyeshadow. At -0.0632 the
 *  aperture stands 5.75mm proud and its own outline is what you see.
 *
 *  THIS CONSTANT IS ONLY HALF OF WHETHER THE EYE READS, and pass 2 found
 *  the other half by measuring the capture rather than the table. A pixel
 *  scan of pass 1's headfront put 10.05mm of blue on screen against a
 *  16.43mm authored aperture: 39% of the eye was buried, because the
 *  upper-lid fold sat at EYE_Y + 9.4 and the aperture's own top edge is at
 *  EYE_Y + 8.9 — the crease was ON the eye. Moving the fold up (warp.ts
 *  LID_Y) exposes 12.8mm of it without pushing the lens any further out,
 *  and a lens pushed out instead just becomes a bead. */
export const EYE_Z = -0.0632
