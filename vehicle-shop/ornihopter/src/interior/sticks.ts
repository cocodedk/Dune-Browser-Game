// vehicle-shop/ornihopter/src/interior/sticks.ts
// The control columns: an ARTICULATED ARM per crew station, mounted on the
// brow beam, jointed twice on its way down and forward, ending in a bulbous
// grip with a coiled cable running beside it.
//
// FOUND, round 6b: "a bare untapered post with a flat cap" against the
// reference's "multi-jointed arm with a bulbous grip and a coiled cable — the
// most identifiable silhouette in the reference"
// (.shots/reference/thopter-03.jpg, centre). That is the right reading of the
// board: the arm is the one part of that cockpit you could recognise from its
// outline alone, and the shipped version was a cylinder with a cone on top.
//
// It also had to MOVE, not only change shape. layout.ts's STICK explains why:
// with the flight deck raised to put the pilot's eye at the canopy line, a
// stick rising off the floor between the knees sits about 48 degrees below
// level and the pilot camera's half-VFOV is 34. A floor-mounted stick is
// invisible at this eye height however well it is modelled. Hanging it from
// the brow is not a workaround for that — it is what the reference does.

import { Group, Mesh, CylinderGeometry, Vector3, type MeshStandardMaterial } from 'three'
import { STICK } from './layout'
import { ball, box, disposeGroup, type Placed } from './sceneUtils'
import {
  machinedMaterial, machinedDarkMaterial, gunmetalMaterial, stickGripMaterial,
} from './materials'

/** One straight run from a to b: a cylinder, oriented by quaternion. */
function segment(a: Vector3, b: Vector3, radius: number, material: MeshStandardMaterial): Mesh {
  const direction = new Vector3().subVectors(b, a)
  const length = Math.max(1e-4, direction.length())
  const mesh = new Mesh(new CylinderGeometry(radius, radius * 1.08, length, 10), material)
  mesh.position.copy(a).addScaledVector(direction, 0.5)
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize())
  return mesh
}

/**
 * The coiled cable: short runs stepped along the arm and alternately offset to
 * either side, which reads as a coil in silhouette for a fraction of the cost
 * of a swept helix and needs no new geometry type.
 */
function coiledCable(group: Group, from: Vector3, to: Vector3): void {
  const material = gunmetalMaterial()
  // MEASURED: 9 coils at a 0.045m throw read as a coarse zigzag the size of
  // the arm itself in the capture. 16 at 0.028 reads as cable.
  const coils = 16
  const direction = new Vector3().subVectors(to, from)
  const step = direction.clone().multiplyScalar(1 / coils)
  const side = new Vector3(step.z, 0, -step.x).normalize().multiplyScalar(0.028)
  for (let i = 0; i < coils; i++) {
    const at = from.clone().addScaledVector(step, i)
    const swing = i % 2 === 0 ? 1 : -1
    const a = at.clone().addScaledVector(side, swing)
    const b = at.clone().add(step).addScaledVector(side, -swing)
    group.add(segment(a, b, 0.011, material))
  }
}

function buildArm(grip: Placed, name: string): Group {
  const group = new Group()
  group.name = name

  const outboard = grip.x < 0 ? -0.06 : 0.06
  const mount = new Vector3(grip.x + outboard, STICK.mountY, STICK.mountZ)
  // Two joints on the way down: the arm drops from the brow, kinks at the
  // elbow, then runs down and forward to the hand.
  const elbow = new Vector3(mount.x, STICK.mountY - 0.34, STICK.mountZ + 0.1)
  const wrist = new Vector3(grip.x, grip.y + 0.2, grip.z + 0.08)
  const hand = new Vector3(grip.x, grip.y, grip.z)

  group.add(
    // Mounting bracket clamped on the brow beam.
    box(0.13, 0.09, 0.13, machinedDarkMaterial(), { x: mount.x, y: mount.y + 0.045, z: mount.z }),
    segment(mount, elbow, STICK.shaftRadius * 1.25, machinedMaterial()),
    ball(0.042, machinedDarkMaterial(), { x: elbow.x, y: elbow.y, z: elbow.z }),
    segment(elbow, wrist, STICK.shaftRadius, machinedMaterial()),
    ball(0.034, machinedDarkMaterial(), { x: wrist.x, y: wrist.y, z: wrist.z }),
    segment(wrist, hand, STICK.shaftRadius * 0.9, machinedMaterial())
  )

  // The bulbous grip: a ball, a collar above it, and a trigger stub — the
  // outline the reference is recognisable by.
  group.add(
    ball(STICK.gripRadius, stickGripMaterial(), hand),
    box(0.075, 0.045, 0.075, machinedDarkMaterial(), { x: hand.x, y: hand.y + 0.08, z: hand.z }),
    box(0.035, 0.05, 0.05, gunmetalMaterial(), {
      x: hand.x,
      y: hand.y - 0.02,
      z: hand.z + STICK.gripRadius * 0.9,
    })
  )

  coiledCable(group, new Vector3(mount.x, mount.y - 0.1, mount.z + 0.06), wrist)
  return group
}

export interface Sticks {
  group: Group
  dispose(): void
}

export function createControlSticks(): Sticks {
  const group = new Group()
  group.name = 'sticks'
  group.add(buildArm(STICK.pilotGrip, 'stick-pilot'), buildArm(STICK.copilotGrip, 'stick-copilot'))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
