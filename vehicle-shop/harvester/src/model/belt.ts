// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP made entirely of chain links. The wrap now
// correctly curves AROUND THE OUTSIDE of each sprocket (toward the hull end),
// not toward the machine centre — round 16 fixed a 180° direction error
// that had the wrap on the wrong side. The straight runs span only between
// the sprocket tangent points, and the wrap links complete the loop out to
// the hull ends.
//
//   - BOTTOM RUN — 22 links between the sprocket tangent points
//   - 2 × WRAP — 10 links each, curving from bottom to top around the sprocket
//   - TOP RUN — 22 links returning between the tangent points
//   - engagement lugs on the wrap links' outer faces where the teeth mesh

import { BoxGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'
import { buildLink, type LinkPart } from './link'

export interface BeltPart {
  group: Group
  dispose(): void
}

const BELT = TRACK.belt
const BOTTOM_THICK = TRACK.sprocketY - TRACK.sprocketRadius
const WRAP_RADIUS = 3.6

/** The straight runs span from front-sprocket-z to rear-sprocket-z — the
 *  tangent points where the wrap arcs begin. */
const TANGENT_FRONT = TRACK.sprocketZ[0]
const TANGENT_REAR = TRACK.sprocketZ[1]
const STRAIGHT_SPAN = TANGENT_REAR - TANGENT_FRONT
const STRAIGHT_COUNT = 22
const STRAIGHT_SPACING = STRAIGHT_SPAN / STRAIGHT_COUNT
const STRAIGHT_LENGTH = STRAIGHT_SPACING * 0.82

const BOTTOM_Y = BOTTOM_THICK / 2
const TOP_Y = BELT.height - BOTTOM_THICK / 2

/** Wrap links per sprocket. */
const WRAP_COUNT = 10
const WRAP_ANGLE_START = -Math.PI / 2
const WRAP_ANGLE_STEP = Math.PI / (WRAP_COUNT - 1)
const WRAP_ARC = Math.PI * WRAP_RADIUS
const WRAP_LINK_LENGTH = (WRAP_ARC / WRAP_COUNT) * 0.82

/** Engagement lugs. */
const LUG_RADIUS = TRACK.sprocketRadius + 0.55
const LUG_START = (36 * Math.PI) / 180
const LUG_STEP = (36 * Math.PI) / 180
const LUG_COUNT = 4

export function buildBelt(
  side: 1 | -1,
  beltMaterial: MeshStandardMaterial,
): BeltPart {
  const group = new Group()
  group.name = 'belt'
  group.position.x = side * TRACK.centreX
  const geometries: BufferGeometry[] = []
  const links: LinkPart[] = []

  const addStraight = (y: number): void => {
    for (let i = 0; i < STRAIGHT_COUNT; i++) {
      const link = buildLink(side, BOTTOM_THICK, STRAIGHT_LENGTH, beltMaterial)
      link.group.position.set(0, y, TANGENT_FRONT + STRAIGHT_SPACING * (i + 0.5))
      group.add(link.group)
      links.push(link)
    }
  }

  addStraight(BOTTOM_Y)
  addStraight(TOP_Y)

  for (const sz of TRACK.sprocketZ) {
    // The wrap goes AROUND THE OUTSIDE: for the front sprocket (negative sz)
    // the z-offset is negative (toward the nose), for the rear (positive sz)
    // it's positive (toward the tail). cos(angle) is positive near the bottom,
    // zero at mid-arc, negative at the top — the wrap bellies outward.
    const zSign = sz > 0 ? 1 : -1
    for (let w = 0; w < WRAP_COUNT; w++) {
      const angle = WRAP_ANGLE_START + w * WRAP_ANGLE_STEP
      const link = buildLink(side, BOTTOM_THICK, WRAP_LINK_LENGTH, beltMaterial)
      link.group.position.set(
        0,
        TRACK.sprocketY + WRAP_RADIUS * Math.sin(angle),
        sz + zSign * WRAP_RADIUS * Math.cos(angle)
      )
      link.group.rotation.x = angle
      group.add(link.group)
      links.push(link)
    }

    const lugOuterX = side * (TRACK.belt.outerWidth / 2)
    for (let t = 0; t < LUG_COUNT; t++) {
      const angle = LUG_START + t * LUG_STEP
      const lug = new BoxGeometry(0.6, 1.0, 0.8)
      geometries.push(lug)
      const lugMesh = new Mesh(lug, beltMaterial)
      lugMesh.position.set(
        lugOuterX + side * 0.4,
        TRACK.sprocketY + LUG_RADIUS * Math.sin(angle),
        sz + zSign * LUG_RADIUS * Math.cos(angle)
      )
      lugMesh.castShadow = true
      group.add(lugMesh)
    }
  }

  return {
    group,
    dispose() {
      for (const link of links) link.dispose()
      for (const g of geometries) g.dispose()
    },
  }
}
