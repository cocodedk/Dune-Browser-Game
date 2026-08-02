// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP, made entirely of chain links (user direction:
// "create the piece component of the belt; like the chain link… and use it
// to create a complete perfect belt around the wheels"). The belt is now a
// continuous chain of identical links:
//
//   - BOTTOM RUN — 24 links on the ground, pitch 2.0 m
//   - FRONT WRAP — 6 links curving around the front sprocket (nose side)
//   - TOP RUN — 24 links returning, pitch 2.0 m
//   - REAR WRAP — 6 links curving around the rear sprocket (tail side)
//   - engagement lugs on the wrap links' outer faces where the teeth mesh
//
// No plates, no half-cylinders — one component repeated.

import { BoxGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { buildLink, type LinkPart } from './link'

export interface BeltPart {
  group: Group
  dispose(): void
}

/** Pods run the hull's own length, not the full footprint (which the forward
 *  cutter extends past). */
const POD_LENGTH = BODY.tailZ - BODY.noseZ
const BELT = TRACK.belt
const BOTTOM_THICK = TRACK.sprocketY - TRACK.sprocketRadius
const WRAP_RADIUS = 3.6

/** Straight-run link count and pitch. */
const STRAIGHT_COUNT = 24
const STRAIGHT_SPACING = POD_LENGTH / STRAIGHT_COUNT
const STRAIGHT_LENGTH = STRAIGHT_SPACING * 0.78
const BOTTOM_Y = BOTTOM_THICK / 2
const TOP_Y = BELT.height - BOTTOM_THICK / 2

/** Wrap links per sprocket. Angles sweep the half-circle from the bottom
 *  tangent to the top tangent around the OUTSIDE of the machine. */
const WRAP_COUNT = 6
const WRAP_ANGLE_START = -Math.PI / 2  // bottom tangent
const WRAP_ANGLE_STEP = Math.PI / (WRAP_COUNT - 1)

/** Engagement lugs: on the wrap links' outer faces at the tooth arc. */
const LUG_RADIUS = TRACK.sprocketRadius + 0.55
const LUG_START = (36 * Math.PI) / 180
const LUG_STEP = (36 * Math.PI) / 180
const LUG_COUNT = 4

/** One belt loop for one side. `side` 1 = starboard, -1 = port; the whole
 *  group is positioned at that side's track centreline. */
export function buildBelt(
  side: 1 | -1,
  beltMaterial: MeshStandardMaterial,
): BeltPart {
  const group = new Group()
  group.name = 'belt'
  group.position.x = side * TRACK.centreX
  const geometries: BufferGeometry[] = []

  const links: LinkPart[] = []

  // Bottom straight run — 24 links on the ground.
  for (let i = 0; i < STRAIGHT_COUNT; i++) {
    const link = buildLink(side, BOTTOM_THICK, STRAIGHT_LENGTH, beltMaterial)
    link.group.position.set(0, BOTTOM_Y, -POD_LENGTH / 2 + STRAIGHT_SPACING * (i + 0.5))
    link.group.rotation.x = 0
    group.add(link.group)
    links.push(link)
  }

  // Top straight run — 24 links returning.
  for (let i = 0; i < STRAIGHT_COUNT; i++) {
    const link = buildLink(side, BOTTOM_THICK, STRAIGHT_LENGTH, beltMaterial)
    link.group.position.set(0, TOP_Y, -POD_LENGTH / 2 + STRAIGHT_SPACING * (i + 0.5))
    link.group.rotation.x = 0
    group.add(link.group)
    links.push(link)
  }

  // Wrap around each sprocket — 6 links curving from bottom to top.
  for (const sz of TRACK.sprocketZ) {
    for (let w = 0; w < WRAP_COUNT; w++) {
      const angle = WRAP_ANGLE_START + w * WRAP_ANGLE_STEP
      const link = buildLink(side, BOTTOM_THICK, 1.5, beltMaterial)
      link.group.position.set(0, TRACK.sprocketY + WRAP_RADIUS * Math.sin(angle), sz + WRAP_RADIUS * Math.cos(angle))
      link.group.rotation.x = angle
      group.add(link.group)
      links.push(link)
    }

    // Lugs on the wrap's outer face where the sprocket teeth engage.
    const outerX = side * (BELT.width / 2)
    for (let t = 0; t < LUG_COUNT; t++) {
      const angle = LUG_START + t * LUG_STEP
      const lug = new BoxGeometry(0.6, 1.0, 0.8)
      geometries.push(lug)
      const lugMesh = new Mesh(lug, beltMaterial)
      lugMesh.position.set(
        outerX + side * 0.4,
        TRACK.sprocketY + LUG_RADIUS * Math.sin(angle),
        sz + LUG_RADIUS * Math.cos(angle)
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
