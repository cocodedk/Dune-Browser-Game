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
  mesh.receiveShadow = false
  mesh.castShadow = false

  return {
    mesh,
    heightAt: (x, z) => heightfield.heightAt(x, z),
    dispose(): void {
      geometry.dispose()
    },
  }
}
