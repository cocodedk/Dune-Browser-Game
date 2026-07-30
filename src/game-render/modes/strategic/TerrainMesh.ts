// src/game-render/modes/strategic/TerrainMesh.ts
// Turns a pure Heightfield into three geometry. One mesh, one draw call.

import { Mesh, PlaneGeometry, type Material } from 'three'
import type { Heightfield } from '../../terrain/heightfield'

export interface TerrainMesh {
  mesh: Mesh
  /** Height of the surface at a world XZ, for placing markers on the ground. */
  heightAt(x: number, z: number): number
  dispose(): void
}

export function createTerrainMesh(
  heightfield: Heightfield,
  material: Material,
  /**
   * Let the dunes shadow each other.
   *
   * Both flags together, not just receive: the point is self-shadowing. A dune
   * casting across the trough behind it is what gives the field scale at a low
   * sun, and measured at dusk the foreground carried a shading spread of under
   * one luma value out of 255 without it — a flat slab exactly when raking light
   * should be at its most sculptural. Off by default so the 'low' tier and the
   * flight view opt in deliberately; drawing this mesh again into the shadow map
   * is the single most expensive thing either view can ask for.
   */
  shadows = false,
): TerrainMesh {
  const { resolution, worldSize, data } = heightfield

  const geometry = new PlaneGeometry(
    worldSize,
    worldSize,
    resolution - 1,
    resolution - 1,
  )
  // PlaneGeometry is built in XY facing +Z; rotate it flat so +Y is up.
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    position.setY(i, data[i])
  }
  position.needsUpdate = true

  // Recomputed after displacement — without this every face keeps the flat
  // plane's normal and the whole desert lights as if it were a tabletop.
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const mesh = new Mesh(geometry, material)
  mesh.name = 'terrain'
  mesh.receiveShadow = shadows
  mesh.castShadow = shadows

  return {
    mesh,
    heightAt: (x, z) => heightfield.heightAt(x, z),
    dispose(): void {
      geometry.dispose()
    },
  }
}
