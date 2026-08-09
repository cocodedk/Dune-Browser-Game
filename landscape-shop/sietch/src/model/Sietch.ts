// landscape-shop/sietch/src/model/Sietch.ts
// Placeholder builder: a rock-toned box massing at the footprint, a skirt
// seating below y = 0, and an entrance marker flush with the -Z front
// face, sized to FOOTPRINT so the scaffold builds, matches spec, and the
// seam test is green immediately. Replace each box with real geometry in
// place — keep the 'massing', 'skirt' and 'entrance' names; the seam test
// keys off them. Static: no update() — see contracts.ts.

import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three'
import type { LandscapeModel } from '../contracts'
import { FOOTPRINT, PALETTE } from '../spec'

function block(width: number, height: number, depth: number): Mesh {
  const geometry = new BoxGeometry(width, height, depth)
  const material = new MeshStandardMaterial({ color: PALETTE.rock })
  return new Mesh(geometry, material)
}

export function createSietch(): LandscapeModel {
  const { widthM, depthM, heightM, skirtDepthM } = FOOTPRINT

  const root = new Group()
  root.name = 'sietch'
  const meshes: Mesh[] = []

  // Massing: the main rock body, base at y = 0, top at y = heightM, spans
  // the full footprint from z = 0 (back) to z = -depthM (front).
  const massing = block(widthM, heightM, depthM)
  massing.name = 'massing'
  massing.position.set(0, heightM / 2, -depthM / 2)
  root.add(massing)
  meshes.push(massing)

  // Skirt: seats below y = 0 for procedural terrain, never floating.
  const skirt = block(widthM, skirtDepthM, depthM)
  skirt.name = 'skirt'
  skirt.position.set(0, -skirtDepthM / 2, -depthM / 2)
  root.add(skirt)
  meshes.push(skirt)

  // Entrance marker: thin block flush with the front (-Z) face, inside
  // the massing's own bounds — documents and measures the "front toward
  // -Z" convention (landscape-shop/docs/gauntlet-loop.md) without
  // growing the overall footprint past what spec.ts declares.
  const entranceWidth = widthM * 0.3
  const entranceHeight = heightM * 0.5
  const entranceDepth = Math.min(0.1, depthM)
  const entrance = block(entranceWidth, entranceHeight, entranceDepth)
  entrance.name = 'entrance'
  entrance.position.set(0, entranceHeight / 2, -depthM + entranceDepth / 2)
  root.add(entrance)
  meshes.push(entrance)

  return {
    root,
    dispose(): void {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        ;(mesh.material as MeshStandardMaterial).dispose()
      }
      root.clear()
    },
  }
}
