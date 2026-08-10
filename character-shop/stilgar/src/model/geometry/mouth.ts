// character-shop/stilgar/src/model/geometry/mouth.ts
// Lips, philtrum, mouth line, labiomental crease and chin pad — the lower
// third, which R1 did not sculpt at all because the beard covered it. It
// covered it too well: the render showed one unbroken dark mass from the
// nose to the collar with no mouth anywhere in it.
//
// So the mouth is built twice over, in two materials. THIS file sculpts the
// lips into the skin. beard.ts then calls `mouthOpening` below to SINK its
// own hair field over the same region — the hair patch drops inside the head
// there and is simply not drawn, and the lips it was covering emerge. The
// visible boundary is the curve where hair thickness crosses zero, which is
// a smooth authored curve rather than a cut edge, and it lands where a
// moustache actually lands: over the upper lip, clear of the lower one.

import { bell } from './curves'

// Absolute local Y. The stomion sits a third of the way down from the
// subnasale (measured 0.0789) to the chin — the classical placement.
//
// R2 pass 4 raises it 2.0 mm, and that is the whole of the "under-nose span
// is over-long" finding. The panel measured eye-line-to-mouth at 2.5 aperture
// widths against a canon of 1.6-1.8, but two thirds of that miss was the
// APERTURE: at pass 3's 25.6 mm opening the same 59.7 mm span reads 2.33,
// and at the 33.4 mm opening orbit.ts now builds it reads 1.79 untouched.
// The remaining 2 mm buys 1.72, mid-band, without shortening a philtrum that
// measures 9 mm — already at the short end of human.
const STOMION_Y = 0.0708

// Wide mouth, per the brief: 52 mm corner to corner on a 160 mm face.
// Tighter in Y than pass 3 and taller: a vermilion is a ROLL with its own
// upper margin, and at a 5.4 mm falloff the upper lip was a swell that
// merged into the philtrum with no edge anywhere.
const UPPER_Y = 0.0746
const UPPER_OUT = 0.0070
const UPPER_WX = 0.0230
const UPPER_WY = 0.0042
// The lower lip is the fuller of the two — the lead named it explicitly.
//
// R2 pass 2's headfront measured the whole visible mouth at 137-152/255 with
// no internal value change anywhere: a flat tan oval in a black beard, which
// reads as a HOLE in the beard rather than as lips. A lip is not a mound, it
// is a ROLL — a surface that turns over at its own upper edge and undercuts
// at its lower one. So the amplitude goes up and the falloff comes in: the
// same 13 mm of lip over a 5.6 mm run instead of a 6.8 mm one is what turns a
// mound into a form with a lit top and a shaded underside.
const LOWER_Y = 0.0656
const LOWER_OUT = 0.0094
const LOWER_WX = 0.0232
const LOWER_WY = 0.0050
// THE ORAL SEAM, and the single biggest thing pass 3 did not have. Three
// judges found no readable mouth line: they read the dark slot at the nose
// base as the mouth and the lip pad 15 mm below it as a chin patch. The line
// was there — 4 px of it, 1 mm tall on the midline — and it died out long
// before the corners, so what the render actually showed was two skin pads.
//
// It is now deep, WIDE and tight: 8.6 mm of groove over a 2.1 mm falloff,
// carried to |x| = 29 mm. Wide matters more than deep, because this groove
// is the only feature on the face that has to read THROUGH the hair — the
// beard hangs off this same skin surface (beard.ts uses headPointAtY), so a
// seam cut into the skin propagates into the moustache above it and the
// beard below it, and one continuous line across skin AND hair is what
// "ONE unambiguous oral seam" means on a bearded face.
const LINE_IN = 0.0086
const LINE_WX = 0.0290
const LINE_WY = 0.0021
// The commissures. A lip pair built from two Gaussians has no corners, only
// places where it fades out, and the beard boundary crossing that fade is
// what read as "the lower lip's corners plunging into the beard as detached
// lobes". A small recess at each end gives the seam somewhere to END.
const CORNER_X = 0.0248
const CORNER_IN = 0.0036
const CORNER_WX = 0.0070
const CORNER_WY = 0.0046
// Philtrum: the vertical groove up to the nose base, and the two columns that
// give it walls. A groove with no walls is a dent; the columns are what make
// the notch legible from dead front.
const PHIL_IN = 0.0044
const PHIL_Y = 0.0798
const PHIL_WX = 0.0050
const PHIL_WY = 0.0070
const COLUMN_X = 0.0066
const COLUMN_OUT = 0.0026
const COLUMN_WX = 0.0042
// Labiomental crease, then the chin pad below it. The crease is deepened and
// tightened for the same reason as the lip roll: it is the shadow that says
// the lip ENDS, and without it the lower lip and the chin are one mass. Both
// ride up with the stomion, so the lower lip still ROLLS into the chin form
// rather than floating above a gap.
const MENTAL_IN = 0.0064
const MENTAL_Y = 0.0574
const MENTAL_WX = 0.0218
const MENTAL_WY = 0.0048
const CHIN_OUT = 0.0078
const CHIN_Y = 0.0406
const CHIN_WX = 0.0206
const CHIN_WY = 0.0138

