// vehicle-shop/harvester/src/model/hull.ts
// The centre hull between the track pods: a deck band across the top, an
// underframe near the ground, and solid nose and tail blocks. This is the
// measured block layout of docs/harvester.3mf at spec.ts's scale — a
// platform you can see under, between the tracks, exactly like the film's
// open processing deck.

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
  // The deck spans the whole hull, between and over the pods.
  box(deckHalf * 2, BODY.deckThickness, LENGTH, bodyMaterial, 0, deckY, 0)
  // Underframe: a shallow slab near the ground, the same plan as the deck.
  box(deckHalf * 2, BODY.underThickness, LENGTH, bodyMaterial, 0, BODY.underThickness / 2, 0)

  // Solid end blocks filling the gap between the pods (measured from the 3MF).
  const noseLen = BODY.noseBlockAftZ - BODY.noseZ
  const tailLen = BODY.tailZ - BODY.tailBlockForeZ
  const blockY = BODY.deckTop / 2
  box(deckHalf * 2, BODY.deckTop, noseLen, bodyMaterial, (BODY.noseZ + BODY.noseBlockAftZ) / 2, blockY, 0)
  box(deckHalf * 2, BODY.deckTop, tailLen, bodyMaterial, (BODY.tailBlockForeZ + BODY.tailZ) / 2, blockY, 0)

  // Flank grilles: dark slats along the deck slab's sides, the film's intake
  // read. Placed against the slab's side faces, under the deck edge.
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
