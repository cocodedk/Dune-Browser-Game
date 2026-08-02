// vehicle-shop/harvester/src/model/machinery.ts
// COMPONENT 5 — the open processing deck: two hoppers, a gantry with a
// winch, a conveyor run, and vent stacks. This is what gives the flat deck
// scale and identity — the film's spice bed is a working deck, not a roof.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { BODY } from '../spec'
import { roundedBox } from './rounded'

export interface MachineryParts {
  group: Group
  dispose(): void
}

const DECK = BODY.deckTop

export function buildMachinery(
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
): MachineryParts {
  const group = new Group()
  group.name = 'machinery'
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

  // Two processing hoppers, fore and aft.
  cylinder(2.2, 4.6, 3.6, 6, accentMaterial, 0, DECK + 1.8, 2)
  cylinder(1.5, 3.2, 3.0, 6, darkMaterial, 0, DECK + 1.5, 10)

  // Gantry: two posts, a beam, a small winch box hanging from it. Rounded.
  rbox(0.8, 4.0, 0.8, 0.25, darkMaterial, -8, DECK + 2.0, 14)
  rbox(0.8, 4.0, 0.8, 0.25, darkMaterial, 8, DECK + 2.0, 14)
  rbox(17, 0.8, 0.8, 0.25, darkMaterial, 0, DECK + 4.0, 14)
  rbox(1.6, 1.2, 1.6, 0.25, darkMaterial, 0, DECK + 3.4, 14)

  // Conveyor run from the fore hopper toward the tail.
  rbox(1.6, 1.6, 14, 0.5, accentMaterial, 0, DECK + 0.8, 8)

  // Vent stacks and a control box on the deck edges (thin in X, so nothing
  // overhangs the hull's flank).
  cylinder(0.7, 0.9, 2.0, 8, darkMaterial, 5, DECK + 1.0, -2)
  cylinder(0.7, 0.9, 2.0, 8, darkMaterial, -5, DECK + 1.0, 16)
  box(1.0, 0.8, 2.4, darkMaterial, BODY.halfWidth - 0.6, DECK + 0.4, -8)
  box(1.0, 0.8, 2.4, darkMaterial, -(BODY.halfWidth - 0.6), DECK + 0.4, 12)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
