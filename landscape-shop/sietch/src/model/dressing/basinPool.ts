// landscape-shop/sietch/src/model/dressing/basinPool.ts
// WATER DISCIPLINE, as geometry. provenance.ts: "the basin is small,
// contained, precious — never a pond." Two authored forms at
// DRESSING.basinAtM, no feedstock involved:
//
//   basinKerb   a low tapered stone rim, cut from the hall's own worn
//               stone (materials.stoneWorn). Fremen would not leave water
//               lying against open floor.
//   basinWater  the pool inside it — 1.6 m across, about 8 m2 in a 36 m
//               hall, which is the whole point.
//
// BOTH NUMBERS ARE SIGHT-LINE NUMBERS, not taste. CAMERA_RIG stands at
// y = 2.4 and 30 m away, so the line of sight arrives at the basin only
// 0.16 m above the floor: a kerb any taller than KERB_HEIGHT_M hides its
// own pool completely, and water any lower than the kerb's top is a rim
// with nothing in it. Measured by shooting it, not by assuming.
//
// The pool is a shallow cylinder rather than a plane so that it MEETS the
// floor: a plane floating 0.15 m up would fail the contact guard in
// dressing.test.ts, and rightly — floating water is the most obviously
// wrong thing a set can contain. It is filled to within a centimetre of
// the kerb's top, because at a 0.17 m sight line every centimetre of
// freeboard costs about a metre of visible surface.

import { CylinderGeometry, Group, Mesh } from 'three'
import { DRESSING } from '../../spec'
import type { PaletteMaterials } from '../materials'
import type { DressingMaterials } from './dressingMaterials'

const KERB_TOP_RADIUS_M = 1.78
const KERB_BASE_RADIUS_M = 1.98
const KERB_HEIGHT_M = 0.16
const KERB_SEGMENTS = 22

const POOL_RADIUS_M = 1.62
const POOL_DEPTH_M = 0.15
const POOL_SEGMENTS = 20

export function buildBasinPool(hall: PaletteMaterials, dressing: DressingMaterials): Group {
  const [x, , z] = DRESSING.basinAtM
  const group = new Group()
  group.name = 'basinPool'

  // Open-ended: a tube, seen from both sides, is a kerb. A solid drum
  // would be a plinth and would hide the water it is meant to hold.
  const kerb = new Mesh(
    new CylinderGeometry(KERB_TOP_RADIUS_M, KERB_BASE_RADIUS_M, KERB_HEIGHT_M, KERB_SEGMENTS, 1, true),
    hall.stoneWorn,
  )
  kerb.name = 'basinKerb'
  kerb.userData.supportY = 0
  kerb.position.set(x, KERB_HEIGHT_M / 2, z)
  group.add(kerb)

  const water = new Mesh(
    new CylinderGeometry(POOL_RADIUS_M, POOL_RADIUS_M * 0.95, POOL_DEPTH_M, POOL_SEGMENTS),
    dressing.water,
  )
  water.name = 'basinWater'
  water.userData.supportY = 0
  water.position.set(x, POOL_DEPTH_M / 2, z)
  group.add(water)

  return group
}
