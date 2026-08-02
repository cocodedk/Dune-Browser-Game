// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP, made to read as a real track belt:
//
//   - the LOWER run is a CHAIN OF TREAD SHOES — 24 blocks with small gaps
//     and a raised grouser ridge on each, the segmented caterpillar read
//     (round 10 made the loop; this makes the ground run a belt)
//   - a smooth UPPER run at the top, with the return rollers tucking under
//   - rounded END CONNECTORS wrapping the sprockets
//   - the middle stays OPEN, so the running gear sits in clear space
//
// Built once and instantiated for both sides at mirrored X. The shoes are
// where the still-open belt-scrolling animation will drive the tread.

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
const SHOE_HEIGHT = 1.2

const UPPER_THICK = 1.2
const END_THICK = 1.2

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

  // Upper run at the top.
  add(roundedBox(BELT.width, UPPER_THICK, POD_LENGTH, 0.45), 0, BELT.height - UPPER_THICK / 2, 0)
  // End connectors wrapping the sprockets, rounded so the loop reads curved.
  add(roundedBox(BELT.width, BELT.height, END_THICK, 0.8), 0, BELT.height / 2, -POD_LENGTH / 2)
  add(roundedBox(BELT.width, BELT.height, END_THICK, 0.8), 0, BELT.height / 2, POD_LENGTH / 2)

  // The lower run: a chain of tread shoes with a raised grouser ridge on
  // each shoe's outer face — segmented, like a real track belt.
  for (let i = 0; i < TRACK.grouserCount; i++) {
    const z = -POD_LENGTH / 2 + SHOE_SPACING * (i + 0.5)
    const shoe = new BoxGeometry(BELT.width + 0.25, SHOE_HEIGHT, SHOE_LENGTH)
    geometries.push(shoe)
    const shoeMesh = new Mesh(shoe, beltMaterial)
    shoeMesh.position.set(0, SHOE_HEIGHT / 2, z)
    shoeMesh.castShadow = true
    shoeMesh.receiveShadow = true
    group.add(shoeMesh)

    const ridge = new BoxGeometry(0.4, SHOE_HEIGHT + 0.15, SHOE_LENGTH * 0.7)
    geometries.push(ridge)
    const ridgeMesh = new Mesh(ridge, beltMaterial)
    ridgeMesh.position.set(side * (BELT.width / 2 + 0.35), SHOE_HEIGHT / 2, z)
    ridgeMesh.castShadow = true
    group.add(ridgeMesh)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
