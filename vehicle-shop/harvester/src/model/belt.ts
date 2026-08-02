// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP, thin enough that the wheels ENGAGE it rather
// than sink into it (user finding), and with the conveyor elements where the
// sprocket teeth mesh:
//
//   - a THIN loop: outer face, inner face, top and bottom bands, end
//     connectors — 0.4m deep, so the running gear sits in clear space and
//     the hull shows through; the wheels are NOT buried in a wall
//   - tread shoes on the outer face's lower run (the segmented ground read)
//   - ENGAGEMENT LUGS on the outer face at each sprocket — red blocks at
//     the same arc as the sprocket's grey teeth, interleaved, so the teeth
//     visibly pass between them like a conveyor
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
const SHOE_HEIGHT = 1.0

/** How deep each band is — thin on purpose: the wheels must sit in open
 *  space between the faces, not behind a wall. */
const FACE_THICK = 0.4
const BAND_THICK = 0.4

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

  // The loop: inner and outer faces, top and bottom bands, end connectors —
  // 0.4m thin, so the wheels read as sitting INSIDE the belt, not in it.
  const outerX = side * (BELT.width / 2)
  const innerX = side * (-BELT.width / 2)
  add(roundedBox(FACE_THICK, BELT.height, POD_LENGTH, 0.2), outerX, BELT.height / 2, 0)
  add(roundedBox(FACE_THICK, BELT.height, POD_LENGTH, 0.2), innerX, BELT.height / 2, 0)
  add(roundedBox(BELT.width, BAND_THICK, POD_LENGTH, 0.2), 0, BELT.height - BAND_THICK / 2, 0)
  add(roundedBox(BELT.width, BAND_THICK, POD_LENGTH, 0.2), 0, BAND_THICK / 2, 0)
  add(roundedBox(BELT.width, BELT.height, BAND_THICK, 0.2), 0, BELT.height / 2, -POD_LENGTH / 2)
  add(roundedBox(BELT.width, BELT.height, BAND_THICK, 0.2), 0, BELT.height / 2, POD_LENGTH / 2)

  // Tread shoes on the OUTER face's lower run — the segmented ground read.
  for (let i = 0; i < TRACK.grouserCount; i++) {
    const z = -POD_LENGTH / 2 + SHOE_SPACING * (i + 0.5)
    const shoe = new BoxGeometry(0.35, SHOE_HEIGHT, SHOE_LENGTH)
    geometries.push(shoe)
    const shoeMesh = new Mesh(shoe, beltMaterial)
    shoeMesh.position.set(outerX + side * 0.2, SHOE_HEIGHT / 2, z)
    shoeMesh.castShadow = true
    group.add(shoeMesh)
  }

  // Engagement lugs at each sprocket — the conveyor element the teeth mesh
  // with. Interleaved with the tooth angles so the grey teeth pass between
  // the red lugs.
  for (const sz of TRACK.sprocketZ) {
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

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
