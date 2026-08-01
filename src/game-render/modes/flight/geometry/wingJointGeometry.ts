// src/game-render/modes/flight/geometry/wingJointGeometry.ts
// Ball-joint wing-root mechanism: a spherical actuator housing, a control
// rod threaded through it, and a coil spring around the rod's shaft, one
// pair per wing-root shoulder. Every blind critic across three rounds named
// the bare wingRootFairing.ts capsule as the single highest-value gap
// (stage 22 round 5 brief) — the reference
// (.shots/reference/mr-O8.jpg, mr-IMG_9407.jpg) shows exactly this: a
// chromed ball at the fuselage flank with a rod and a wound spring running
// out to the wing.
//
// Layered ONTO wingRootFairing.ts's capsule rather than replacing it —
// Ornithopter.ts adds both — so the existing, verified fairing shape is
// untouched. Fixed to the hull (added to driftNode alongside the fairing),
// not to WingRig's pivot: a HOUSING does not swing on every wingbeat, only
// the (unmodelled) ball inside it would rotate. See WingRig.ts's own header
// for why fairings stay fixed rather than riding the pivot.

import {
  Group, Mesh, SphereGeometry, CylinderGeometry, TubeGeometry, CatmullRomCurve3, Vector3,
  type BufferGeometry, type Material,
} from 'three'
import { FOREWING_FAIRING_RADIUS, HINDWING_FAIRING_RADIUS } from './wingRootFairing'

export interface WingJointParts {
  group: Group
  geometries: BufferGeometry[]
}

export interface JointMaterials {
  housing: Material
  rod: Material
}

interface JointSpec {
  attachment: { x: number; y: number; z: number }
  housingRadius: number
  /** wingRootFairing.ts's own capsule radius at this shoulder — see buildOneJoint's clearance comment. */
  fairingRadius: number
  rodLength: number
}

// Smaller than the fairing capsule (FOREWING_FAIRING_RADIUS 0.95,
// HINDWING_FAIRING_RADIUS 0.72) so the ball reads as a fitting mounted ON
// the housing, not a replacement for it.
const FOREWING_HOUSING_RADIUS = 0.5
const HINDWING_HOUSING_RADIUS = 0.4

/**
 * Helical coil around the rod's shaft: the same CatmullRomCurve3 ->
 * TubeGeometry technique skidGeometry.ts already uses to bend a leg, walked
 * around a helix instead of a knee. `sign` points the coil the same
 * direction as the wing it belongs to (WingRig.ts's own left/right mirror).
 */
function buildSpringGeometry(length: number, coilRadius: number, turns: number, sign: 1 | -1): BufferGeometry {
  const pointsPerTurn = 6
  const count = Math.round(turns * pointsPerTurn)
  const points: Vector3[] = []
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const angle = t * turns * Math.PI * 2
    points.push(new Vector3(sign * t * length, Math.cos(angle) * coilRadius, Math.sin(angle) * coilRadius))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, count, coilRadius * 0.18, 5, false)
}

function buildOneJoint(
  spec: JointSpec,
  sideSign: 1 | -1,
  materials: JointMaterials,
  geometries: BufferGeometry[],
): Group {
  const group = new Group()
  const { attachment, housingRadius, fairingRadius, rodLength } = spec

  // The ball sits ABOVE the fairing capsule's own surface, not merely
  // offset sideways from its axis: the capsule is a cylinder of radius
  // `fairingRadius` running the whole length of this shoulder, so any point
  // offset only in X at the capsule's own Y stays inside it regardless of
  // how far along X it sits (a bug this round's first cut had — the ball
  // rendered fully submerged in the capsule). Clearing `fairingRadius` in Y
  // is what actually breaks the surface; the small X offset only keeps the
  // two housings of a pair from sitting exactly on top of each other.
  const clearance = fairingRadius + housingRadius * 0.6
  const center = new Vector3(
    attachment.x + sideSign * housingRadius * 0.9,
    attachment.y + clearance,
    attachment.z,
  )

  const ballGeometry = new SphereGeometry(housingRadius, 10, 8)
  geometries.push(ballGeometry)
  const ball = new Mesh(ballGeometry, materials.housing)
  ball.position.copy(center)
  group.add(ball)

  // The rod threads through the ball's centre and continues outward toward
  // the wing root — a plain round taper needs no facets to read as machined,
  // the same call wingGeometry.ts already made for the spar itself.
  const rodRadius = housingRadius * 0.22
  const rodGeometry = new CylinderGeometry(rodRadius, rodRadius, rodLength, 6, 1, false)
  rodGeometry.rotateZ(Math.PI / 2) // lay the cylinder's axis along X, same trick as the spar
  rodGeometry.translate(sideSign * rodLength * 0.5, 0, 0)
  geometries.push(rodGeometry)
  const rod = new Mesh(rodGeometry, materials.rod)
  rod.position.copy(center)
  group.add(rod)

  const springGeometry = buildSpringGeometry(rodLength * 0.75, rodRadius * 2.2, 4.5, sideSign)
  geometries.push(springGeometry)
  const spring = new Mesh(springGeometry, materials.rod)
  spring.position.copy(center)
  spring.position.x += sideSign * rodLength * 0.1
  group.add(spring)

  return group
}

/**
 * Two ball-joint-plus-rod-plus-spring clusters per shoulder (one per wing of
 * the pair), at both the forewing and hindwing attachment.
 *
 * @param materials Housing and rod share the worn-metal tone: the reference
 *   shows the whole cluster as one bare-metal fitting, not two materials.
 */
export function buildWingRootJoints(
  forewingAttachment: { x: number; y: number; z: number },
  hindwingAttachment: { x: number; y: number; z: number },
  materials: JointMaterials,
): WingJointParts {
  const group = new Group()
  const geometries: BufferGeometry[] = []

  const specs: JointSpec[] = [
    {
      attachment: forewingAttachment, housingRadius: FOREWING_HOUSING_RADIUS,
      fairingRadius: FOREWING_FAIRING_RADIUS, rodLength: 1.7,
    },
    {
      attachment: hindwingAttachment, housingRadius: HINDWING_HOUSING_RADIUS,
      fairingRadius: HINDWING_FAIRING_RADIUS, rodLength: 1.3,
    },
  ]

  for (const spec of specs) {
    for (const sideSign of [1, -1] as const) {
      group.add(buildOneJoint(spec, sideSign, materials, geometries))
    }
  }

  return { group, geometries }
}
