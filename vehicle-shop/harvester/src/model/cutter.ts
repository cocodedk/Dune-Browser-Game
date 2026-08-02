// vehicle-shop/harvester/src/model/cutter.ts
// COMPONENT 3 — the forward cutter, the film's signature: a wide low arm
// from the nose with side rails, a broad dark grinder head, a row of seven
// teeth dipping toward the sand, and a feed hopper above connected to the
// head by a pipe. It must dominate the front from a hero shot, so it reads
// spec.BOOM and nothing smaller.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type MeshStandardMaterial } from 'three'
import { BODY, BOOM } from '../spec'

export interface CutterParts {
  group: Group
  dispose(): void
}

const TEETH_X = [-7.5, -5, -2.5, 0, 2.5, 5, 7.5] as const

export function buildCutter(
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
): CutterParts {
  const group = new Group()
  group.name = 'cutter'
  const geometries: (BoxGeometry | CylinderGeometry)[] = []

  const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const cylinder = (rTop: number, rBottom: number, h: number, seg: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = new CylinderGeometry(rTop, rBottom, h, seg)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  // Arm from the nose housing to the head, with two dark rails.
  box(BOOM.halfWidth * 2, 4.0, BODY.noseZ - (BOOM.tipZ + 4), accentMaterial, 0, BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)
  box(0.9, 1.6, BODY.noseZ - (BOOM.tipZ + 4), darkMaterial, -(BOOM.halfWidth - 1.5), BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)
  box(0.9, 1.6, BODY.noseZ - (BOOM.tipZ + 4), darkMaterial, BOOM.halfWidth - 1.5, BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)

  // The grinder head: wide, dark, blunt.
  box(BOOM.cutterHalfWidth * 2, 6.0, 4, darkMaterial, 0, BOOM.y + 2, BOOM.tipZ + 2)

  // Seven teeth dipping toward the sand, the frontmost geometry.
  for (const tx of TEETH_X) {
    box(1.8, 2.4, 1.4, darkMaterial, tx, BOOM.y - 0.4, BOOM.tipZ + 0.4)
  }

  // Feed hopper above the nose housing, and the pipe from it to the head.
  cylinder(3.5, 7.5, 7.0, 6, accentMaterial, 0, 10.5, -20)
  box(1.8, 1.8, 14, darkMaterial, 0, 8.4, -27)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
