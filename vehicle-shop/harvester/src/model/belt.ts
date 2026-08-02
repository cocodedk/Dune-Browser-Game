// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt BAND, with open space between its runs (user
// finding, round 12: "the belt became a block again"). A real track belt is
// a band: you see the lower run, the upper run, the end wraps — and the
// wheels in the open middle. There is NO full-height sheet on the face, so
// the belt cannot read as a block and the running gear stays fully visible.
//
//   - bottom strip (the ground run, with tread shoes on its outer edge)
//   - top strip (the return run)
//   - end connectors closing the loop
//   - SHORT wrap segments at each sprocket — the only full-height belt
//     material, where the belt passes over the sprocket, carrying the
//     ENGAGEMENT LUGS the sprocket's grey teeth visibly pass between
//
// Built once and instantiated for both sides at mirrored X.

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

/** Strip thickness — thin, so the band reads as a band. */
const STRIP_THICK = 0.4
/** Half-length of the full-height wrap segment at each sprocket. */
const WRAP_HALF = 4.5

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

  // The band's open frame: bottom run, top run, end connectors. No sheets —
  // the middle is open so the wheels stay fully visible.
  add(roundedBox(BELT.width, STRIP_THICK, POD_LENGTH, 0.2), 0, STRIP_THICK / 2, 0)
  add(roundedBox(BELT.width, STRIP_THICK, POD_LENGTH, 0.2), 0, BELT.height - STRIP_THICK / 2, 0)
  add(roundedBox(BELT.width, BELT.height, STRIP_THICK, 0.2), 0, BELT.height / 2, -POD_LENGTH / 2)
  add(roundedBox(BELT.width, BELT.height, STRIP_THICK, 0.2), 0, BELT.height / 2, POD_LENGTH / 2)

  // The outer-face wrap segment at each sprocket — the only full-height belt
  // material, where the belt passes over the sprocket and its teeth engage.
  const outerX = side * (BELT.width / 2)
  for (const sz of TRACK.sprocketZ) {
    add(roundedBox(STRIP_THICK, BELT.height, WRAP_HALF * 2, 0.2), outerX, BELT.height / 2, sz)
    // Lugs at the tooth arc, interleaved with the teeth.
    for (let t = 0; t < LUG_COUNT; t++) {
      const angle = LUG_START + t * LUG_STEP
      const lug = new BoxGeometry(0.5, 0.9, 0.7)
      geometries.push(lug)
      const lugMesh = new Mesh(lug, beltMaterial)
      lugMesh.position.set(
        outerX + side * 0.3,
        LUG_RADIUS * Math.sin(angle),
        sz + LUG_RADIUS * Math.cos(angle)
      )
      lugMesh.castShadow = true
      group.add(lugMesh)
    }
  }

  // Tread shoes on the bottom run's outer edge — the segmented ground read.
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
