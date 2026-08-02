// vehicle-shop/harvester/src/model/cab.ts
// COMPONENT 4 — the control cab: a squat two-step body, a slanted dark
// glass band across the front with mullion posts, side windows, a roof
// cap, and a small antenna. No interior by design. Reads spec.CAB.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type MeshStandardMaterial } from 'three'
import { BODY, CAB } from '../spec'

export interface CabParts {
  group: Group
  dispose(): void
}

export function buildCab(
  bodyMaterial: MeshStandardMaterial,
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
): CabParts {
  const group = new Group()
  group.name = 'cab'
  const geometries: (BoxGeometry | CylinderGeometry)[] = []

  const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): Mesh => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
    return m
  }

  const halfW = CAB.halfWidth
  const halfD = CAB.halfDepth
  const cabBottom = BODY.deckTop
  const roofTop = CAB.topY

  // Lower body, then the upper band holding the glass — the two-step read.
  box(halfW * 2, 1.4, halfD * 2, bodyMaterial, 0, cabBottom + 0.7, CAB.zCenter)
  box(halfW * 2 + 0.3, roofTop - cabBottom - 1.4, halfD * 2 - 0.6, bodyMaterial, 0, (roofTop + cabBottom + 1.4) / 2, CAB.zCenter)

  // Slanted glass band across the front face, with two mullion posts.
  const glass = box(halfW * 2 + 0.5, 1.3, 0.3, darkMaterial, 0, cabBottom + 2.2, CAB.zCenter - halfD + 0.2)
  glass.rotation.x = -0.3
  for (const mx of [-2.5, 2.5] as const) {
    box(0.15, 1.8, 0.5, darkMaterial, mx, cabBottom + 2.2, CAB.zCenter - halfD + 0.1)
  }

  // Side windows and roof cap.
  for (const side of [-1, 1] as const) {
    box(0.4, 1.3, halfD * 2 - 1.5, darkMaterial, side * (halfW + 0.15), cabBottom + 2.2, CAB.zCenter)
  }
  box(halfW * 2 + 0.6, 0.5, halfD * 2 + 0.6, bodyMaterial, 0, roofTop - 0.25, CAB.zCenter)

  // A small antenna poking above the roof — cheap scale cue. Kept short so
  // the machine's overall height stays inside OVERALL.height + 2.
  const antenna = new CylinderGeometry(0.08, 0.08, 1.6, 6)
  geometries.push(antenna)
  const antennaMesh = new Mesh(antenna, accentMaterial)
  antennaMesh.position.set(2.5, roofTop + 0.4, CAB.zCenter - 1)
  antennaMesh.castShadow = true
  group.add(antennaMesh)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
