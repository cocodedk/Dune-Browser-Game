// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt loop, the band that wraps the running gear. A tall
// rounded box with short grouser teeth on its LOWER outer face (tread at the
// ground-contact line). Built once and instantiated for both sides at
// mirrored X — the wheel pattern. This component owns the grouser geometry,
// which is where the still-open belt-scrolling animation will live (the
// grousers currently stay put while the wheels roll).

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

  // The band itself: tall, RED (user direction), edges rounded so it reads
  // as a wrapped loop rather than a slab.
  const band = roundedBox(BELT.width, BELT.height, POD_LENGTH, 0.9)
  geometries.push(band)
  const bandMesh = new Mesh(band, beltMaterial)
  bandMesh.position.set(0, BELT.height / 2, 0)
  bandMesh.castShadow = true
  bandMesh.receiveShadow = true
  group.add(bandMesh)

  // Grousers: short tread teeth on the belt's LOWER outer face only, same
  // red family so the belt reads as one part.
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
