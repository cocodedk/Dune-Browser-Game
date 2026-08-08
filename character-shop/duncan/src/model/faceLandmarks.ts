// character-shop/duncan/src/model/faceLandmarks.ts
// ANATOMY LANDMARKS FIRST, again — bodyPlan.ts did it for the figure, this
// does it for the face. Every height below is a stature metre, laid out
// before a single field exists, and faceSculpt.ts is not allowed to invent
// one of its own. face.test.ts measures the built surface against these, so
// a number that moves here has to survive the render, not just the table.
//
// The frame is fixed by the two ends the round may not touch: LM.chin
// (menton) and LM.crown, 250.9mm apart, and LM.eye — spec.ts's
// eyeLineFraction 0.937 — for the pupils.
//
// HONEST CONSEQUENCE, recorded here rather than discovered later: 0.937 puts
// the eye line 142.8mm above the menton, which is 0.569 of head height where
// the artist's canon says 0.5. The eyes therefore sit ~17mm HIGH in the
// skull, and everything above them is compressed: the upper facial third
// comes out around 0.22 of face height against a canonical 0.33. Spec is the
// law, so the eyes stay where spec puts them; the compression is spent on
// the forehead, which suits the reference anyway — Momoa's hairline is low
// and straight, and this round sweeps the hair back off it into the topknot.

import { LM } from './bodyPlan'

export const FACE = {
  // --- heights, bottom to top -------------------------------------------
  menton: LM.chin, //                                     1.6656 chin bottom
  pogonion: 1.6830, //                             the chin's forward crown
  labiomental: 1.6975, //                    the crease under the lower lip
  gonion: 1.7190, //                                  jaw angle — the corner
  lowerLip: 1.7285,
  stomion: 1.7365, //                                 the line between lips
  upperLip: 1.7440,
  subnasale: 1.7555, //                       where the nose meets the lip
  noseTip: 1.7645, //                     the frontmost point on the figure
  zygion: 1.7955, //                        cheekbone — the face's widest
  eye: LM.eye, //                                   1.8084 pupil centres
  lidCrease: 1.8230, //                      the hood's tuck under the brow
  nasion: 1.8225, //             the dip between brow and bridge (pass 5's)
  browCrest: 1.8275, //                           the ridge, 19mm over eye
  glabella: 1.8310, //                              between the two ridges
  frontalEminence: 1.8585, //           the forehead's paired bosses, broad
  crown: LM.crown, //                                             1.9165

  // --- widths, as half-widths from the centreline -----------------------
  pupilX: 0.0330, //                        66mm interpupillary — wide-set
  eyeHalfW: 0.0210,
  browX: 0.0400,
  zygionX: 0.0820, //                       164mm bizygomatic on a 251mm head
  gonionX: 0.0685,
  // Pass 2: 62mm rendered as a small pad lost inside 171mm of beard. Momoa's
  // mouth is wide at rest and it is one of the few things visible through the
  // hair, so it is now 69mm. face.test.ts measures the lips, not this number.
  mouthHalf: 0.0345,
  alarX: 0.0205,
  templeX: 0.0700,
} as const

/** THE EYEBALL, as anatomy rather than as a decal.
 *
 *  Pass 1 shipped a 6mm-deep lens (rz 0.0030) sitting 4.5mm proud of a flat
 *  socket floor. Measured, its aperture was right — 28 x 10mm of visible eye
 *  — and it still rendered as a dead black pill, because a surface that flat
 *  has no shading gradient across it: every pixel of it takes the key light
 *  at the same angle, so it is one uniform value and reads as a hole.
 *
 *  A globe 20mm deep takes the key across a 90-degree sweep of normal and
 *  therefore has a bright side, a terminator and a dark side inside one 28mm
 *  aperture. That gradient is the whole difference between "eye" and "slot",
 *  and it costs nothing but rz. `proud` grows with it so the aperture stays
 *  the size it measured at — the front pole sits `proud` in front of the
 *  socket floor whatever rz is (eyes.ts does that arithmetic). */
export const GLOBE = {
  rx: 0.0180,
  ry: 0.0098,
  rz: 0.0100,
  proud: 0.0082,
} as const

/** THE PALPEBRAL FISSURE — where the lids cut the globe, in the eye's own
 *  frame: half-length outward from the pupil, how far the upper lid margin
 *  rides above the pupil centre and the lower margin below it. 11mm of open
 *  eye between them at the centre, closing to nothing at both corners, which
 *  is a man's. `skew` biases the upper margin's peak medially and the lower
 *  margin's trough laterally — the asymmetry that stops a pair of arcs
 *  reading as a lens cut out of paper. */
export const FISSURE = {
  half: 0.0180,
  upper: 0.0046,
  lower: 0.0082,
  skew: 0.35,
} as const

// WHICH SIDE THE SCAR IS ON — read this before moving it.
//
// Momoa's scar is over his own LEFT brow, and the film keeps it. In this
// shop the figure faces -Z (seam.test.ts) with +Y up, which makes its own
// right +X: right = forward x up = (0,0,-1) x (0,1,0) = (+1,0,0). arm.ts
// says the same thing in the code that already shipped — "side: -1 for armL
// (-X), +1 for armR (+X)" — so the figure's LEFT is -X, and that is where
// this constant puts the scar.
//
// The R2 brief said "left in model space = +X when facing -Z". That is the
// one number in the brief the geometry disagrees with, and it disagrees with
// arm.ts too, so following it literally would have put Duncan's scar over
// the wrong brow AND mirrored it away from armL. Rendered proof rather than
// argument: a front camera sits at -Z looking back, its screen-right is
// world -X, so a scar at -X lands on the VIEWER'S right — exactly where it
// sits in every photograph of Momoa. To mirror it anyway, flip this sign and
// the matching expectation in face.test.ts (the test hard-codes the side on
// purpose, so a flip here alone fails loudly instead of passing quietly).
export const SCAR_SIDE = -1

