// vehicle-shop/ornihopter/src/interior/cabinShell.ts
// The interior liner: floor, a rear bulkhead closing the cockpit off from the
// larger cabin behind it (per docs/info.md), and low side-wall panels below
// the canopy glazing line. This is what is "inside" the hull and canopy
// shells that the exterior builder owns — not a replacement for either.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { WALL, FLOOR_FRONT_Z, FLOOR_REAR_Z } from './layout'
import { box, disposeGroup } from './sceneUtils'
import { hullLinerMaterial, gunmetalMaterial } from './materials'

const SPAN_LEN = FLOOR_REAR_Z - FLOOR_FRONT_Z
const SPAN_CENTER_Z = (FLOOR_FRONT_Z + FLOOR_REAR_Z) / 2
const WALL_TOP_Y = COCKPIT.floorY + COCKPIT.clearHeight * 0.42
const WALL_HEIGHT = WALL_TOP_Y - COCKPIT.floorY

function buildSideWall(x: number): Group {
  const group = new Group()
  group.add(
    box(0.05, WALL_HEIGHT, SPAN_LEN, hullLinerMaterial(), {
      x,
      y: COCKPIT.floorY + WALL_HEIGHT / 2,
      z: SPAN_CENTER_Z,
    })
  )

  // A small greeble strip only where it is actually visible in the pilot
  // frame — forward of roughly z=-9.5 (see layout.ts WALL). Four raised bars
  // reading as a vent or access grate, matching the "BULKHEAD" inset in
  // thopter-03. Offset toward the cabin centre (inward, not into the hull)
  // so they read as ribs proud of the wall's inner face.
  const barCount = 4
  const span = WALL.greebleZMax - WALL.greebleZMin
  const ribX = x - Math.sign(x) * 0.04
  for (let i = 0; i < barCount; i++) {
    const z = WALL.greebleZMin + (span * (i + 0.5)) / barCount
    group.add(box(0.03, 0.3, span / barCount - 0.05, gunmetalMaterial(), { x: ribX, y: 0.15, z }))
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

  group.add(floor, bulkhead, buildSideWall(-WALL.halfX), buildSideWall(WALL.halfX))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
