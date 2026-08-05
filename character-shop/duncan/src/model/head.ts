// character-shop/duncan/src/model/head.ts
// Neck, skull and the two forms that declare which way a face points.
// Tables are in stature metres against bodyPlan's landmarks; loft.ts offsets
// them by the head group's own height (the chin).
//
// What pass 4 fixed here, in order of how badly it read:
//
// 1. SIZE. The old head measured 167mm crown-to-chin on a 1.93m figure —
//    11.6 head-units, a doll's head over a wall of shoulders, and the real
//    reason nothing above the waist could be made to look human. The skull
//    loft now spans exactly LM.headH (251mm, 7.69 head-units, spec's own
//    mid-band) between its two dome apexes.
// 2. NECK. There was none: an 82mm stub, most of it swallowed by a jaw blob.
//    The neck is now a lofted column ~446mm in circumference (Momoa's is
//    ~450mm) standing ~60mm clear between the collar rim and the beard.
// 3. THE PADDLE. A skin-toned brow ellipsoid used to float clear of a hair
//    ball that had swallowed the entire face — at bust range it read as a
//    tab stuck to the side of the head. The skull is now a real lofted head
//    with a jaw, cheekbones and a cranium; the brow sits ON it, 16mm proud,
//    and the ears are small and where ears go.
//
// The NOSE stays the frontmost geometry on the head — 110mm forward of the
// head's own axis against the brow's 92mm and the cheek's 80mm — which is
// what seam.test.ts's face-toward--Z guard rests on.

import { Group } from 'three'
import type { DuncanMaterials } from './materials'
import { blob } from './primitives'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'
import { LM } from './bodyPlan'
import { buildHair } from './hair'

const NECK: Station[] = [
  { y: 1.480, rx: 0.100, rb: 0.100, rf: 0.088, cz: 0.012 },
  { y: 1.535, rx: 0.082, rb: 0.086, rf: 0.072, cz: 0.014 },
  { y: 1.585, rx: 0.073, rb: 0.076, rf: 0.062, cz: 0.014 },
  { y: 1.635, rx: 0.069, rb: 0.073, rf: 0.058, cz: 0.014 },
  { y: 1.690, rx: 0.062, rb: 0.068, rf: 0.052, cz: 0.012 },
]

// Jaw, jaw angle, cheekbone, eye line, brow, forehead, cranium. The bottom
// dome closes on the chin at LM.chin and the top dome on the crown, so the
// mesh's own bounding height IS the spec'd head height — the number
// proportions.test.ts measures.
const SKULL: Station[] = [
  { y: 1.690, rx: 0.066, rb: 0.066, rf: 0.072, cz: 0.008 },
  { y: 1.712, rx: 0.074, rb: 0.078, rf: 0.082, cz: 0.008 },
  { y: 1.740, rx: 0.077, rb: 0.084, rf: 0.086, cz: 0.008 },
  { y: 1.770, rx: 0.079, rb: 0.089, rf: 0.088, cz: 0.008 },
  { y: LM.eye, rx: 0.080, rb: 0.093, rf: 0.086, cz: 0.008 },
  { y: 1.830, rx: 0.079, rb: 0.095, rf: 0.084, cz: 0.008 },
  { y: 1.858, rx: 0.075, rb: 0.094, rf: 0.076, cz: 0.010 },
  { y: 1.888, rx: 0.060, rb: 0.078, rf: 0.060, cz: 0.012 },
]
const CHIN_DOME = 1.690 - LM.chin // 24.4mm
const CROWN_DOME = LM.crown - 1.888 // 28.5mm

// Nose. Pass 5: the bridge used to hold -0.084 all the way up to the brow's
// own -0.083, so in profile brow and nose ran out to the same depth as one
// near-horizontal shelf — the "beak". The top station now RECEDES to -0.072,
// 11mm behind the brow, which is the nasion: the dip every human profile has
// between the brow ridge and the bridge of the nose. The tip still leads
// everything on the head at -0.098.
const NOSE: Station[] = [
  { y: 1.750, rx: 0.024, rb: 0.014, rf: 0.036, cz: -0.058 }, // front -0.094
  { y: 1.766, rx: 0.022, rb: 0.014, rf: 0.038, cz: -0.060 }, // front -0.098
  { y: 1.790, rx: 0.018, rb: 0.012, rf: 0.030, cz: -0.058 }, // front -0.088
  { y: 1.816, rx: 0.014, rb: 0.010, rf: 0.020, cz: -0.052 }, // front -0.072
]

// Brow: heavy, but PAIRED and tilted, not one bar. A single lens 72mm wide
// read first as a flying saucer and then, once shrunk, as sunglasses — an
// unbroken horizontal band across a face with no eyes in it yet reads as
// eyewear. Two ridges with a 4mm glabella gap between them, each dropping
// ~7 degrees toward its outer end, read as brows. Both stay behind the
// nose: front reach -79mm against the nose tip's -98mm, with the nasion dip
// between them so the two do not read as one horizontal shelf in profile.
const BROW = { rx: 0.040, ry: 0.018, rz: 0.015, x: 0.040, y: 1.822, z: -0.064, tilt: 0.13 }
const EAR = { rx: 0.010, ry: 0.026, rz: 0.018, x: 0.078, y: 1.796, z: 0.030 }

export function buildHead(bin: Bin, materials: DuncanMaterials): Group {
  const head = new Group()
  head.name = 'head'
  const originY = LM.chin
  const at = (y: number): number => y - originY

  // Hair first: it wraps the skull from behind and must never be the thing
  // in front. The face forms land on top of it, forward and below.
  buildHair(bin, materials, head, originY)

  loft(bin, head, NECK, materials.skin, 'neck', { originY, rings: 24, radial: 26 })
  loft(bin, head, SKULL, materials.skin, 'skull', {
    originY, rings: 40, radial: 30, domeBottomH: CHIN_DOME, domeTopH: CROWN_DOME,
  })
  loft(bin, head, NOSE, materials.skin, 'nose', {
    originY, rings: 16, radial: 20, domeBottomH: 0.012, domeTopH: 0.008,
  })

  for (const side of [-1, 1] as const) {
    const brow = blob(bin, head, BROW.rx, BROW.ry, BROW.rz, materials.skin,
      side * BROW.x, at(BROW.y), BROW.z, 'brow')
    brow.rotation.z = -BROW.tilt * side
    blob(bin, head, EAR.rx, EAR.ry, EAR.rz, materials.skin,
      side * EAR.x, at(EAR.y), EAR.z, 'ear')
  }

  return head
}