/** The scar. PASS 3 MAKES IT TISSUE INSTEAD OF ABSENCE, and that is the whole
 *  change: pass 1 cut a crater, pass 2 cut a clean 34 x 5 x 7mm groove, and a
 *  third independent critic still read the result as "a broken/misaligned
 *  eyebrow mesh" — because what the render actually showed between the two
 *  brow pieces was 3.6mm of LIT, EMPTY SKIN. A gap is not a mark. Nothing in
 *  the frame said why the hair stopped, so the only available reading was that
 *  the model was broken, and that reading is correct about the evidence.
 *
 *  A scar is RAISED. So there are two forms here now, and the split matters:
 *
 *    THE CORD (scar.ts) is its own lofted ridge, the same construction as a
 *    brow and a lid (ridge.ts), in SKIN. It has to be geometry and not a
 *    field, and the reason is sampling: the skull carries ~4.5mm of arc
 *    between radial samples at the brow, so a 3mm-wide crease authored into
 *    its displacement field is finer than the surface that has to carry it and
 *    renders as nothing. A ridge loft brings its own resolution.
 *
 *    THE GROOVE is still a skull field, but it is now OFFSET to one flank of
 *    the cord rather than centred on it. That offset is the shadow: the cord's
 *    lateral-and-down flank climbs out of the trough at a slope of ~1.6, and
 *    the portrait key (az +45, el 30 off the camera) reaches the face along
 *    (0.612, 0.5, -0.612), so any wall on this side steeper than h' = 0.78
 *    turns its normal past the terminator and goes to ambient. Cutting the
 *    trough on the OTHER flank would have lit it instead. The arithmetic is
 *    written down because it is only true for a scar on -X: the key sits at
 *    +X, and mirroring the mark would mirror the shading argument with it.
 *
 *  `tilt` is steeper than pass 2's 0.62 — the mark crosses the brow closer to
 *  square, which is what stops it reading as a second, shorter eyebrow — and
 *  `y` drops 2.5mm onto the brow's own centre so the cord reaches past BOTH
 *  edges instead of running off the top. Long axis upper-LATERAL to
 *  lower-MEDIAL, so the tilt takes SCAR_SIDE's sign: on the left brow (-X) the
 *  outboard end is the high one, which needs the +x end low, hence negative. */
/** How steeply the mark rakes across the brow, in radians off horizontal. The
 *  first pass-3 render answers this number, not taste: at 0.80 the cord had to
 *  run 13mm of x to gain 13mm of y, which walked it lengthways THROUGH both
 *  brow pieces and left it hanging past the lateral one — a lumpy skin worm
 *  laid over the hair. At 1.14 the same 13mm of height costs 6mm of x, so the
 *  cord clears the brow band above and below it and only ever crosses hair
 *  inside the 3.6mm gap. Steeper is also the truer read: a scar that rakes at
 *  45 degrees across a brow is a second, shorter eyebrow.
 *
 *  1.14 was still not steep enough. Measured against the built brow, the cord
 *  crossed 1.8mm INTO the lateral piece's inner-lower corner and the render
 *  showed it: a pale sliver cutting a zigzag out of the dark brow, which is
 *  one more thing for a correctness sweep to call broken. At 1.30 the whole
 *  14.5mm brow band costs the mark 3.9mm of x against a 3.6mm gap, so what is
 *  left to overlap is a fraction of a millimetre at each edge. */
const RAKE = 1.30

export const SCAR = {
  x: SCAR_SIDE * 0.0430,
  y: 1.8290,
  rake: RAKE,
  tilt: RAKE * SCAR_SIDE,
  // The trough, and how far across the mark its centre sits from the cord's.
  // Measured on the built surface at 5.5mm deep the trough OUTWEIGHED the
  // cord — the across-profile read flat skin, then a 6.5mm drop, which is a
  // groove with a lip, which is what pass 2 already shipped. The cord has to
  // be the dominant form or none of this is a change.
  long: 0.0135,
  across: 0.0042,
  depth: 0.0042,
  offset: 0.0034,
  // The cord: half its extent in world x, its section (front, back and the
  // world-y half-height a near-vertical form needs — see scar.ts), and how far
  // its crest stands proud of the skin the ridge loft finds under it. The
  // first render carried 2.4mm of standoff on a 2.4mm-deep section and read as
  // an object ON the face rather than a mark IN it; 1.6mm on a 1.4mm front
  // puts the form's own edge two tenths proud, so it rolls into the skin.
  run: 0.0033,
  high: 0.0042,
  deep: 0.0014,
  back: 0.0040,
  proud: 0.0016,
} as const

/** The unit direction ACROSS the mark, pointing medial-and-up — the axis the
 *  trough is offset along and the one the shading argument above is written
 *  in. Mirrors with the side, so flipping SCAR_SIDE keeps the trough on the
 *  same flank of the cord (it would stop being the shadowed flank, which is
 *  the note in SCAR's header). */
export const SCAR_ACROSS = {
  x: -SCAR_SIDE * Math.sin(RAKE),
  y: Math.cos(RAKE),
} as const
