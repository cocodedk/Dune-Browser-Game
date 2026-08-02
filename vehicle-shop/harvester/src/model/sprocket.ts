// vehicle-shop/harvester/src/model/sprocket.ts
// COMPONENT 2a — ONE end sprocket: the drum plus its ring of teeth, as a
// single group whose origin is the axle, so tracks.ts rolls the whole toothed
// wheel by rotating it about local X. Split out of tracks.ts when the return
// rollers grew their support brackets and the file reached the 200-line cap;
// the sprocket was the largest self-contained thing in it.
//
// The teeth rise from the drum's rim THROUGH the belt and stand proud of its
// outer face, so the mesh is visible from outside. tracks.ts turns this group
// at the BELT's orbit rate, not the drum's own rim rate, so a tooth holds its
// place against the plates forever instead of crawling across them.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'

export interface SprocketPart {
  group: Group
  dispose(): void
}

const BELT = TRACK.belt
const TOOTH_COUNT = 5
const TOOTH_STEP = (2 * Math.PI) / TOOTH_COUNT
const TOOTH_HEIGHT = 1.2
/** Base on the drum's rim, tip proud of the belt's outer face. */
const TOOTH_RADIUS = TRACK.sprocketRadius + TOOTH_HEIGHT / 2
/** How far the drum's face stands past the belt band. */
const SPROCKET_OVER = 1.0

export function buildSprocket(
  side: 1 | -1,
  x: number,
  z: number,
  wheelMaterial: MeshStandardMaterial,
  darkMaterial: MeshStandardMaterial,
): SprocketPart {
  const group = new Group()
  group.name = 'wheel'
  group.position.set(x, TRACK.sprocketY, z)
  const geometries: BufferGeometry[] = []

  const drum = new CylinderGeometry(
    TRACK.sprocketRadius, TRACK.sprocketRadius, BELT.width + SPROCKET_OVER * 2, 18,
  )
  geometries.push(drum)
  const drumMesh = new Mesh(drum, wheelMaterial)
  drumMesh.name = 'sprocket-drum'
  drumMesh.rotation.z = Math.PI / 2 // axle along X
  drumMesh.castShadow = true
  group.add(drumMesh)

  // The X station follows the pod's side — built unsigned, the port pod's
  // teeth faced the hull and were invisible from outside.
  const toothLocalX = side * (BELT.width / 2 + 0.55)
  for (let t = 0; t < TOOTH_COUNT; t++) {
    const angle = t * TOOTH_STEP
    const tooth = new BoxGeometry(1.5, TOOTH_HEIGHT, 0.9)
    geometries.push(tooth)
    const toothMesh = new Mesh(tooth, darkMaterial)
    toothMesh.name = 'sprocket-tooth'
    toothMesh.position.set(toothLocalX, TOOTH_RADIUS * Math.sin(angle), TOOTH_RADIUS * Math.cos(angle))
    toothMesh.rotation.x = angle
    toothMesh.castShadow = true
    group.add(toothMesh)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
