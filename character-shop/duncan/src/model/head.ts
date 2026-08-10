// character-shop/duncan/src/model/head.ts
// Neck, skull, ears — and the one loft that carries an entire face.
//
// There are no separate feature parts. The nose loft is gone; brow, sockets,
// lids, nose, lips, chin, cheekbones and jaw are all one summed displacement
// field carved into the skull's own surface (faceSculpt.ts), which is why the
// skull is sampled at 96 rings by 108 radial segments — 5mm arc spacing at
// the cheek, 2.6mm between rings, the resolution a lip crease needs. Only the
// eyeballs, the lids and the brow hair sit on top of it, and eyes.ts, lids.ts
// and brows.ts each argue their own case.
//
// PASS 2 CHANGED TWO THINGS IN THE TABLES BELOW, both from the front render.
//
//   THE CRANIUM WAS NARROW. Read down the old rx column above the eye line —
//   80, 78.5, 77, 72, 60mm — against 82mm at the cheekbone: the skull fell
//   away fast enough that the head read as a face with a small dome on it.
//   It now holds 80mm to 1.856 before it turns. The cheekbone is UNTOUCHED:
//   face.test.ts caps bizygomatic breadth at 0.70 of head height and it
//   already measures 0.673, so every millimetre of width this round buys has
//   to come from above the zygion, never from it.
//
//   THE NECK WAS SLENDER where it meets the beard and collar — 124mm across
//   at 1.635 under a 169mm head on a man built like a wall. +9mm of radius
//   in the head-blend region only; nothing below 1.535 moves, and the R1
//   sliver of neck visible behind the beard in profile grows rather than
//   shrinks, because the back column grew with the rest.
//
// The ear is a small LOFT rather than a scaled sphere: an ellipsoid lying
// flat against the skull reads as a paddle at three-quarter framing, and the
// cheapest thing that does not is a tapered form with a lobe, a wider middle
// and a helix top, yawed away from the skull so its outer edge stands off it.

import { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'
import { LM } from './bodyPlan'
import { buildHair } from './hair'
import { buildEyes } from './eyes'
import { frontZAt, sculptFace } from './faceSculpt'
import { FACE } from './faceLandmarks'

const NECK: Station[] = [
  { y: 1.480, rx: 0.100, rb: 0.100, rf: 0.088, cz: 0.012 },
  { y: 1.535, rx: 0.085, rb: 0.088, rf: 0.075, cz: 0.014 },
  { y: 1.585, rx: 0.0780, rb: 0.079, rf: 0.067, cz: 0.014 },
  { y: 1.635, rx: 0.0775, rb: 0.078, rf: 0.064, cz: 0.014 },
  { y: 1.690, rx: 0.0715, rb: 0.075, rf: 0.060, cz: 0.012 },
]

const SKULL: Station[] = [
  { y: 1.6740, rx: 0.034, rb: 0.030, rf: 0.070, cz: 0.010 }, // chin
  { y: 1.6905, rx: 0.048, rb: 0.048, rf: 0.074, cz: 0.010 },
  { y: 1.7050, rx: 0.056, rb: 0.062, rf: 0.072, cz: 0.010 },
  { y: FACE.gonion, rx: 0.0705, rb: 0.078, rf: 0.074, cz: 0.010 }, // jaw angle
  { y: 1.7340, rx: 0.0745, rb: 0.088, rf: 0.076, cz: 0.010 },
  { y: FACE.subnasale, rx: 0.0765, rb: 0.096, rf: 0.078, cz: 0.010 },
  { y: 1.7800, rx: 0.0800, rb: 0.101, rf: 0.080, cz: 0.010 },
  { y: FACE.zygion, rx: 0.0820, rb: 0.104, rf: 0.081, cz: 0.010 }, // widest
  { y: FACE.eye, rx: 0.0815, rb: 0.105, rf: 0.081, cz: 0.010 },
  { y: 1.8235, rx: 0.0810, rb: 0.104, rf: 0.080, cz: 0.010 },
  { y: 1.8360, rx: 0.0805, rb: 0.102, rf: 0.079, cz: 0.010 },
  { y: 1.8560, rx: 0.0800, rb: 0.099, rf: 0.079, cz: 0.010 },
  // rf at 1.8900 was 0.059, which made the forehead fall away at 1.35mm per
  // mm of height just where the hairline crosses it. Two costs, one cause:
  // the hairline could not be SHAPED (hair.ts records the arithmetic), and
  // the upper facial third stayed short because the crossing had nowhere to
  // climb to. A flatter top forehead fixes both.
  { y: 1.8780, rx: 0.0765, rb: 0.092, rf: 0.076, cz: 0.010 },
  { y: 1.8900, rx: 0.0660, rb: 0.084, rf: 0.070, cz: 0.010 },
]
const CHIN_DOME = 1.6740 - LM.chin
const CROWN_DOME = LM.crown - 1.8900

/** The ear's own axis, in its own frame: lobe, a wider middle, helix top. */
const EAR: Station[] = [
  { y: -0.0230, rx: 0.0048, rb: 0.0055, rf: 0.0072 },
  { y: -0.0080, rx: 0.0068, rb: 0.0105, rf: 0.0125 },
  { y: 0.0070, rx: 0.0072, rb: 0.0125, rf: 0.0130 },
  { y: 0.0230, rx: 0.0056, rb: 0.0100, rf: 0.0084 },
]
/** Top on the brow line, lobe on the nose base, yawed off the skull. */
const EAR_AT = { x: 0.0800, y: 1.7960, z: 0.0295, yaw: 0.38 }

function buildEar(bin: Bin, materials: DuncanMaterials, head: Group, originY: number, side: -1 | 1): void {
  const ear = loft(bin, head, EAR, materials.skin, 'ear', {
    rings: 18, radial: 20, domeBottomH: 0.0070, domeTopH: 0.0070,
  })
  // Baked, not carried — see ridge.ts for what a carried rotation costs the
  // guards that measure these boxes.
  ear.geometry.rotateY(-side * EAR_AT.yaw)
  ear.geometry.translate(side * EAR_AT.x, EAR_AT.y - originY, EAR_AT.z)
}

export function buildHead(bin: Bin, materials: DuncanMaterials): Group {
  const head = new Group()
  head.name = 'head'
  const originY = LM.chin

  // Hair first: it wraps the skull from behind and must never be the thing
  // in front. The face forms land on top of it, forward and below.
  buildHair(bin, materials, head, originY)

  const sculpt = sculptFace(originY)
  loft(bin, head, NECK, materials.skin, 'neck', { originY, rings: 24, radial: 26 })
  loft(bin, head, SKULL, materials.skin, 'skull', {
    originY, rings: 96, radial: 108, domeBottomH: CHIN_DOME, domeTopH: CROWN_DOME, sculpt,
  })

  for (const side of [-1, 1] as const) buildEar(bin, materials, head, originY, side)

  // Everything laid on the face asks the same question the loft answered:
  // where is the skin at this x and y? Nothing here carries a hand-written
  // depth (see eyes.ts for what that cost on the first render).
  buildEyes(bin, materials, head, originY, (x, y) => frontZAt(SKULL, sculpt, originY, x, y))
  return head
}
