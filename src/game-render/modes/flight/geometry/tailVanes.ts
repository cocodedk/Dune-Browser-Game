// src/game-render/modes/flight/geometry/tailVanes.ts
// The paired tail vanes — the reference photographs' own termination for the
// tailboom (.shots/reference/thopter-mr.jpg, mr-O8.jpg): two slender prongs
// splayed apart at the tip, not a single upright fin. A dragonfly's paired
// terminal appendages (cerci) are the biological analogue; here they are
// also the last silhouette-defining shape before the abdomen tapers away to
// nothing, which is why they are worth a real bevelled shape rather than a
// stub.
//
// Built with the same beveled-extrusion technique the old vertical fin used
// (stage 22 section 2.5: "every hard edge needs a bevel") — two small
// blades instead of one large standing one, sharing one shape definition
// and mirrored by transform (position + rotation) rather than by duplicating
// geometry, since the blade shape itself has no inherent left/right
// asymmetry to preserve.

import { Group, Mesh, Shape, ExtrudeGeometry, type BufferGeometry, type Material } from 'three'

const VANE_LENGTH = 1.6
const VANE_WIDTH = 0.55
const VANE_THICKNESS = 0.14
const BEVEL = 0.04
const SPLAY_ANGLE = 0.4 // radians outward from the abdomen's own axis
const DIHEDRAL = -0.15 // slight downward cant, so the pair reads as a fork

/** A tapering blade in its own (chord x length) plane, root at the origin. */
function vaneShape(): Shape {
  const shape = new Shape()
  shape.moveTo(0, 0) // root, at the abdomen surface
  shape.lineTo(VANE_WIDTH, VANE_LENGTH * 0.3)
  shape.quadraticCurveTo(VANE_WIDTH * 0.55, VANE_LENGTH * 0.9, 0.04, VANE_LENGTH) // tip
  shape.quadraticCurveTo(-VANE_WIDTH * 0.1, VANE_LENGTH * 0.45, 0, 0)
  return shape
}

function buildOneVaneGeometry(): BufferGeometry {
  const geometry = new ExtrudeGeometry(vaneShape(), {
    depth: VANE_THICKNESS,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
    curveSegments: 6,
  })
  geometry.translate(-VANE_WIDTH / 2, 0, -VANE_THICKNESS / 2)
  // The shape's own (x=chord, y=length) plane extrudes along Z (thickness);
  // rotating +90 about X swaps that to (x=chord, y=thickness, z=length), so
  // the blade's length runs aft from its root, thin edge-on to vertical —
  // the same "rotate the raw extrusion into the boom's frame" move the old
  // fin used, just landing the thin axis on Y instead of X.
  geometry.rotateX(Math.PI / 2)
  return geometry
}

export interface TailVaneAttachment {
  x: number
  y: number
  z: number
  /** The abdomen's own surface radius at the mount station, so vanes root on the skin, not floating off it or buried inside it. */
  radius: number
}

export interface TailVaneParts {
  group: Group
  geometries: BufferGeometry[]
}

/** @param material Dark trim accent, matching the spar and joint housings. */
export function buildTailVanes(attachment: TailVaneAttachment, material: Material): TailVaneParts {
  const group = new Group()
  const geometries: BufferGeometry[] = []

  for (const side of [-1, 1] as const) {
    const geometry = buildOneVaneGeometry()
    const mesh = new Mesh(geometry, material)
    mesh.position.set(attachment.x + side * attachment.radius * 0.6, attachment.y, attachment.z)
    mesh.rotation.y = side * SPLAY_ANGLE
    mesh.rotation.x = DIHEDRAL
    geometries.push(geometry)
    group.add(mesh)
  }

  return { group, geometries }
}
