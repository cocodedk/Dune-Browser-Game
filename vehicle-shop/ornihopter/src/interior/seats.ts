// vehicle-shop/ornihopter/src/interior/seats.ts
// Both front seats: frame, pan, backrest, headrest, armrests, a crossed
// harness on the backrest face. Built identically for pilot and copilot and
// mirrored by `side`, per contract COCKPIT.seatOffsetX. The pilot's own seat
// is built in full even though the pilot camera never sees it (see
// layout.ts) — a chase or orbit view still looks at it, and it is the thing
// the eye point has to sit correctly in front of and above.
//
// ROUND 9d. FOUND: a critic glancing right at the copilot position named "no
// second seat... nothing implies a companion position", even though a
// mirrored seat has stood here since before round 4 — every part was one
// khaki cushion family with no structure to read as SEAT FURNITURE rather
// than a stowed crate. `seat-frame` is new: dark equipment-family rails the
// cushion visibly sits inside of (materials.ts's `armorMaterial`, the same
// tone as the coaming and sills). Named parts ('seat-frame'/'seat-cushion'/
// 'seat-strap') so crewPalette.test.ts can pin the mirrored copilot station
// mechanically instead of trusting a screenshot.

import { Group, Mesh, BoxGeometry } from 'three'
import { COCKPIT } from '../spec'
import { PAN_Y, SEAT, seatX, type Side } from './layout'
import { box, disposeGroup } from './sceneUtils'
import { seatMaterial, seatDarkMaterial, armorMaterial } from './materials'

const HARNESS_LENGTH = 0.62
const HARNESS_THICKNESS = 0.05
/** How far the frame stands proud of the cushion it carries. */
const FRAME_MARGIN = 0.035

function buildHarness(x: number, y: number, z: number): Group {
  const group = new Group()
  const geometry = new BoxGeometry(HARNESS_LENGTH, HARNESS_THICKNESS, HARNESS_THICKNESS)
  const strapA = new Mesh(geometry, seatDarkMaterial())
  strapA.name = 'seat-strap'
  strapA.rotation.z = Math.PI / 4
  strapA.position.set(x, y, z)
  const strapB = new Mesh(geometry.clone(), seatDarkMaterial())
  strapB.name = 'seat-strap'
  strapB.rotation.z = -Math.PI / 4
  strapB.position.set(x, y, z)
  group.add(strapA, strapB)
  return group
}

/**
 * The seat's own structure: a mount plate under the pan and two rails
 * flanking the backrest, all in the dark armor tone — the frame a cushion
 * needs beside it before it reads as a seat rather than a floating cushion.
 */
function buildFrame(x: number, backCenterZ: number): Mesh[] {
  const mount = box(
    COCKPIT.seatWidth + FRAME_MARGIN * 2,
    0.05,
    SEAT.panDepth + FRAME_MARGIN,
    armorMaterial(),
    { x, y: PAN_Y - SEAT.panThickness - 0.025, z: COCKPIT.seatZ }
  )
  const railHeight = COCKPIT.seatBackHeight + 0.12
  const railY = PAN_Y + railHeight / 2 - 0.04
  const railOffset = SEAT.halfWidth + FRAME_MARGIN
  const rails = [-1, 1].map((sign) =>
    box(0.05, railHeight, SEAT.backThickness + 0.05, armorMaterial(), {
      x: x + sign * railOffset,
      y: railY,
      z: backCenterZ,
    })
  )
  const parts = [mount, ...rails]
  for (const mesh of parts) mesh.name = 'seat-frame'
  return parts
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
  pan.name = 'seat-cushion'

  const backCenterZ = SEAT.rearZ + SEAT.backThickness / 2
  const backrest = box(
    COCKPIT.seatWidth,
    COCKPIT.seatBackHeight,
    SEAT.backThickness,
    cushion,
    { x, y: PAN_Y + COCKPIT.seatBackHeight / 2, z: backCenterZ }
  )
  backrest.name = 'seat-cushion'

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
  const frame = buildFrame(x, backCenterZ)

  group.add(pan, backrest, headrest, armInboard, armOutboard, harness, ...frame)
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
