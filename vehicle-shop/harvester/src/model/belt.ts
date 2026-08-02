// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt BAND, heavy and mechanical (user direction: "can
// you do it better?"). A real track belt is not wire — the runs are thick
// plates, the ends CURVE around the sprockets, and the tread shoes and
// engagement lugs hold their detail at close range.
//
//   - thick bottom plate (ground run) with tread shoes on its outer edge
//   - thick top plate (return run)
//   - CURVED end wraps at the sprockets — thick rounded blocks that read
//     as the belt looping over the sprocket, with engagement lugs the
//     teeth pass between
//   - the middle stays open — the wheels fully visible against the hull

import { BoxGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { roundedBox } from './rounded'

export interface BeltPart {
  group: Group
  dispose(): void
}

/** Pods run the hull's own length, not the full footprint (which the forward
 *  cutter extends past). */
const POD_LENGTH = BODY.tailZ - BODY.noseZ
const BELT = TRACK.belt
const SHOE_SPACING = POD_LENGTH / TRACK.grouserCount
const SHOE_LENGTH = SHOE_SPACING * 0.85

/** The runs are PLATES, not wire — heavier, more mechanical. */
const BOTTOM_THICK = 0.7
const TOP_THICK = 0.5
const END_THICK = 1.2
const END_RADIUS = 1.0
const WRAP_HALF = 4.5
const WRAP_THICK = 0.7
const WRAP_RADIUS = 0.8

/** Engagement lugs: at the sprocket arc, offset from the teeth so the teeth
 *  pass between them. */
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

  const add = (geometry: BufferGeometry, x: number, y: number, z: number): void => {
    geometries.push(geometry)
    const mesh = new Mesh(geometry, beltMaterial)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // The band's open frame — now heavy plates.
  add(roundedBox(BELT.width, BOTTOM_THICK, POD_LENGTH, 0.3), 0, BOTTOM_THICK / 2, 0)
  add(roundedBox(BELT.width, TOP_THICK, POD_LENGTH, 0.25), 0, BELT.height - TOP_THICK / 2, 0)
  // Thick rounded end wraps closing the loop at the very ends.
  add(roundedBox(BELT.width, BELT.height, END_THICK, END_RADIUS), 0, BELT.height / 2, -POD_LENGTH / 2)
  add(roundedBox(BELT.width, BELT.height, END_THICK, END_RADIUS), 0, BELT.height / 2, POD_LENGTH / 2)

  // Curved end wraps — two thick rounded blocks closing the loop, and one
  // short sprocket-wrap segment per sprocket carrying the lugs.
  const outerX = side * (BELT.width / 2)
  for (const sz of TRACK.sprocketZ) {
    // the sprocket wrap: thicker, larger radius so it reads curved.
    add(roundedBox(WRAP_THICK, BELT.height, WRAP_HALF * 2, WRAP_RADIUS), outerX, BELT.height / 2, sz)
    // lugs bigger — detail that holds at close range.
    for (let t = 0; t < LUG_COUNT; t++) {
      const angle = LUG_START + t * LUG_STEP
      const lug = new BoxGeometry(0.6, 1.0, 0.8)
      geometries.push(lug)
      const lugMesh = new Mesh(lug, beltMaterial)
      lugMesh.position.set(
        outerX + side * 0.4,
        LUG_RADIUS * Math.sin(angle),
        sz + LUG_RADIUS * Math.cos(angle)
      )
      lugMesh.castShadow = true
      group.add(lugMesh)
    }
  }

  // Tread shoes on the bottom plate's outer edge — the segmented ground read.
  for (let i = 0; i < TRACK.grouserCount; i++) {
    const z = -POD_LENGTH / 2 + SHOE_SPACING * (i + 0.5)
    const shoe = new BoxGeometry(0.35, 1.0, SHOE_LENGTH)
    geometries.push(shoe)
    const shoeMesh = new Mesh(shoe, beltMaterial)
    shoeMesh.position.set(outerX + side * 0.2, 0.5, z)
    shoeMesh.castShadow = true
    group.add(shoeMesh)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
