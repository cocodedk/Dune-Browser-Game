// vehicle-shop/harvester/src/model/cutter.ts
// COMPONENT 3 — the forward cutter, the film's signature: a wide low arm
// from the nose with side rails, a broad dark grinder head, a row of seven
// teeth dipping toward the sand, and a feed hopper above connected to the
// head by a pipe. Round 5 LOWERED the whole assembly (BOOM.y 6 -> 3): the
// head and teeth now scrape within a couple of metres of the ground, a dozer
// blade rather than a mid-air boom — the user's direction.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { BODY, BOOM } from '../spec'
import { roundedBox } from './rounded'

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
  const geometries: BufferGeometry[] = []

  const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const rbox = (w: number, h: number, d: number, radius: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = roundedBox(w, h, d, radius)
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

  // Arm from the nose housing to the head, with two dark rails. Rounded.
  const armLen = BODY.noseZ - (BOOM.tipZ + 4)
  rbox(BOOM.halfWidth * 2, 4.0, armLen, 0.6, accentMaterial, 0, BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)
  box(0.9, 1.6, armLen, darkMaterial, -(BOOM.halfWidth - 1.5), BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)
  box(0.9, 1.6, armLen, darkMaterial, BOOM.halfWidth - 1.5, BOOM.y, (BODY.noseZ + BOOM.tipZ + 4) / 2)

  // The grinder head: wide, dark, blunt, and low — its centre barely above
  // the arm line so the whole front reads as scraping the sand.
  rbox(BOOM.cutterHalfWidth * 2, 6.0, 4, 0.9, darkMaterial, 0, BOOM.y + 1.5, BOOM.tipZ + 2)

  // Seven teeth dipping toward the sand — the frontmost geometry, their
  // tips within half a metre of the ground line.
  for (const tx of TEETH_X) {
    box(1.8, 2.4, 1.4, darkMaterial, tx, BOOM.y - 1.4, BOOM.tipZ + 0.4)
  }

  // Feed hopper above the nose housing, and the pipe from it to the head.
  cylinder(3.5, 7.5, 7.0, 6, accentMaterial, 0, 10.5, -20)
  box(1.8, 1.8, 14, darkMaterial, 0, 6.0, -27)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
