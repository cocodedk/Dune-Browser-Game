// vehicle-shop/ornihopter/src/interior/cabinShell.ts
// The interior liner: floor, a rear bulkhead closing the cockpit off from the
// larger cabin behind it (per docs/info.md), and — built in cabinShellWall.ts,
// split out in round 4b.2 to stay under this file's 200-line cap — side-wall
// panels whose TOP edge tapers to the canopy's OWN sill line
// (model/geometry/canopyGeometry.ts's canopySectionAt) instead of sitting at
// one constant half-width. See cabinShellWall.ts's own header for the wall's
// round 2/3/4b.2 history; this file's history below is the floor and
// bulkhead's alone.
//
// FOUND, round 4b: the floor and bulkhead were still flat boxes at a constant
// COCKPIT.clearWidth (4.9m) regardless of the hull's own taper — the one
// number round 4's hull rebuild never touched. With the new tucked-belly pod,
// the hull's chine half-width is only 2.19-2.38m over the cabin, and far less
// at the floor's own height, well below the chine — so the floor and
// bulkhead's constant 2.45m half-width corners hung outside the hull skin
// entirely, rendering as a black tray and wall below and beside the pod in
// every exterior capture. Both are now built the same way the side walls
// already were: from the hull's own section, via hullSection.ts's
// hullInteriorHalfWidthAt/hullSectionBreakpoints, which read hullHalfWidthAt/
// hullHalfHeightAt/hullKeelYAt/hullShapeAt and buildRing — the SAME numbers
// hullLoft.ts's visible mesh and hullProfile.ts's isOutsideHull use, so this
// liner cannot land anywhere the actual hull surface does not. See
// hullSection.ts's own header for why "just read the hull's half-width" was
// not quite enough on its own (the keel and deck are flat caps, not points),
// and this round's report for the measured before/after numbers.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { WALL, FLOOR_FRONT_Z, FLOOR_REAR_Z } from './layout'
import { hullInteriorHalfWidthAt, hullSectionBreakpoints } from './hullSection'
import { flatQuad, disposeGroup, type Placed } from './sceneUtils'
import { hullLinerMaterial } from './materials'
import { buildSideWall } from './cabinShellWall'

// Fine enough that hullInteriorHalfWidthAt's steepest rise (the nose
// crossover where the hull first grows deep enough to reach COCKPIT.floorY
// at all — see hullSection.ts) reads as a wedge, not a visible step.
const FLOOR_SEGMENTS = 24

/**
 * The cabin floor: a tapered plate whose half-width at every z comes from the
 * hull's own interior AT THE FLOOR'S OWN HEIGHT (COCKPIT.floorY) — not the
 * chine's, which sits well above it. Segmented rather than one quad per side
 * because that width is not linear in z (hullSection.ts); more segments track
 * the true curve more closely, and a straight chord between two hull-safe
 * samples can only fall short of the hull, never past it.
 *
 * A segment is only drawn when BOTH ends independently come back positive —
 * NOT "either end, pinching the other to x=0" (round 4b's own first attempt,
 * and its own bug: hullInteriorHalfWidthAt returning 0 means "do not trust a
 * width here", not "x=0 is a safe vertex here"; the two are different claims,
 * and only the segment-drop below checks the one that actually matters — see
 * hullSection.ts's header). The floor's forward-most reach therefore stops a
 * short, flat step behind the true nose crossover rather than tapering to a
 * point at it — safe over exact, since the point itself was never safe.
 */
function buildFloor(): Group {
  const group = new Group()
  group.name = 'floor'
  const material = hullLinerMaterial()
  const y = COCKPIT.floorY
  const span = FLOOR_REAR_Z - FLOOR_FRONT_Z

  for (let i = 0; i < FLOOR_SEGMENTS; i++) {
    const za = FLOOR_FRONT_Z + (span * i) / FLOOR_SEGMENTS
    const zb = FLOOR_FRONT_Z + (span * (i + 1)) / FLOOR_SEGMENTS
    const wa = hullInteriorHalfWidthAt(y, za)
    const wb = hullInteriorHalfWidthAt(y, zb)
    if (wa <= 0 || wb <= 0) continue // either end unverified at this height — do not bridge to it
    const leftA: Placed = { x: -wa, y, z: za }
    const rightA: Placed = { x: wa, y, z: za }
    const rightB: Placed = { x: wb, y, z: zb }
    const leftB: Placed = { x: -wb, y, z: zb }
    group.add(flatQuad(leftA, leftB, rightB, rightA, material))
  }
  return group
}

/**
 * The rear bulkhead: the hull's own cross-section at FLOOR_REAR_Z, sliced
 * into bands at the ring's real vertical corners (hullSectionBreakpoints) so
 * each band is a chord of an actually-straight edge — exact, not an
 * approximation — rather than one flat COCKPIT.clearWidth rectangle.
 */
function buildBulkhead(): Group {
  const group = new Group()
  group.name = 'bulkhead'
  const material = hullLinerMaterial()
  const z = FLOOR_REAR_Z
  const ys = hullSectionBreakpoints(z, COCKPIT.floorY, WALL.ceilingY)

  for (let i = 0; i < ys.length - 1; i++) {
    const yA = ys[i]
    const yB = ys[i + 1]
    const wA = hullInteriorHalfWidthAt(yA, z)
    const wB = hullInteriorHalfWidthAt(yB, z)
    if (wA <= 0 || wB <= 0) continue // defensive: hullSectionBreakpoints already keeps ys inside the safe band
    const bottomLeft: Placed = { x: -wA, y: yA, z }
    const bottomRight: Placed = { x: wA, y: yA, z }
    const topRight: Placed = { x: wB, y: yB, z }
    const topLeft: Placed = { x: -wB, y: yB, z }
    group.add(flatQuad(bottomLeft, topLeft, topRight, bottomRight, material))
  }
  return group
}

export interface CabinShell {
  group: Group
  dispose(): void
}

export function createCabinShell(): CabinShell {
  const group = new Group()
  group.name = 'cabinShell'

  group.add(buildFloor(), buildBulkhead(), buildSideWall(-1), buildSideWall(1))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