/** Z displacement of the mouth region at (x, y). Negative is forward. */
export function mouthDz(x: number, y: number, front: number): number {
  const ax = Math.abs(x)
  let dz = 0
  dz -= UPPER_OUT * bell(x, UPPER_WX) * bell(y - UPPER_Y, UPPER_WY) * front
  dz -= LOWER_OUT * bell(x, LOWER_WX) * bell(y - LOWER_Y, LOWER_WY) * front
  dz += LINE_IN * bell(x, LINE_WX) * bell(y - STOMION_Y, LINE_WY) * front
  dz += CORNER_IN * bell(ax - CORNER_X, CORNER_WX) * bell(y - STOMION_Y, CORNER_WY) * front
  dz += PHIL_IN * bell(x, PHIL_WX) * bell(y - PHIL_Y, PHIL_WY) * front
  dz -= COLUMN_OUT * bell(ax - COLUMN_X, COLUMN_WX) * bell(y - PHIL_Y, PHIL_WY) * front
  dz += MENTAL_IN * bell(x, MENTAL_WX) * bell(y - MENTAL_Y, MENTAL_WY) * front
  dz -= CHIN_OUT * bell(x, CHIN_WX) * bell(y - CHIN_Y, CHIN_WY) * front
  return dz
}

// THE HAIR WINDOW — where the beard has to get out of the way of the lips.
//
// ONE window, spanning the WHOLE oral region — upper lip, seam and lower lip
// together. The first pass-4 try tightened its upward falloff to protect the
// moustache and split the skin into two patches with hair between them: a
// small tab at the philtrum and an oval below, which is the same "lip pad
// reads as a chin patch" the panel reported, rebuilt by a different route.
//
// The moustache does not need protecting by the window. It is protected by
// its own mass: TASH is 8.2 mm at the lobes and the window has only faded to
// 0.26 by the time it reaches them, so `t * (1 - w)` still leaves 6 mm of
// hair up there. Slightly asymmetric — a touch more reach downward, because
// the lower lip is the fuller of the two and the labiomental crease has to
// clear as well.
const OPEN_WX = 0.0330
const OPEN_Y = 0.0692
const OPEN_WY_UP = 0.0100
const OPEN_WY_DOWN = 0.0088

/** 0..1: how far the beard's hair field must give way here. beard.ts is the
 *  only caller — see beardField.thicknessAt for how it is applied, which is
 *  a BLEND rather than pass 3's 46 mm subtraction. */
export function mouthOpening(x: number, y: number): number {
  const d = y - OPEN_Y
  return bell(x, OPEN_WX) * bell(d, d > 0 ? OPEN_WY_UP : OPEN_WY_DOWN)
}
