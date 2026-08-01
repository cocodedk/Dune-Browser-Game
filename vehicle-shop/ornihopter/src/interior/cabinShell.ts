// vehicle-shop/ornihopter/src/interior/cabinShell.ts
// The interior liner: floor, a rear bulkhead closing the cockpit off from the
// larger cabin behind it (per docs/info.md), and side-wall panels whose TOP
// edge tapers to the canopy's OWN sill line (model/geometry/canopyGeometry.ts's
// canopySectionAt) instead of sitting at one constant half-width.
//
// FOUND, round 4b: the floor and bulkhead were still flat boxes at a constant
// COCKPIT.clearWidth (4.9m) regardless of the hull's own taper — the one
// number round 4's hull rebuild never touched. With the new tucked-belly pod,
// the hull's chine half-width is only 2.19-2.38m over the cabin, and far less
// at the floor's own height, well below the chine — so the floor and
// bulkhead's constant 2.45m half-width corners hung outside the hull skin
// entirely, rendering as a black tray and wall below and beside the pod in
// every exterior capture. Both are now built the same way the side walls
// already were (below): from the hull's own section, via hullSection.ts's
// hullInteriorHalfWidthAt/hullSectionBreakpoints, which read hullHalfWidthAt/
// hullHalfHeightAt/hullKeelYAt/hullShapeAt and buildRing — the SAME numbers
// hullLoft.ts's visible mesh and hullProfile.ts's isOutsideHull use, so this
// liner cannot land anywhere the actual hull surface does not. See
// hullSection.ts's own header for why "just read the hull's half-width" was
// not quite enough on its own (the keel and deck are flat caps, not points),
// and this round's report for the measured before/after numbers.
//
// FOUND, round 3: the previous wall was a flat box at a constant half-width
// (2.3m) the whole cabin length, while the canopy's own sill narrows to 0.7m
// at the nose and bulges to 2.5m at the shoulder. The wall sat OUTSIDE the
// canopy's own footprint for most of the forward run — not just failing to
// meet the glazing, but standing somewhere the shell never reached, which is
// the "entire right half... unbounded open sky" a blind critic reported.
// canopySectionAt is now the single source for both, so the wall's top edge
// cannot land anywhere the canopy itself does not.
//
// FOUND, round 2: the four black rectangular panes a blind critic reported
// floating unattached at upper-left of the pilot frame (progress.md) were the
// four ribs below — coded well above the wall's own top edge, attached to
// nothing. Fixed by moving them onto the wall's own face; they now also
// track its taper.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { canopySectionAt, CANOPY_STATION_Z } from '../model/geometry/canopyGeometry'
import { WALL, FLOOR_FRONT_Z, FLOOR_REAR_Z } from './layout'
import { hullInteriorHalfWidthAt, hullSectionBreakpoints } from './hullSection'
import { box, flatQuad, disposeGroup, type Placed } from './sceneUtils'
import { hullLinerMaterial, gunmetalMaterial } from './materials'

// Kept inboard of the canopy's own sill rail beam (canopyGeometry.ts's
// BEAM_THICKNESS) so the liner's top edge never pokes past it into the glass.
const SILL_MARGIN = 0.08
// The wall's outer face AT THE FLOOR — unrelated to the canopy, so it stays
// put; only the top edge (canopySectionAt) follows the shell's own taper.
const BASE_OUTER_X = WALL.halfX
// Break exactly at the canopy's own stations, so each segment is linear over
// the same span canopySectionAt is linear over — an exact match, not a
// sampled curve that could cut a corner at the shoulder, the closest station
// to the pilot's eye and so the most visible one.
const WALL_ZS = [
  FLOOR_FRONT_Z, CANOPY_STATION_Z.nose, CANOPY_STATION_Z.shoulder, CANOPY_STATION_Z.rear, FLOOR_REAR_Z,
]
// Fine enough that hullInteriorHalfWidthAt's steepest rise (the nose
// crossover where the hull first grows deep enough to reach COCKPIT.floorY
// at all — see hullSection.ts) reads as a wedge, not a visible step.
const FLOOR_SEGMENTS = 24

function buildSideWall(sign: 1 | -1): Group {
  const group = new Group()
  const material = hullLinerMaterial()

  for (let i = 0; i < WALL_ZS.length - 1; i++) {
    const za = WALL_ZS[i]
    const zb = WALL_ZS[i + 1]
    const ta = canopySectionAt(za)
    const tb = canopySectionAt(zb)
    const bottomA: Placed = { x: sign * BASE_OUTER_X, y: COCKPIT.floorY, z: za }
    const bottomB: Placed = { x: sign * BASE_OUTER_X, y: COCKPIT.floorY, z: zb }
    const topB: Placed = { x: sign * (tb.halfWidth - SILL_MARGIN), y: tb.baseY, z: zb }
    const topA: Placed = { x: sign * (ta.halfWidth - SILL_MARGIN), y: ta.baseY, z: za }
    group.add(flatQuad(bottomA, bottomB, topB, topA, material))
  }

  // Greeble ribs — see layout.ts WALL for why only forward of z=-9.5 is
  // worth detailing. X/Y interpolate the same way the quads above do,
  // between the constant floor edge and the canopy's local sill, at the
  // rib's own height fraction, so they sit ON the tapered face, not beside it.
  const barCount = 4
  const span = WALL.greebleZMax - WALL.greebleZMin
  const heightFrac = 0.6
  for (let i = 0; i < barCount; i++) {
    const z = WALL.greebleZMin + (span * (i + 0.5)) / barCount
    const top = canopySectionAt(z)
    const bottomX = sign * BASE_OUTER_X
    const topX = sign * (top.halfWidth - SILL_MARGIN)
    const ribX = bottomX + (topX - bottomX) * heightFrac - sign * 0.04
    const ribY = COCKPIT.floorY + (top.baseY - COCKPIT.floorY) * heightFrac
    group.add(box(0.03, 0.3, span / barCount - 0.05, gunmetalMaterial(), { x: ribX, y: ribY, z }))
  }
  return group
}

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
