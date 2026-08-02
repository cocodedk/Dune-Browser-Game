// vehicle-shop/harvester/src/model/deck.ts
// What stands on and ahead of the deck: the forward cutter boom (film
// signature), the low control cab, and a few processing-machinery blocks —
// the film's open spice bed kept deliberately simple.
//
// Everything here is a placeholder blockout, the harvester equivalent of the
// ornithopter's "flyable first" round: proportion and silhouette before
// panel lines, greebles or a second pass.

import {
  BoxGeometry, CylinderGeometry, Group, Mesh, type MeshStandardMaterial,
} from 'three'
import { BODY, BOOM, CAB } from '../spec'

export interface DeckParts {
  group: Group
  dispose(): void
}

export function buildDeck(
  bodyMaterial: MeshStandardMaterial,
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
): DeckParts {
  const group = new Group()
  const geometries: (BoxGeometry | CylinderGeometry)[] = []

  const box = (
    w: number, h: number, d: number,
    mat: MeshStandardMaterial, x: number, y: number, z: number,
    opts: { rotZ?: number } = {},
  ): Mesh => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    if (opts.rotZ) m.rotation.z = opts.rotZ
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
    return m
  }

  // The cutter: a low arm ahead of the nose, and a wide blunt head at its
  // tip. The arm runs from the nose block to 2m short of the tip; the head
  // and its teeth reach the tip line, which the seam test pins as the
  // frontmost geometry.
  box(BOOM.halfWidth * 2, 1.2, BODY.noseZ - (BOOM.tipZ + 2), accentMaterial, 0, BOOM.y, (BODY.noseZ + BOOM.tipZ + 2) / 2)
  box(BOOM.cutterHalfWidth * 2, 2.6, 2, darkMaterial, 0, BOOM.y + 0.4, BOOM.tipZ + 1)
  // Cutter teeth: three short dark prongs dipping toward the sand.
  for (const tz of [-4, 0, 4] as const) {
    box(1.6, 1.6, 1.4, darkMaterial, tz, BOOM.y - 1.6, BOOM.tipZ + 0.4)
  }

  // The cab: low, squat, slanted windshield face (no interior).
  box(CAB.halfWidth * 2, CAB.topY - BODY.deckTop, CAB.halfDepth * 2, bodyMaterial, 0, (CAB.topY + BODY.deckTop) / 2, CAB.zCenter)
  const glass = box(0.4, CAB.topY - BODY.deckTop - 1.4, CAB.halfWidth * 2 - 1.2, darkMaterial, 0, (CAB.topY + BODY.deckTop) / 2 - 0.5, CAB.zCenter - CAB.halfDepth + 0.2)
  glass.rotation.x = -0.28

  // Processing machinery: a hex hopper and two blocky units on the deck.
  const hopper = new CylinderGeometry(2.2, 5.4, 4.4, 6)
  geometries.push(hopper)
  const hopperMesh = new Mesh(hopper, accentMaterial)
  hopperMesh.position.set(4, BODY.deckTop + 2.2, 6)
  hopperMesh.castShadow = true
  group.add(hopperMesh)

  box(5, 3.2, 6, darkMaterial, 4, BODY.deckTop + 1.6, -4)
  box(3, 2.2, 3.4, bodyMaterial, 10, BODY.deckTop + 1.1, 10)

  // Small vents along the deck edge, the film's heat/venting read.
  for (const vz of [-8, 12] as const) {
    box(2.4, 0.8, 1.0, darkMaterial, BODY.halfWidth - 0.8, BODY.deckTop + 0.4, vz)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
