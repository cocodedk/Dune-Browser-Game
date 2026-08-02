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

  // Two processing hoppers: the feed bin beside the conveyor, and the
  // discharge bin on the tail tower at the belt's aft end.
  cylinder(2.2, 4.6, 3.6, 6, accentMaterial, 0, DECK + 1.8, 2)
  cylinder(1.5, 3.2, 3.0, 6, darkMaterial, 0, DECK + 1.5, 20)

  // Gantry: two posts, a beam, a small winch box hanging from it. Rounded.
  rbox(0.8, 4.0, 0.8, 0.25, darkMaterial, -8, DECK + 2.0, 14)
  rbox(0.8, 4.0, 0.8, 0.25, darkMaterial, 8, DECK + 2.0, 14)
  rbox(17, 0.8, 0.8, 0.25, darkMaterial, 0, DECK + 4.0, 14)
  rbox(1.6, 1.2, 1.6, 0.25, darkMaterial, 0, DECK + 3.4, 14)

  // THE CONVEYOR — a real belt, not a wall (user direction: "the conveyor
  // belt looks vertical"). A wide flat belt climbing gently from the feed
  // hopper (z=3) to the discharge bin (z=17), with dark end drums it wraps,
  // a dark rubber strip, and three truss-leg pairs under it.
  const beltLen = 14
  const beltY = DECK + 1.6
  const beltTilt = -0.09 // negative: the +Z (aft) end rises
  const beltGeom = roundedBox(4.5, 0.7, beltLen, 0.3)
  geometries.push(beltGeom)
  const belt = new Mesh(beltGeom, accentMaterial)
  belt.position.set(0, beltY, 10)
  belt.rotation.x = beltTilt
  belt.castShadow = true
  belt.receiveShadow = true
  group.add(belt)

  const strip = new BoxGeometry(3.6, 0.12, beltLen - 0.8)
  geometries.push(strip)
  const stripMesh = new Mesh(strip, darkMaterial)
  stripMesh.position.set(0, beltY + 0.4, 10)
  stripMesh.rotation.x = beltTilt
  stripMesh.castShadow = true
  group.add(stripMesh)

  // End drums the belt wraps, at the belt's own tilted ends. Axis along X
  // (rotation.z = pi/2) — the FIRST pass left them upright, which is exactly
  // the "conveyor looks vertical" the user saw.
  for (const [dz, drumY] of [[-7, beltY - 7 * Math.sin(-beltTilt)], [7, beltY + 7 * Math.sin(-beltTilt)]] as const) {
    const g = new CylinderGeometry(0.8, 0.8, 5.0, 12)
    geometries.push(g)
    const drum = new Mesh(g, darkMaterial)
    drum.rotation.z = Math.PI / 2
    drum.position.set(0, drumY, 10 + dz)
    drum.castShadow = true
    group.add(drum)
  }

  // Truss legs from the deck up to the belt underside.
  for (const [lz, legH] of [[6, 0.9], [10, 1.25], [14, 1.6]] as const) {
    box(0.5, legH, 0.5, darkMaterial, -2.0, DECK + legH / 2, lz)
    box(0.5, legH, 0.5, darkMaterial, 2.0, DECK + legH / 2, lz)
  }

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
