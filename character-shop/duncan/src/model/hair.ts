// character-shop/duncan/src/model/hair.ts
// PALETTE.hair volumes: the beard, the cap over the cranium, the fall down
// the back, the half-tie knot. spec.ts COSTUME.head names all four, and the
// beard in particular is a NAMED identity trait — the last critic's verdict
// was that it did not read at all.
//
// The old beard was one hair-coloured ellipsoid centred on the same place as
// the jaw ellipsoid, so it changed no outline anywhere; the old hair cap was
// a sphere 106mm wide against a 93mm skull, which swallowed the entire face
// and left a brow and a nose poking out of a ball of hair.
//
// Both are now lofts shaped by what a beard and a hairline actually do:
//   - The beard is FRONT-WEIGHTED (rf up to 94mm against rb 24mm at its
//     bottom), so it is a mass hanging off the jaw rather than a sphere
//     around it, it hangs 52mm BELOW the chin, and it is 10-12mm wider than
//     the skull along the jawline — it lengthens and widens the lower-face
//     silhouette, which is the read that was missing.
//   - The cap's own front is held 15-40mm INSIDE the skull's face surface
//     below 1.86m and pushed proud above it, so the surfaces cross at a
//     hairline about 45mm above the brow, and the forehead is bare.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import { blob } from './primitives'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'
import { LM } from './bodyPlan'

// Pass 5: the back column is pulled in below the jaw angle (rb 0.018/0.024/
// 0.030 where it was 0.024/0.030/0.038), so the beard's own rear edge sits
// well forward of the neck's and a skin SLIVER of neck survives behind it in
// profile — the read a critic found missing. Above the jaw angle the back
// column climbs to meet the hair, which is where a beard really does merge
// into a sideburn.
const BEARD: Station[] = [
  { y: 1.628, rx: 0.052, rb: 0.018, rf: 0.060, cz: 0.004 },
  { y: 1.656, rx: 0.070, rb: 0.024, rf: 0.082, cz: 0.006 },
  { y: 1.684, rx: 0.083, rb: 0.030, rf: 0.094, cz: 0.008 },
  { y: 1.712, rx: 0.090, rb: 0.042, rf: 0.092, cz: 0.010 },
  { y: 1.742, rx: 0.086, rb: 0.062, rf: 0.076, cz: 0.012 },
  { y: 1.772, rx: 0.076, rb: 0.078, rf: 0.052, cz: 0.012 },
]

const CAP: Station[] = [
  { y: 1.745, rx: 0.081, rb: 0.100, rf: 0.034, cz: 0.022 },
  { y: 1.790, rx: 0.088, rb: 0.106, rf: 0.048, cz: 0.024 },
  { y: 1.830, rx: 0.088, rb: 0.108, rf: 0.060, cz: 0.024 },
  { y: 1.860, rx: 0.084, rb: 0.104, rf: 0.072, cz: 0.022 },
  { y: 1.888, rx: 0.076, rb: 0.096, rf: 0.082, cz: 0.020 },
  { y: 1.9065, rx: 0.050, rb: 0.068, rf: 0.058, cz: 0.018 },
]

// Lies ON the nape and the upper back rather than floating behind them: its
// front is buried inside the neck and the ribcage, its back stands ~18mm
// proud of whichever of them it is passing — and pass 5 had to raise cz all
// the way down, because torso.ts's new thoracic curve carries the back out
// to 0.144 where it used to sit at 0.128.
//
// Pass 5 also breaks the SLAB. One loft ending in one rounded cap gave the
// back view a hair mass with a single hard edge across it — a rectangle. The
// broad fall now stops at 1.394 and a narrower TAIL carries on down the
// centreline to 1.280, so the lower edge has two levels and a taper between
// them.
//
// The first attempt at that put two shorter HANKS outboard of the fall, and
// the render was unambiguous about it: from the front they were two black
// blocks flanking the jaw, 36mm outside the head's own silhouette — ear
// flaps. Anything that breaks the outline has to break it ON the centreline,
// where hair gathered at the nape actually hangs.
const FALL: Station[] = [
  { y: 1.418, rx: 0.060, rb: 0.036, rf: 0.048, cz: 0.112 },
  { y: 1.470, rx: 0.070, rb: 0.040, rf: 0.052, cz: 0.116 },
  { y: 1.520, rx: 0.080, rb: 0.045, rf: 0.058, cz: 0.118 },
  { y: 1.570, rx: 0.086, rb: 0.048, rf: 0.060, cz: 0.106 },
  { y: 1.640, rx: 0.086, rb: 0.050, rf: 0.058, cz: 0.092 },
  { y: 1.720, rx: 0.084, rb: 0.050, rf: 0.058, cz: 0.082 },
  { y: 1.800, rx: 0.080, rb: 0.050, rf: 0.058, cz: 0.076 },
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

// The knot is the only geometry allowed to reach stature height, and it does
// so exactly: 1.894 + 0.036 = LM.hairTop = PROPORTIONS.heightM.
const KNOT = { rx: 0.042, ry: 0.036, rz: 0.042, y: LM.hairTop - 0.036, z: 0.084 }

export function buildHair(bin: Bin, materials: DuncanMaterials, head: Group, originY: number): void {
  loft(bin, head, FALL, materials.hair, 'hairFall', {
    originY, rings: 34, radial: 26, domeBottomH: 0.024, domeTopH: 0.020,
  })
  loft(bin, head, TAIL, materials.hair, 'hairTail', {
    originY, rings: 16, radial: 20, domeBottomH: 0.020, domeTopH: 0.016,
  })
  loft(bin, head, CAP, materials.hair, 'hairCap', {
    originY, rings: 28, radial: 30, domeBottomH: 0.014, domeTopH: 0.018,
  })
  loft(bin, head, BEARD, materials.hair, 'beard', {
    originY, rings: 30, radial: 28, domeBottomH: 0.014, domeTopH: 0.010,
  })
  blob(bin, head, KNOT.rx, KNOT.ry, KNOT.rz, materials.hair,
    0, KNOT.y - originY, KNOT.z, 'topknot')
}
