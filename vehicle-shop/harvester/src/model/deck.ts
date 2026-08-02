// vehicle-shop/harvester/src/model/deck.ts
// What stands on and ahead of the deck. Round 2 enlarged the cutter from a
// thin stick to a real grinder assembly (the film's signature), added a
// hopper feeding it, gave the cab a glass band, and put processing machinery
// on the deck so the flat top has scale and identity.
//
// Still a placeholder blockout — proportion and silhouette first, textures
// and greebles later.

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
  ): Mesh => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
    return m
  }

  const cylinder = (
    rTop: number, rBottom: number, h: number, seg: number,
    mat: MeshStandardMaterial, x: number, y: number, z: number,
  ): void => {
    const g = new CylinderGeometry(rTop, rBottom, h, seg)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  // The cutter grinder: a wide low arm from the nose, a broad dark head with
  // a row of teeth, and a hopper above feeding it. This is the machine's
  // signature — it must read from a hero shot.
  box(BOOM.halfWidth * 2, 4.0, BODY.noseZ - (BOOM.tipZ + 4), accentMaterial, 0, BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)
  box(BOOM.cutterHalfWidth * 2, 6.0, 4, darkMaterial, 0, BOOM.y + 2, BOOM.tipZ + 2)
  for (const tx of [-6, -3, 0, 3, 6] as const) {
    box(1.8, 2.4, 1.4, darkMaterial, tx, BOOM.y + 0.2, BOOM.tipZ + 0.4)
  }
  cylinder(3.5, 7.5, 7.0, 6, accentMaterial, 0, 10.5, -20)

  // The cab: wider than before, with a dark glass band across its front.
  box(CAB.halfWidth * 2, CAB.topY - BODY.deckTop, CAB.halfDepth * 2, bodyMaterial, 0, (CAB.topY + BODY.deckTop) / 2, CAB.zCenter)
  const glass = box(CAB.halfWidth * 2 + 0.4, 1.3, 0.3, darkMaterial, 0, BODY.deckTop + 2.1, CAB.zCenter - CAB.halfDepth + 0.2)
  glass.rotation.x = -0.3

  // Processing machinery on the open deck: two hoppers, a gantry, a conveyor.
  cylinder(2.2, 4.6, 3.6, 6, accentMaterial, 0, BODY.deckTop + 1.8, 2)
  cylinder(1.5, 3.2, 3.0, 6, darkMaterial, 0, BODY.deckTop + 1.5, 10)
  box(0.8, 4.0, 0.8, darkMaterial, -8, BODY.deckTop + 2.0, 14)
  box(0.8, 4.0, 0.8, darkMaterial, 8, BODY.deckTop + 2.0, 14)
  box(17, 0.8, 0.8, darkMaterial, 0, BODY.deckTop + 4.0, 14)
  box(1.6, 1.6, 14, accentMaterial, 0, BODY.deckTop + 0.8, 8)

  // Small vents along the deck edge.
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
