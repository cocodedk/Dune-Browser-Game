// vehicle-shop/harvester/src/model/link.ts
// COMPONENT 8 — ONE chain link, the repeatable unit of the belt (user
// direction: "create the piece component of the belt; like the chain link,
// with same thickness at the ground level"). A thick plate with a grouser
// ridge on its outer face — the tread block. Built once and instantiated
// around the whole loop (straight runs + sprocket wraps) so the belt reads
// as a continuous chain, not a monolithic slab.

import { BoxGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'

export interface LinkPart {
  group: Group
  dispose(): void
}

/** The link spans the belt's full width plus a small overhang, and is as
 *  thick as the bottom plate (derived from the sprocket Y-centre). */
export function buildLink(
  side: 1 | -1,
  thickness: number,
  length: number,
  material: MeshStandardMaterial,
): LinkPart {
  const group = new Group()
  group.name = 'link'
  const geometries: BufferGeometry[] = []

  const outerX = side * (TRACK.belt.width / 2)

  // The link body.
  const body = new BoxGeometry(TRACK.belt.width + 0.2, thickness, length)
  geometries.push(body)
  const bodyMesh = new Mesh(body, material)
  bodyMesh.position.set(0, 0, 0)
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Grouser ridge on the outer face — the tread bar.
  const ridge = new BoxGeometry(0.35, thickness + 0.15, length * 0.7)
  geometries.push(ridge)
  const ridgeMesh = new Mesh(ridge, material)
  ridgeMesh.position.set(outerX + side * 0.25, 0, 0)
  ridgeMesh.castShadow = true
  group.add(ridgeMesh)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
