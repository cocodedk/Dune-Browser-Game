// vehicle-shop/ornihopter/src/interior/seats.ts
// Both front seats: pan, backrest, headrest, armrests, a crossed harness on
// the backrest face. Built identically for pilot and copilot and mirrored by
// `side`, per contract COCKPIT.seatOffsetX. The pilot's own seat is built in
// full even though the pilot camera never sees it (see layout.ts) — a chase
// or orbit view still looks at it, and it is the thing the eye point has to
// sit correctly in front of and above.

import { Group, Mesh, BoxGeometry } from 'three'
import { COCKPIT } from '../spec'
import { PAN_Y, SEAT, seatX, type Side } from './layout'
import { box, disposeGroup } from './sceneUtils'
import { seatMaterial, seatDarkMaterial } from './materials'

const HARNESS_LENGTH = 0.62
const HARNESS_THICKNESS = 0.05

function buildHarness(x: number, y: number, z: number): Group {
  const group = new Group()
  const geometry = new BoxGeometry(HARNESS_LENGTH, HARNESS_THICKNESS, HARNESS_THICKNESS)
  const strapA = new Mesh(geometry, seatDarkMaterial())
  strapA.rotation.z = Math.PI / 4
  strapA.position.set(x, y, z)
  const strapB = new Mesh(geometry.clone(), seatDarkMaterial())
  strapB.rotation.z = -Math.PI / 4
  strapB.position.set(x, y, z)
  group.add(strapA, strapB)
  return group
}

function buildSeat(side: Side): Group {
  const group = new Group()
  group.name = side < 0 ? 'seat-pilot' : 'seat-copilot'
  const x = seatX(side)
  const cushion = seatMaterial()
  const trim = seatDarkMaterial()

  const pan = box(COCKPIT.seatWidth, SEAT.panThickness, SEAT.panDepth, cushion, {
    x,
    y: PAN_Y - SEAT.panThickness / 2,
    z: COCKPIT.seatZ,
  })

  const backCenterZ = SEAT.rearZ + SEAT.backThickness / 2
  const backrest = box(
    COCKPIT.seatWidth,
    COCKPIT.seatBackHeight,
    SEAT.backThickness,
    cushion,
    { x, y: PAN_Y + COCKPIT.seatBackHeight / 2, z: backCenterZ }
  )

  const headrest = box(COCKPIT.seatWidth * 0.72, 0.18, SEAT.backThickness * 1.3, trim, {
    x,
    y: SEAT.backTopY + 0.09,
    z: backCenterZ,
  })

  const armrestY = PAN_Y + 0.2
  const armSpan = SEAT.halfWidth + 0.05
  const armInboard = box(0.08, 0.14, 0.4, trim, { x: x - side * armSpan, y: armrestY, z: COCKPIT.seatZ })
  const armOutboard = box(0.08, 0.14, 0.4, trim, { x: x + side * armSpan, y: armrestY, z: COCKPIT.seatZ })

  const harness = buildHarness(x, PAN_Y + COCKPIT.seatBackHeight * 0.6, backCenterZ + 0.06)

  group.add(pan, backrest, headrest, armInboard, armOutboard, harness)
  return group
}

export interface Seats {
  group: Group
  dispose(): void
}

export function createSeats(): Seats {
  const group = new Group()
  group.name = 'seats'
  group.add(buildSeat(-1), buildSeat(1))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
