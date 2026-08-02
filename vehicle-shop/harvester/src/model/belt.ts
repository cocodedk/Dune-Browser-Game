// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP, not a block (user finding: "belt is a block
// and not a band. the wheels sink into the belt"). Four pieces: a LOWER RUN
// on the ground (grousers on its outer face), an UPPER RUN at the top, and
// END CONNECTORS wrapping the sprockets. The middle is OPEN — the running
// gear sits in clear space between the runs instead of buried in a solid
// slab, and you can see through the loop to the hull behind it.
//
// Built once and instantiated for both sides at mirrored X. The grousers
// live on the lower run, which is where the still-open belt-scrolling
// animation will drive them.

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
const GROUSER_SPACING = POD_LENGTH / TRACK.grouserCount
const GROUSER_LENGTH = GROUSER_SPACING * 0.55

/** The band's four pieces. */
const LOWER_THICK = 1.4
const UPPER_THICK = 1.2
const END_THICK = 1.2
const RADIUS = 0.45

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

  // Lower run on the ground line.
  add(roundedBox(BELT.width, LOWER_THICK, POD_LENGTH, RADIUS), 0, LOWER_THICK / 2, 0)
  // Upper run at the top.
  add(roundedBox(BELT.width, UPPER_THICK, POD_LENGTH, RADIUS), 0, BELT.height - UPPER_THICK / 2, 0)
  // End connectors wrapping the sprockets — the loop's front and back.
  add(roundedBox(BELT.width, BELT.height, END_THICK, RADIUS), 0, BELT.height / 2, -POD_LENGTH / 2)
  add(roundedBox(BELT.width, BELT.height, END_THICK, RADIUS), 0, BELT.height / 2, POD_LENGTH / 2)

  // Grousers: short tread teeth on the LOWER run's outer face.
  for (let i = 0; i < TRACK.grouserCount; i++) {
    const grouser = new BoxGeometry(0.45, 1.1, GROUSER_LENGTH)
    geometries.push(grouser)
    const grouserMesh = new Mesh(grouser, beltMaterial)
    grouserMesh.position.set(
      side * (BELT.width / 2 + 0.25),
      0.55,
      -POD_LENGTH / 2 + GROUSER_SPACING * (i + 0.5)
    )
    grouserMesh.castShadow = true
    group.add(grouserMesh)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
