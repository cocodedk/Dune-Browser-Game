// character-shop/duncan/src/model/brows.ts
// The brows, and the scar that breaks one of them. The CONSTRUCTION lives in
// ridge.ts and its header argues why a brow is a loft; this file is only the
// numbers, and pass 2 changed almost all of them.
//
// PASS 1 shipped 20mm-tall slugs with a 20 x 20mm "bean" for the scarred
// side's medial piece and a proud nub at every tip; pass 2 fixed the sizes
// (half-height peaks at 7.2mm — a 14mm brow), started the tips further in so
// they could fade rather than end, and cut the gap so the two pieces read as
// ONE brow sliced through: same line, same table, same taper.
//
// PASS 3 IS ABOUT THE OTHER HALF OF THAT CRITIQUE, which pass 2 did not
// answer: correct-sized shapes that still sat on the forehead like decals.
// Both causes were measurable and both are addressed below — a section whose
// exposed edge cut the skin instead of rolling into it (RIB), and a line that
// was a constant slope where a brow is an arch (ARCH).

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { buildRidge, endSink } from './ridge'
import type { EndFade, Section } from './ridge'
import { FACE, SCAR, SCAR_SIDE } from './faceLandmarks'
import { spline } from './stations'
import type { Surface } from './eyes'

/** Medial end, how far the ridge runs outward, and how far the hair stands
 *  proud of the skin.
 *
 *  START_X is inboard of pass 1's 17.5mm because the tips now fade rather
 *  than end, and a fading tip needs somewhere to fade. It stays clear of the
 *  nose bridge — faceMouth.ts's NOSE rib is already at zero amplitude by
 *  1.8230, and browY(0) is 1.8300 — so the medial tip lands on the glabella,
 *  which is where a brow's medial tip lands. RUN stops the lateral tip inside
 *  the skull's own 82mm half-width instead of running off the side. */
const START_X = 0.0160
const RUN = 0.0600
/** 2.9mm, not pass 2's 3.2. With RIB's front half-depth at 2.6mm this leaves
 *  the form's own silhouette edge 0.3mm proud of the skin instead of 0.6 —
 *  half the step, so the brow's outline is nearer a tangency and further from
 *  a stamped edge. It is not taken all the way to zero on purpose: two
 *  surfaces grazing at exactly zero is where a renderer starts speckling. */
const PROUD = 0.0029

/** Distance outward from START_X, the half-HEIGHT of the ridge's section
 *  there, and the two half-DEPTHS — FRONT (the exposed cap) and BACK (the
 *  buried half). Thin at both ends, fullest just inboard of centre: a brow's
 *  own taper.
 *
 *  PASS 3 SPLIT THE DEPTH, and ridge.ts's Section header argues the number.
 *  Pass 2 carried one depth of 4.2mm behind a 3.2mm standoff, which put the
 *  form's own silhouette edge 1mm BEHIND the skin: the brow did not roll off
 *  into the face, it cut it, and a shape with a stamped outline and no
 *  gradient across it is a decal. That is what the third critic saw and named.
 *  A 2.6mm front against the same standoff puts the edge 0.6mm PROUD instead,
 *  so the section's whole curvature is exposed — a lit crest, a terminator and
 *  a shaded lower edge inside one 14mm brow — while `back` keeps the buried
 *  half deep enough that no underside can lift off the skull. */
const RIB = [
  { s: 0.0000, high: 0.0034, deep: 0.0016, back: 0.0044 },
  { s: 0.0110, high: 0.0068, deep: 0.0023, back: 0.0064 },
  { s: 0.0220, high: 0.0072, deep: 0.0026, back: 0.0070 },
  { s: 0.0330, high: 0.0070, deep: 0.0025, back: 0.0068 },
  { s: 0.0440, high: 0.0060, deep: 0.0022, back: 0.0060 },
  { s: 0.0530, high: 0.0046, deep: 0.0019, back: 0.0050 },
  { s: 0.0600, high: 0.0028, deep: 0.0015, back: 0.0038 },
]

/** The brow's own LINE, as heights above FACE.browCrest at the same distances
 *  — not a constant slope, which is what pass 2 had.
 *
 *  A straight ramp down and out is a BAR, and a bar laid across a round
 *  forehead is the other half of the "pasted-on" reading: the eye gets a
 *  shape whose top edge is a single straight line, and nothing in a skull is.
 *  A brow rises from a low medial head, crests about a third of the way out
 *  where the supraorbital ridge is fullest, and then falls away faster and
 *  faster into the temple. These six numbers are that curve, and because
 *  browLine() is Catmull-Rom through them the two pieces of the CUT brow are
 *  still samples of one function — collinear by construction, which is the one
 *  thing pass 2 got right here and this must not lose. */
const ARCH = [
  { s: 0.0000, up: 0.0013 },
  { s: 0.0120, up: 0.0019 },
  { s: 0.0240, up: 0.0015 },
  { s: 0.0360, up: -0.0003 },
  { s: 0.0480, up: -0.0032 },
  { s: 0.0600, up: -0.0070 },
]

