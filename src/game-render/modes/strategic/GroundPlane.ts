// src/game-render/modes/strategic/GroundPlane.ts
// A large flat desert floor beneath and beyond the heightfield.
//
// Paired with the heightfield's edgeFalloff, this is what removes the
// plateau-lip artifact: the dunes ramp down to zero at their border and meet
// this plane, which extends past the fog distance. There is no boundary left
// to see, so fog density can be tuned for depth instead of for concealment.

import { Mesh, PlaneGeometry, MeshStandardMaterial, Color } from 'three'
import { neutralEnvMap } from '../../materials/neutralEnvMap'

export interface GroundPlane {
  mesh: Mesh
  setColor(color: Color | string): void
  dispose(): void
}

export function createGroundPlane(size: number): GroundPlane {
  // Two triangles. Detail would be wasted — it is always deep in fog.
  const geometry = new PlaneGeometry(size, size, 1, 1)
  geometry.rotateX(-Math.PI / 2)

  const material = new MeshStandardMaterial({
    color: new Color('#c08a52'),
    roughness: 1,
    metalness: 0,
    // Opts out of scene.environment — see neutralEnvMap.ts.
    envMap: neutralEnvMap(),
  })

  const mesh = new Mesh(geometry, material)
  mesh.name = 'ground-plane'
  // Fractionally below zero so it never z-fights with the terrain's edge
  // vertices, which sit exactly at zero once edgeFalloff has run.
  mesh.position.y = -0.5
  mesh.frustumCulled = false

  return {
    mesh,
    setColor(color): void {
      material.color.set(color)
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
