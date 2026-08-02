// vehicle-shop/harvester/src/model/hull.ts
// The centre hull between the track assemblies: a deck band across the top,
// an underframe near the ground, and low solid housings at the nose and
// tail. Round 2 lowered the profile (deck 14.2 -> 12.0) and shrank the end
// blocks so the machine reads long and low, not as a box with solid walls.

import { BoxGeometry, Mesh, MeshStandardMaterial, Group } from 'three'
import { BODY } from '../spec'

const LENGTH = BODY.tailZ - BODY.noseZ

export interface HullParts {
  group: Group
  dispose(): void
}

export function buildHull(bodyMaterial: MeshStandardMaterial, darkMaterial: MeshStandardMaterial): HullParts {
  const group = new Group()
  const geometries: BoxGeometry[] = []

  const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const deckHalf = BODY.halfWidth
  const deckY = BODY.deckTop - BODY.deckThickness / 2
  // The deck spans the whole hull, between and over the track housings.
  box(deckHalf * 2, BODY.deckThickness, LENGTH, bodyMaterial, 0, deckY, 0)
  // Underframe: a shallow slab near the ground, the same plan as the deck.
  box(deckHalf * 2, BODY.underThickness, LENGTH, bodyMaterial, 0, BODY.underThickness / 2, 0)

  // Forward housing: a solid block under the deck behind the cutter — the
  // 3MF's solid nose, lowered so the silhouette stays long.
  const noseLen = BODY.noseBlockAftZ - BODY.noseZ
  box(deckHalf * 2, 9.0, noseLen, bodyMaterial, (BODY.noseZ + BODY.noseBlockAftZ) / 2, 6.5, 0)
  // Rear housing: a low processing tower at the tail.
  const tailLen = BODY.tailZ - BODY.tailBlockForeZ
  box(16, 6.0, tailLen, bodyMaterial, (BODY.tailBlockForeZ + BODY.tailZ) / 2, 9.0, 0)

  // Flank grilles: dark slats along the deck slab's sides.
  for (const side of [-1, 1] as const) {
    box(1.2, 1.2, LENGTH * 0.6, darkMaterial, side * (deckHalf - 0.2), deckY - 0.8, 2)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