/** The gap the scar cuts, as distances along the ridge, centred on SCAR.x so
 *  the missing hair and the groove faceBrow.ts cuts through the bone are one
 *  event. 8mm of table minus the 1.4mm end domes leaves ~5mm of skin showing
 *  between the two pieces — the brief's "no wider than 4mm" plus the width of
 *  the groove itself, which is what a scar through a brow looks like. */
const HALF_GAP = 0.0034
const GAP = {
  from: Math.abs(SCAR.x) - START_X - HALF_GAP,
  to: Math.abs(SCAR.x) - START_X + HALF_GAP,
}

/** Catmull-Rom through an authored table keyed on `s` — the same curve
 *  stations.ts eases every other form in this shop with. A polyline through
 *  the arch would put a corner at every entry, and a corner on a brow's top
 *  edge is the straight-line artifact this table exists to remove. */
function through<T extends { s: number }>(table: T[], s: number, pick: (row: T) => number): number {
  const last = table.length - 1
  let i = 0
  while (i < last - 1 && table[i + 1].s < s) i++
  const at = (k: number): T => table[Math.min(last, Math.max(0, k))]
  const span = table[i + 1].s - table[i].s
  const t = span > 0 ? Math.min(1, Math.max(0, (s - table[i].s) / span)) : 0
  return spline(pick(at(i - 1)), pick(at(i)), pick(at(i + 1)), pick(at(i + 2)), t)
}

function browLine(s: number): number {
  return FACE.browCrest + through(ARCH, s, (r) => r.up)
}

function section(s: number): Section {
  return {
    high: through(RIB, s, (r) => r.high),
    deep: through(RIB, s, (r) => r.deep),
    back: through(RIB, s, (r) => r.back),
  }
}

/** A brow ENDS in a point that dies into the skin; a brow that has been CUT
 *  keeps most of its section and shows a short chamfered face. Two different
 *  things, and pass 1 drew both as the same rounded 0.80 stub.
 *
 *  Pass 2's first render then over-corrected the cut to 0.92 — a square face
 *  4mm across, standing 3.2mm proud, which caught the rim light and rendered
 *  as a bright vertical stripe. The two brow halves read as dominoes. A 0.78
 *  chamfer plus a 2mm sink tucks that face toward the skin so the break reads
 *  as an interruption rather than as two objects with ends. */
const TIP = 0.30
const CUT = 0.78
const TIP_DOME = 0.0034
const CUT_DOME = 0.0016
/** A tip has to disappear; a cut only has to stop standing out. */
const TIP_FADE = { reach: 0.0090, depth: 0.0055 }
const CUT_FADE = { reach: 0.0042, depth: 0.0020 }

function build(
  bin: Bin, materials: DuncanMaterials, head: Group, originY: number, side: -1 | 1,
  from: number, to: number, surface: Surface, ends: [number, number],
  domes: [number, number], fades: EndFade[],
): void {
  buildRidge(bin, head, {
    side,
    from,
    to,
    x0: START_X,
    y0: FACE.browCrest,
    originY,
    section,
    line: browLine,
    centreZ: (s, y, sec) =>
      surface(side * (START_X + s), y) + sec.deep - PROUD + endSink(s, fades),
    ends,
    // 16 rather than ridgeStations' default 8. The skull falls 55mm back over
    // this run, and a Catmull-Rom through stations 7.5mm apart resolves that
    // curve to about half a millimetre — enough that the form rides the
    // forehead in eight chords rather than following it. Halving the spacing
    // is the cheapest part of "follows the ridge in all three axes".
    steps: 16,
  }, materials.hair, 'browHair', {
    rings: 34, radial: 20, domeBottomH: domes[0], domeTopH: domes[1],
  })
}

export function buildBrows(
  bin: Bin, materials: DuncanMaterials, head: Group, originY: number, surface: Surface,
): void {
  for (const side of [-1, 1] as const) {
    if (side === SCAR_SIDE) {
      // Medial piece: dies into the glabella, CUT at its outer end.
      build(bin, materials, head, originY, side, 0, GAP.from, surface,
        [TIP, CUT], [TIP_DOME, CUT_DOME],
        [{ at: 0, ...TIP_FADE }, { at: GAP.from, ...CUT_FADE }])
      // Lateral piece: CUT at its inner end, dies into the temple.
      build(bin, materials, head, originY, side, GAP.to, RUN, surface,
        [CUT, TIP], [CUT_DOME, TIP_DOME],
        [{ at: GAP.to, ...CUT_FADE }, { at: RUN, ...TIP_FADE }])
      continue
    }
    build(bin, materials, head, originY, side, 0, RUN, surface,
      [TIP, TIP], [TIP_DOME, TIP_DOME],
      [{ at: 0, ...TIP_FADE }, { at: RUN, ...TIP_FADE }])
  }
}
