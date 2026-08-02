// vehicle-shop/harvester/src/model/link.ts
// COMPONENT 8 — ONE chain link, the repeatable unit of the belt (user
// direction: "create the piece component of the belt; like the chain link,
// with same thickness at the ground level" and "make the link components
// as wide as the wheels"). A thick plate as wide as the road wheels, with a
// grouser ridge on its outer face — the tread block. ONE geometry for the
// whole loop: the plates that wrap the sprockets are the same plates that
// run on the sand.
//
// The JOINT PLATE is what makes it read as a chain rather than a row of
// floating cleats. It is a dark bar on the link's outboard edge, longer than
// the link's own pitch, so it laps its neighbours' bars and bridges every
// tread gap — the side plate of a real track chain. It is deliberately
// shallow (about a third of the plate's thickness) so the tread gaps stay
// open above and below it: a chain, not a wall.
//
// Nothing here may stand proud of the plate's inner or outer FACE. With one
// geometry everywhere, every link visits the sand on the bottom run and the
// road wheels on its way past, so a radial lug would either dig through the
// ground line or foul a wheel. The joint plate protrudes in X only.

import { BoxGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'

export interface LinkPart {
  group: Group
  dispose(): void
}

const LINK_WIDTH = TRACK.belt.outerWidth
/** Fraction of the plate's thickness the joint bar covers. */
const JOINT_DEPTH = 0.38
/** How far the bar laps past its own pitch, so neighbours always overlap. */
const JOINT_LAP = 0.12

export function buildLink(
  side: 1 | -1,
  thickness: number,
  length: number,
  pitch: number,
  material: MeshStandardMaterial,
  jointMaterial: MeshStandardMaterial,
): LinkPart {
  const group = new Group()
  group.name = 'link'
  const geometries: BufferGeometry[] = []

  const outerX = side * (LINK_WIDTH / 2)

  // The link body — as wide as the wheels.
  const body = new BoxGeometry(LINK_WIDTH, thickness, length)
  geometries.push(body)
  const bodyMesh = new Mesh(body, material)
  bodyMesh.name = 'link-plate'
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

  // Joint plate: laps the neighbours, closes the daylight between plates.
  const joint = new BoxGeometry(0.3, thickness * JOINT_DEPTH, pitch + JOINT_LAP)
  geometries.push(joint)
  const jointMesh = new Mesh(joint, jointMaterial)
  jointMesh.name = 'link-joint'
  jointMesh.position.set(outerX + side * 0.45, 0, 0)
  jointMesh.castShadow = true
  group.add(jointMesh)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
