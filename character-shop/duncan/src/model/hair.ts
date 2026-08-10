// character-shop/duncan/src/model/hair.ts
// The PALETTE.hair volumes that are not the beard (beard.ts) and not the
// knot (topknot.ts): the cap over the cranium and the fall down the back.
//
// THE HAIRLINE IS NOT AUTHORED, IT IS A CROSSING. The cap's own front is held
// well inside the skull's face surface low down and pushed proud of it high
// up, and wherever the two surfaces cross IS the hairline — so it can never
// drift off the head or leave a seam.
//
// PASS 2 MOVES THAT CROSSING UP 14mm, to a measured 1.880. Pass 1's
// upper facial third was 0.217 of face height against a canonical 0.33, and
// the front render showed it: a cranium that read narrow with the whole face
// crowded into the lower half. faceLandmarks.ts records why the eye line
// cannot move (spec is the law), so the forehead is the only place the third
// can come from: 0.217 of face height becomes a measured 0.239. It stops
// there rather than at the 0.260 a FLAT hairline reached, because the guard
// measures the widow's peak — the lowest point on the line — and a forehead
// 5mm taller is not worth a hairline that renders as a straight edge.
// Measured across x the line now runs 1.881 at the peak, 1.890 at the two
// recessions and 1.883 at the temples: 9mm of shape where there was 3mm.
//
// THE CAP IS ALSO WIDER — 88mm to 92.5mm of half-width over the cranium —
// for the same finding. The skull under it widened with it (head.ts): the
// cap must never be inside the skull anywhere, or a tan line of bare scalp
// runs across the head, which is a trap this file has already sprung once.
//
// THE SWIM CAP is broken by two named devices rather than by noise: six
// strand channels running front-to-back over the crown, and a lock of hair
// standing proud in front of each temple. Named forms beat procedural
// jitter; noise is not detail.
//
// THE FALL, HONESTLY. R1's residual, kept in view rather than fixed away: in
// profile the upper-back outline is HAIR standing ~19mm proud of the torso,
// not the torso's own curve. That is what long hair does and it stays.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Sculptor, SurfacePoint } from './loft'
import type { Station } from './stations'
import { bell, patch } from './faceFields'
import { buildBeard } from './beard'
import { buildTopknot } from './topknot'

const CAP: Station[] = [
  { y: 1.7500, rx: 0.079, rb: 0.107, rf: 0.028, cz: 0.020 },
  { y: 1.7950, rx: 0.084, rb: 0.111, rf: 0.036, cz: 0.022 },
  // The rf column through the crossing band — 38, 60, 70, 82mm — is set
  // AGAINST the skull's own forehead, not on its own. The crossing moves by
  // the push divided by how fast the two fronts converge, and pass 2's first
  // render measured that hairline FLAT to within 3mm: a straight edge with
  // square corners, reading as a hood opening rather than as hair. Flattening
  // the skull's top forehead (head.ts) is what bought the sensitivity back —
  // and pulling this column back too far with it opened a bare-scalp zone
  // from x=32 to x=56, which is the same trap the note below records.
  { y: 1.8350, rx: 0.0915, rb: 0.113, rf: 0.038, cz: 0.022 },
  { y: 1.8600, rx: 0.0925, rb: 0.111, rf: 0.060, cz: 0.022 },
  { y: 1.8700, rx: 0.0905, rb: 0.108, rf: 0.070, cz: 0.021 },
  { y: 1.8830, rx: 0.0845, rb: 0.100, rf: 0.082, cz: 0.020 },
  // The last two are the trap this file keeps springing. R2 pass 1 carried
  // rf 0.076/0.048 and the skull came through as a tan line across the top of
  // the head. Pass 2 fixed that and then sprang it again from the other side:
  // measured per 4mm (x, z) cell above 1.900, the skull's top stood 1.2mm
  // ABOVE the cap's at x=48 z=12, and the three-quarter render showed the
  // sliver. Widened until the same measurement reads clear all round.
  { y: 1.8990, rx: 0.0765, rb: 0.092, rf: 0.098, cz: 0.018 },
  { y: 1.9080, rx: 0.0570, rb: 0.068, rf: 0.076, cz: 0.016 },
]

/** A man's hairline is not a straight edge. Pushing the cap FORWARD on the
 *  centreline drops the crossing into a widow's peak; pulling it BACK over
 *  the temples lifts it into the two recessions either side. */
function hairline(p: SurfacePoint, y: number): void {
  p.z -= 0.0080 * patch(p.x, y - 1.8880, 0.0240, 0.0250)
  for (const side of [-1, 1] as const) {
    p.z += 0.0100 * patch(p.x - side * 0.0520, y - 1.8800, 0.0290, 0.0270)
  }
}

/** Six channels front-to-back over the crown, and a temple lock either side.
 *  The channels fade out below the hairline so they cannot scallop it into a
 *  comb, and the lock is front-only (nz < 0) so it does not also dent the
 *  occiput at the same x. */
const STRANDS = [0.50, -0.50, 1.00, -1.00, 1.52, -1.52]
const STRAND_DEPTH = 0.0038

