// vehicle-shop/ornihopter/src/interior/cabinShell.ts
// The interior liner: floor, a rear bulkhead closing the cockpit off from the
// larger cabin behind it (per docs/info.md), and side-wall panels whose TOP
// edge tapers to the canopy's OWN sill line (model/geometry/canopyGeometry.ts's
// canopySectionAt) instead of sitting at one constant half-width.
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
import { box, flatQuad, disposeGroup, type Placed } from './sceneUtils'
import { hullLinerMaterial, gunmetalMaterial } from './materials'

const SPAN_LEN = FLOOR_REAR_Z - FLOOR_FRONT_Z
const SPAN_CENTER_Z = (FLOOR_FRONT_Z + FLOOR_REAR_Z) / 2
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

export interface CabinShell {
  group: Group
  dispose(): void
}

export function createCabinShell(): CabinShell {
  const group = new Group()
  group.name = 'cabinShell'

  const floor = box(COCKPIT.clearWidth, 0.08, SPAN_LEN, hullLinerMaterial(), {
    x: 0,
    y: COCKPIT.floorY - 0.04,
    z: SPAN_CENTER_Z,
  })

  const bulkhead = box(COCKPIT.clearWidth, COCKPIT.clearHeight, 0.1, hullLinerMaterial(), {
    x: 0,
    y: COCKPIT.floorY + COCKPIT.clearHeight / 2,
    z: FLOOR_REAR_Z,
  })

  group.add(floor, bulkhead, buildSideWall(-1), buildSideWall(1))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
