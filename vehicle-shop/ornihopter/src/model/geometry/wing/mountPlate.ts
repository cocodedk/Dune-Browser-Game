// vehicle-shop/ornihopter/src/model/geometry/wing/mountPlate.ts
// The hardware the wing roots bolt to, so the mounting reads as a mechanism
// rather than as eight bobbles glued to a deck.
//
// MEASURED. Wing_support_front.stl (38.72 x 21.55 x 1.81mm) and
// Wing_support_back.stl (36.50 x 20.34 x 1.79mm) are transverse frames: a
// stubby central body with two rectangular spine-tab slots, and FOUR
// outstretched arms, two reaching up-and-out to the deck edge and two
// down-and-out to the flank, each arm ending in a clevis fork. Symmetric about
// the craft's centreline, and their 38.72mm span is the body width itself
// (2 x 19.36mm = 5.19m against OVERALL.bodyWidth's 5.4m) — which is what says
// they are frames across the hull and not rails along it.
//
// What is modelled here is the part of that frame that shows: the SHELF each
// pair of clevis forks stands on, sunk into the hull skin at the arm's own
// seating point, plus the fork's two cheeks. The frame's interior body is
// inside the hull and would never be seen.
//
// Sized off the plate's own proportions rather than eyeballed: the arm tips on
// the front plate are 8.1mm of its 21.55mm height (0.38) and about 10.3mm of
// its 38.72mm span (0.27), which at OVERALL.bodyWidth scale is the 1.4m-ish
// shelf and the 0.5m-ish cheek spacing below.
//
// Emitted as hullBox.ts BoxMesh parts so hullGeometry.ts can merge them into
// the hull's own buffer and they carry the same weathering maps as the skin
// they sit on — the same treatment hullGreebles.ts's plates already get.

import { WING_ROOTS, type WingRootMount } from '../../../spec'
import { buildBox, type BoxMesh, type UvRect } from '../hullBox'
import { MACHINERY_U, TRIM_U } from '../hullUv'
import { seatForMount } from './rootPod'

const rect = (u: readonly [number, number]): UvRect =>
  ({ u0: u[0] + 0.005, u1: u[1] - 0.005, v0: 0.06, v1: 0.94 })

const MACHINERY = rect(MACHINERY_U)
const TRIM = rect(TRIM_U)

/** Half-length of the shelf along the craft's z — the frame's own arm width. */
const SHELF_HALF_Z = 0.72
/** Half-width of the shelf across the arm, and how far it stands proud. */
const SHELF_HALF_SPAN = 0.42
const SHELF_PROUD = 0.16

/** Half-thickness and half-height of one clevis cheek, and how far apart the
 *  pair stands — the fork the wing's hinge eye drops into. */
const CHEEK_HALF_Z = 0.1
const CHEEK_HALF_SPAN = 0.16
const CHEEK_HALF_RISE = 0.28
const CHEEK_GAP = 0.34

/**
 * One arm's visible hardware, mirrored to the given side. A deck arm's shelf
 * lies flat and its cheeks stand up; a flank arm's shelf stands vertical
 * against the side and its cheeks reach outboard. Both are placed at the arm's
 * real hull-surface seat (rootPod.ts's seatForMount), never at a guessed
 * coordinate — the discipline the root pods themselves already follow.
 */
function buildArm(mount: WingRootMount, mirror: 1 | -1): BoxMesh[] {
  const seat = seatForMount(mount)
  const deck = mount.arm === 'deck'
  const x = mirror * seat.x
  const out: BoxMesh[] = []

  if (deck) {
    out.push(buildBox(
      { x, y: seat.y + SHELF_PROUD / 2 - 0.02, z: mount.z },
      { x: SHELF_HALF_SPAN, y: SHELF_PROUD / 2 + 0.06, z: SHELF_HALF_Z },
      MACHINERY, 'py', TRIM,
    ))
    for (const side of [1, -1] as const) {
      out.push(buildBox(
        { x, y: seat.y + SHELF_PROUD + CHEEK_HALF_RISE - 0.04, z: mount.z + side * CHEEK_GAP },
        { x: CHEEK_HALF_SPAN, y: CHEEK_HALF_RISE, z: CHEEK_HALF_Z },
        MACHINERY,
      ))
    }
    return out
  }

  out.push(buildBox(
    { x: x + mirror * (SHELF_PROUD / 2 - 0.02), y: seat.y, z: mount.z },
    { x: SHELF_PROUD / 2 + 0.06, y: SHELF_HALF_SPAN, z: SHELF_HALF_Z },
    MACHINERY, mirror === 1 ? 'px' : 'nx', TRIM,
  ))
  for (const side of [1, -1] as const) {
    out.push(buildBox(
      { x: x + mirror * (SHELF_PROUD + CHEEK_HALF_RISE - 0.04), y: seat.y, z: mount.z + side * CHEEK_GAP },
      { x: CHEEK_HALF_RISE, y: CHEEK_HALF_SPAN, z: CHEEK_HALF_Z },
      MACHINERY,
    ))
  }
  return out
}

/** Every arm's hardware, both sides, ready for hullGeometry.ts to concatenate. */
export function buildWingMountPlates(): BoxMesh[] {
  return WING_ROOTS.flatMap((mount) =>
    ([1, -1] as const).flatMap((mirror) => buildArm(mount, mirror)))
}
