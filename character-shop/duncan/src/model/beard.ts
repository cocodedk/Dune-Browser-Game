// character-shop/duncan/src/model/beard.ts
// A full beard is not a mask laid over the jaw — it is the LOWER FACE's
// silhouette. A station table for the mass, and a sculptor for the four
// things a mass alone cannot say.
//
// PASS 1 SHIPPED A SMOOTH ROUNDED BLOB and the critic's top secondary note
// was that it buried both the mouth and the jaw. Everything below answers
// that, and the two structural fixes are both PLATEAUS rather than bells:
//
//   1. THE MOUTH. A bell-shaped aperture only ever opens fully at ONE height;
//      above and below it the opening pinches, which is why pass 1 showed
//      12.5mm of skin — all of it under the lip line — and no upper lip at
//      all. A plateau holds the whole opening across the lip line and then
//      closes, and paired corner patches bring the beard back in at the ends
//      so the opening is a lens with points rather than a hole with a rim.
//   2. THE MOUSTACHE, same reason. Pass 1's bell cleared the skin over a
//      7.5mm band and rendered as a thin bar; measured against the skull's
//      own column it needed 14-22mm of push at DIFFERENT heights, which no
//      bell delivers. The plateau covers 1.7465-1.7585 and stops short of
//      the nose base, leaving ~8mm of upper lip showing under it.
//   3. DENSITY AND SQUARENESS AT THE CHIN — one broad centre mass plus two
//      corners, forward and outward, so the chin block reads as a block.
//   4. THE GONIAL CORNER. A local 5.5mm outward shoulder at the jaw angle,
//      with the table narrowed either side of it, is what makes the jaw
//      legible THROUGH the hair instead of the hair swallowing it.
//
// The table also protects a hard-won R1 result: its back column is held far
// forward of the neck's, so in profile a sliver of NECK survives behind the
// beard instead of hair running straight into the collar.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Sculptor, SurfacePoint } from './loft'
import type { Station } from './stations'
import { bell, patch, plateau } from './faceFields'

/** PASS 3 SQUARES THE LOWER SILHOUETTE. Measured off pass 2's build, the
 *  beard's outer half-width ran 88.2mm at the gonion and then fell at a
 *  near-constant 0.37mm per mm all the way to the chin: 84.1 / 80.7 / 78.7 /
 *  76.1 / 73.3. A constant slope is an ARC, and an arc under a beard is a
 *  face-shaped bag — which is exactly the note the scorer kept returning, that
 *  the face reads as a small skin window in one dark rounded mass.
 *
 *  A square jaw has a CORNER: the width holds down past the angle and then
 *  turns. Two stations are added between the old chin and jaw rows so the
 *  table can say that, and the corner now measures as a slope that goes 0.4 /
 *  0.8 / 0.9 across three bands instead of 0.37 three times. */
const BEARD: Station[] = [
  { y: 1.6420, rx: 0.0505, rb: 0.026, rf: 0.066, cz: 0.006 }, // 24mm below the chin
  { y: 1.6600, rx: 0.0665, rb: 0.032, rf: 0.082, cz: 0.006 },
  { y: 1.6760, rx: 0.0790, rb: 0.039, rf: 0.089, cz: 0.008 }, // chin
  { y: 1.6900, rx: 0.0845, rb: 0.048, rf: 0.091, cz: 0.009 }, // THE CORNER
  { y: 1.7050, rx: 0.0846, rb: 0.057, rf: 0.092, cz: 0.010 },
  { y: 1.7200, rx: 0.0830, rb: 0.066, rf: 0.090, cz: 0.010 }, // jaw angle
  // Narrowed 1.8-1.5mm through the sideburn's own band so the WAIST hair.ts
  // builds at the temple has something to be a waist of. The skull under it
  // is 75.6-78.7mm here, so this still leaves 4-6mm of shell — measured, not
  // assumed: a beard that goes inside the cheek is bare skin in the render.
  { y: 1.7450, rx: 0.0812, rb: 0.082, rf: 0.086, cz: 0.010 },
  { y: 1.7700, rx: 0.0825, rb: 0.094, rf: 0.080, cz: 0.010 },
  { y: 1.7920, rx: 0.0840, rb: 0.100, rf: 0.050, cz: 0.010 },
  { y: 1.8080, rx: 0.0830, rb: 0.102, rf: 0.030, cz: 0.010 }, // sideburn into the hair
]

const SIDES = [-1, 1] as const

/** Positive = back into the head, as in faceSculpt.ts.
 *
 *  BOTH PAIRED FORMS BELOW SUM ON THE CENTRELINE and the amplitudes are
 *  chosen knowing it. Measured on the built surface, a first attempt at 24mm
 *  a side put the moustache 31mm proud of the upper lip — a black wedge
 *  projecting nearly as far as the nose does, because the two patches
 *  overlap at x = 0 and each was sized as if it were alone. At 15mm a side
 *  the same measurement reads ~10mm over the lip and ~18mm at the wings,
 *  which is a moustache. Numbers here are set from the vertex grid, not from
 *  what looks reasonable in the table. */
