// character-shop/duncan/src/model/scar.ts
// THE SCAR CORD — raised tissue, as its own lofted ridge.
//
// Three renders argued this file into existence. Pass 1 cut a 60 x 15 x 11mm
// trench and a critic called it a modeling error. Pass 2 cut a clean 34 x 5 x
// 7mm groove and left a 3.6mm gap in the brow, and a THIRD independent critic
// read the result as "a broken/misaligned eyebrow mesh" — which was a fair
// reading of the pixels, because what sat in the gap was lit, empty skin.
// Absence cannot be a character mark. Something has to be THERE.
//
// So the mark is a raised cord now, and it is geometry rather than field for
// one measurable reason: the skull loft samples ~4.5mm of arc between radial
// segments at the brow, and a 3mm-wide crest carved into its displacement
// field is finer than the surface carrying it — it averages away to nothing
// between two samples. A ridge (ridge.ts) brings its own sampling, which is
// the same argument brows.ts and lids.ts each make for the same construction.
//
// It runs THROUGH the brow's gap and past it at both ends, so the eye reads
// one continuous diagonal crossing an interrupted brow rather than two brow
// pieces that failed to meet. Its section is SKIN: a scar over a brow is a
// bald cord, not a third tuft of hair, and this face has already paid twice
// for putting more dark objects on it.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { buildRidge, endSink } from './ridge'
import type { EndFade, Section } from './ridge'
import { SCAR, SCAR_ACROSS, SCAR_SIDE } from './faceLandmarks'
import type { Surface } from './eyes'

/** The mark's own line: world y at distance `s` OUTWARD from SCAR.x along the
 *  face. The cord and the trough faceBrow.ts cuts share one slope, so the two
 *  are one event rather than two marks that nearly agree.
 *
 *  No side factor, and that is worth one line: ridge.ts's bake puts the form
 *  at world x = side * (x0 + s), so s already means "further outboard" on
 *  either face, and the scar's outboard end is the high one on either brow.
 *  The patch in faceBrow.ts reaches the same line from the other direction,
 *  with the sign carried in SCAR.tilt instead. */
const SLOPE = Math.tan(SCAR.rake)

function markLine(s: number): number {
  return SCAR.y + SLOPE * s
}

/** Fullest across the brow, thinning toward both ends — a scar is widest where
 *  the wound was deepest and feathers out.
 *
 *  `high` is a world-y half-extent, not a half-width, and for a mark raking at
 *  1.14 rad those differ by a factor of 1/cos(rake) = 2.4: ridge.ts's bake
 *  stacks this form's rings along world x, so every ring is a slice cut ACROSS
 *  a near-vertical cord and is stretched up the page by exactly that. A 1.2mm
 *  half-width is therefore authored as 2.8mm of `high`, and reading that number
 *  as a thickness is how the first render got a caterpillar.
 *
 *  The waist is shallow — 0.62 rather than the first render's 0.42 — because a
 *  strong mid-bulge on a 10mm form is a lump, and the render showed a lump. */
function section(s: number): Section {
  const n = Math.min(1, Math.abs(s) / SCAR.run)
  const fat = 0.62 + 0.38 * (1 - n * n)
  return { high: SCAR.high * fat, deep: SCAR.deep * fat, back: SCAR.back * fat }
}

/** Both tips go UNDER the skin over the last 5mm. ridge.ts's endSink header
 *  records what a ridge that keeps its standoff to the tip looks like: a lit
 *  spur hanging off the face, which is one more speck on a face whose whole
 *  problem has been specks. */
const TIP = 0.38
const FADE = { reach: 0.0014, depth: 0.0013 }

/** WHERE THE SKIN IS UNDER THE CORD, smoothed ACROSS the mark.
 *
 *  The cord has to ride the brow ridge's own curve, which is a 17mm form, and
 *  it must NOT ride the trough beside it, which is a 4mm one 3.4mm away. Asked
 *  point by point, `surface` answers both, and the first render showed the
 *  result: the cord kinked into an S wherever its line grazed the trough's
 *  wall, because a station's own cz was being set by a crease the same station
 *  was supposed to stand out of. Three samples spread 8mm across the mark
 *  average the trough away — it is 8.4mm wide — and leave the ridge, which is
 *  four times broader, untouched. */
function skinUnder(surface: Surface, x: number, y: number): number {
  let sum = 0
  for (const u of [-0.0040, 0, 0.0040]) {
    sum += surface(x + SCAR_ACROSS.x * u, y + SCAR_ACROSS.y * u)
  }
  return sum / 3
}

export function buildScar(
  bin: Bin, materials: DuncanMaterials, head: Group, originY: number, surface: Surface,
): void {
  const fades: EndFade[] = [
    { at: -SCAR.run, ...FADE },
    { at: SCAR.run, ...FADE },
  ]
  buildRidge(bin, head, {
    side: SCAR_SIDE,
    from: -SCAR.run,
    to: SCAR.run,
    // s is measured from the mark's own centre, so x0 carries the whole
    // offset and the line is symmetric about zero.
    x0: Math.abs(SCAR.x),
    y0: SCAR.y,
    originY,
    section,
    line: markLine,
    // The crest stands SCAR.proud in front of the skin the loft finds at this
    // station — which already includes the trough, so the cord rides a little
    // lower where the trough reaches it and the two forms cannot separate.
    centreZ: (s, y, sec) =>
      skinUnder(surface, SCAR_SIDE * (Math.abs(SCAR.x) + s), y) + sec.deep - SCAR.proud
      + endSink(s, fades),
    ends: [TIP, TIP],
    steps: 10,
  }, materials.skin, 'scarCord', {
    rings: 28, radial: 20, domeBottomH: 0.0009, domeTopH: 0.0009,
  })
}