function capLocks(p: SurfacePoint, y: number): void {
  // Faded at BOTH ends: out below the hairline so the channels cannot scallop
  // it into a comb, and out again approaching the crown, where the cap has
  // the least room over the skull and a 3.8mm channel is what punched
  // through it.
  const fade = Math.min(1, Math.max(0, (y - 1.8400) / 0.0150),
    Math.max(0, (1.9060 - y) / 0.0120))
  if (fade > 0) {
    const theta = Math.atan2(p.nx, -p.nz)
    let depth = 0
    for (const strand of STRANDS) depth += bell((theta - strand) / 0.22)
    p.x -= STRAND_DEPTH * depth * fade * p.nx
    p.z -= STRAND_DEPTH * depth * fade * p.nz
  }
  if (p.nz >= 0) return
  for (const side of [-1, 1] as const) {
    p.z -= 0.0090 * patch(p.x - side * 0.0720, y - 1.8560, 0.0170, 0.0250)
  }
}

function capSculpt(originY: number): Sculptor {
  return (p: SurfacePoint) => {
    const y = p.y + originY
    hairline(p, y)
    capLocks(p, y)
  }
}

// Two levels to its lower edge and a taper between them (R1 pass 5's fix for
// a hair mass that ended in one hard rectangle across the back).
const FALL: Station[] = [
  { y: 1.418, rx: 0.060, rb: 0.036, rf: 0.048, cz: 0.112 },
  { y: 1.470, rx: 0.070, rb: 0.040, rf: 0.052, cz: 0.116 },
  { y: 1.520, rx: 0.080, rb: 0.045, rf: 0.058, cz: 0.118 },
  { y: 1.570, rx: 0.086, rb: 0.048, rf: 0.060, cz: 0.106 },
  { y: 1.640, rx: 0.086, rb: 0.050, rf: 0.058, cz: 0.092 },
  // Pinched at 1.720 as well as swelled at 1.780, because the waist is the
  // point: a fall that simply got wider would move the outline out without
  // putting a corner in it.
  { y: 1.720, rx: 0.0800, rb: 0.050, rf: 0.058, cz: 0.082 },
  // THE ONE BOUNDARY THE RENDER DID NOT HAVE. Measured on pass 2's build the
  // beard's outer half-width ran 84.1mm at y = 1.780 and the fall's 81.6mm at
  // the same height, and above that the beard's 83.9 crossed the cap's 83.9 —
  // three hair masses within two millimetres of each other, in one colour,
  // tangentially. Nothing in the frame could say where the beard ended, so a
  // scorer twice read the whole head as one dark mass with a skin window in
  // it, and that reading was right about the pixels.
  //
  // The fix is what long hair actually does: it hangs OUTSIDE the sideburn.
  // At 88.5mm the fall clears the beard by 4mm through the sideburn band, so
  // the combined silhouette gains a WAIST at the temple — cap 92, fall 88.5,
  // step in to beard 84, then the beard swells again to 88 at the jaw corner.
  // Two lobes with a notch between them, which is two silhouettes.
  { y: 1.780, rx: 0.0885, rb: 0.050, rf: 0.058, cz: 0.078 },
  { y: 1.822, rx: 0.0850, rb: 0.048, rf: 0.056, cz: 0.074 },
  { y: 1.860, rx: 0.070, rb: 0.044, rf: 0.054, cz: 0.068 },
]

/** The gathered tail: on the centreline, inside the fall where they meet,
 *  standing ~18mm proud of the upper back where it passes alone. */
const TAIL: Station[] = [
  { y: 1.300, rx: 0.026, rb: 0.024, rf: 0.032, cz: 0.104 },
  { y: 1.360, rx: 0.034, rb: 0.028, rf: 0.038, cz: 0.110 },
  { y: 1.420, rx: 0.042, rb: 0.032, rf: 0.044, cz: 0.114 },
  { y: 1.480, rx: 0.048, rb: 0.036, rf: 0.048, cz: 0.116 },
]

/** Where the fall's own strand channels run, as angles off the back
 *  centreline. Five named locks, not noise. */
const FALL_STRANDS = [0, 0.62, -0.62, 1.30, -1.30]

const fallStrands: Sculptor = (p: SurfacePoint) => {
  const theta = Math.atan2(p.nx, p.nz)
  let depth = 0
  for (const strand of FALL_STRANDS) depth += bell((theta - strand) / 0.26)
  p.x -= 0.0050 * depth * p.nx
  p.z -= 0.0050 * depth * p.nz
}

export function buildHair(bin: Bin, materials: DuncanMaterials, head: Group, originY: number): void {
  loft(bin, head, FALL, materials.hair, 'hairFall', {
    originY, rings: 34, radial: 40, domeBottomH: 0.024, domeTopH: 0.020, sculpt: fallStrands,
  })
  loft(bin, head, TAIL, materials.hair, 'hairTail', {
    originY, rings: 16, radial: 24, domeBottomH: 0.020, domeTopH: 0.016, sculpt: fallStrands,
  })
  loft(bin, head, CAP, materials.hair, 'hairCap', {
    // 72 x 84, matching the beard. The hairline is an INTERSECTION curve, so
    // its smoothness is the cap's own ring spacing: at 44 rings that spacing
    // was 3.6mm and the crossing could only ever land on one of them, which
    // is a measurable part of why the first pass-2 render showed a straight
    // edge with square corners rather than a hairline.
    originY, rings: 72, radial: 84, domeBottomH: 0.014, domeTopH: 0.018,
    sculpt: capSculpt(originY),
  })
  buildTopknot(bin, materials, head, originY)
  buildBeard(bin, materials, head, originY)
}