function beardRelief(x: number, y: number): number {
  let fwd = 0.0185 * plateau(x, y - 1.7340, 0.0450, 0.0120, 0.55)
  for (const side of SIDES) {
    fwd -= 0.0090 * patch(x - side * 0.0430, y - 1.7350, 0.0140, 0.0125)
  }
  fwd -= 0.0150 * patch(x, y - 1.6930, 0.0330, 0.0300)
  for (const side of SIDES) {
    fwd -= 0.0105 * patch(x - side * 0.0300, y - 1.6890, 0.0235, 0.0260)
    fwd -= 0.0150 * plateau(x - side * 0.0185, y - 1.7500, 0.0285, 0.0115, 0.50, -0.20 * side)
  }
  // The philtrum is the one place hair should thin, and the pair overlap on
  // the centreline, so the notch has to be cut back in.
  fwd += 0.0024 * patch(x, y - 1.7530, 0.0050, 0.0090)
  return fwd
}

/** The mandible's own lower border, as a height against |x|: gonion (68.5mm
 *  out, 1.7190) forward and down to the chin's corner (8mm out, 1.6790). The
 *  bone the beard is a shell over — everything in jawPlanes() is a distance
 *  from this line. */
function jawBorder(x: number): number {
  return 1.6790 + Math.min(Math.abs(x), 0.0685) * 0.6612
}

/** THE JAW, READ THROUGH THE HAIR. Positive = outward.
 *
 *  Measured on pass 2's build, the beard's shell thickness over the skull at
 *  any ONE height varied by about 1.5mm across the entire flank — 8.27 / 9.74
 *  / 8.99 / 9.73mm at the gonion line, and 25 / 28 / 33 / 34 / 38mm under the
 *  chin. Thickness that tracks height and ignores WHERE THE BONE IS is a bag
 *  with a face-shaped hole in it, and no amount of surface strand detail fixes
 *  a bag. Hair lies thin over a crest and collects in the hollow under it, and
 *  that difference is the only thing that can put a mandible inside a beard.
 *
 *  So: thin ON the border, thick 12.5mm BELOW it, both windowed to the jaw's
 *  own span so the chin block and the sideburn keep their own masses. The
 *  swing is 6.6mm over about 12mm of height, which is the plane break — the
 *  brief asked for 4-8 and the built surface is re-measured for it. */
const JAW = { at: 0.0500, span: 0.0520, thin: 0.0040, fill: 0.0038, drop: 0.0135, soft: 0.0095 }

function jawPlanes(x: number, y: number): number {
  const window = bell((Math.abs(x) - JAW.at) / JAW.span)
  if (window === 0) return 0
  const d = y - jawBorder(x)
  return window * (JAW.fill * bell((d + JAW.drop) / JAW.soft) - JAW.thin * bell(d / JAW.soft))
}

/** Positive = outward along the section's own normal. */
function beardMass(x: number, y: number): number {
  let out = jawPlanes(x, y)
  for (const side of SIDES) {
    out += 0.0055 * patch(x - side * 0.0790, y - 1.7215, 0.0250, 0.0165)
    out += 0.0045 * patch(x - side * 0.0330, y - 1.6890, 0.0200, 0.0200)
    // The hollow that makes the gonial corner a CORNER rather than the top of
    // a curve: without something taken away just inboard and below it, the
    // 5.5mm shoulder above only fattens the same arc it was meant to break.
    out -= 0.0038 * patch(x - side * 0.0700, y - 1.6960, 0.0250, 0.0150)
  }
  return out
}

/** Four named channels down the beard's flanks — the same device hair.ts
 *  uses on the fall, for the same reason: a mass of hair has locks, and a
 *  procedurally jittered surface is not detail. Nothing near the centreline,
 *  where the chin block has to stay a block, and nothing above the mouth. */
const STRANDS = [0.44, -0.44, 0.98, -0.98]
const STRAND_DEPTH = 0.0034
const STRAND_TOP = 1.7250

function beardStrands(p: SurfacePoint, y: number): void {
  if (y > STRAND_TOP) return
  const theta = Math.atan2(p.nx, -p.nz)
  let depth = 0
  for (const strand of STRANDS) depth += bell((theta - strand) / 0.22)
  if (depth === 0) return
  const fade = Math.min(1, (STRAND_TOP - y) / 0.0180)
  p.x -= STRAND_DEPTH * depth * fade * p.nx
  p.z -= STRAND_DEPTH * depth * fade * p.nz
}

export function buildBeard(bin: Bin, materials: DuncanMaterials, head: Group, originY: number): void {
  const sculpt: Sculptor = (p: SurfacePoint) => {
    const y = p.y + originY
    p.z += beardRelief(p.x, y)
    const out = beardMass(p.x, y)
    p.x += out * p.nx
    p.z += out * p.nz
    beardStrands(p, y)
  }
  loft(bin, head, BEARD, materials.hair, 'beard', {
    originY, rings: 72, radial: 84, domeBottomH: 0.016, domeTopH: 0.010, sculpt,
  })
}
