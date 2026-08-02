// vehicle-shop/harvester/src/model/hull.ts
// COMPONENT 1 — the platform. A deck slab with a raised trim lip, an
// underframe near the ground (the open-framed mid-section read), a solid
// nose housing with a dark intake grille, a low tail housing, and flank
// slats. Reads spec.BODY only; no scene access, no crawler state.

import { BoxGeometry, Mesh, MeshStandardMaterial, Group } from 'three'
import { BODY } from '../spec'

const LENGTH = BODY.tailZ - BODY.noseZ

export interface HullParts {
  group: Group
  dispose(): void
}

export function buildHull(bodyMaterial: MeshStandardMaterial, darkMaterial: MeshStandardMaterial): HullParts {
  const group = new Group()
  group.name = 'hull'
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

  // Deck slab and underframe: the machine is a platform you can see under.
  box(deckHalf * 2, BODY.deckThickness, LENGTH, bodyMaterial, 0, deckY, 0)
  box(deckHalf * 2, BODY.underThickness, LENGTH, bodyMaterial, 0, BODY.underThickness / 2, 0)

  // Raised trim lip around the deck edge — the film's deck reads as a
  // bordered platform, not a bare slab edge.
  const lipY = BODY.deckTop + 0.18
  box(0.5, 0.36, LENGTH, darkMaterial, -deckHalf + 0.05, lipY, 0)
  box(0.5, 0.36, LENGTH, darkMaterial, deckHalf - 0.05, lipY, 0)
  box(deckHalf * 2, 0.36, 0.5, darkMaterial, 0, lipY, BODY.noseZ + 0.05)
  box(deckHalf * 2, 0.36, 0.5, darkMaterial, 0, lipY, BODY.tailZ - 0.05)

  // Forward housing: a solid block under the deck behind the cutter, with a
  // dark intake grille on its front face.
  const noseLen = BODY.noseBlockAftZ - BODY.noseZ
  box(deckHalf * 2, 9.0, noseLen, bodyMaterial, 0, 6.5, (BODY.noseZ + BODY.noseBlockAftZ) / 2)
  box(deckHalf * 2 - 2, 4.5, 0.5, darkMaterial, 0, 7.0, BODY.noseZ + 0.4)

  // Rear housing: a low processing tower at the tail, with vent slats.
  const tailLen = BODY.tailZ - BODY.tailBlockForeZ
  box(16, 6.0, tailLen, bodyMaterial, 0, 9.0, (BODY.tailBlockForeZ + BODY.tailZ) / 2)
  box(12, 0.5, 0.4, darkMaterial, 0, 11.2, BODY.tailZ - 0.3)

  // Flank slats along the deck underside.
  for (const side of [-1, 1] as const) {
    box(1.2, 1.2, LENGTH * 0.6, darkMaterial, side * (deckHalf - 0.6), deckY - 0.8, 2)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
