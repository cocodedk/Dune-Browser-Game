// vehicle-shop/harvester/src/model/link.ts
// COMPONENT 8 — ONE chain link, the repeatable unit of the belt (user
// direction: "create the piece component of the belt; like the chain link,
// with same thickness at the ground level" and "make the link components
// as wide as the wheels"). A thick plate as wide as the road wheels, with a
// grouser ridge on its outer face — the tread block. Built once and
// instantiated around the whole loop.

import { BoxGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'

export interface LinkPart {
  group: Group
  dispose(): void
}

const LINK_WIDTH = TRACK.belt.outerWidth

export function buildLink(
  side: 1 | -1,
  thickness: number,
  length: number,
  material: MeshStandardMaterial,
): LinkPart {
  const group = new Group()
  group.name = 'link'
  const geometries: BufferGeometry[] = []

  const outerX = side * (LINK_WIDTH / 2)

  // The link body — as wide as the wheels.
  const body = new BoxGeometry(LINK_WIDTH, thickness, length)
  geometries.push(body)
  const bodyMesh = new Mesh(body, material)
  bodyMesh.position.set(0, 0, 0)
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Grouser ridge on the outer face — the tread bar. Flush with the plate's
  // faces (it stands proud in X, not in Y) so a bottom-run link's underside
  // is exactly the ground line and nothing dips below the sand.
  const ridge = new BoxGeometry(0.35, thickness, length * 0.7)
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
