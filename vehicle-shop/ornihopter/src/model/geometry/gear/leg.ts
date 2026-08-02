// vehicle-shop/ornihopter/src/model/geometry/gear/leg.ts
// One leg, as the kit builds one (docs/dune_ornihopter_kit-3.png, the
// close-up): a hip boss faired out of the lower flank, an angled femur made
// of PAIRED PLATES with a slot down the middle, a knee knuckle, a steeper
// tibia, and a small spade foot.
//
// Six swept plates, 72 triangles. The two femur rails are one segment each,
// swept with equal and opposite Section.offset: they overlap into a solid
// plate at the hip and open into a real cutout toward the knee, which is what
// the close-up shows — a slot that is widest near the boss and closes at the
// knuckle. Modelling it as one plate with a hole would cost four times the
// triangles for the same silhouette.
//
// Everything is emitted in CRAFT-LOCAL space for the RIGHT side only.
// gearGeometry.ts mirrors the finished buffer; see its header for why the
// mirrored copy cannot reuse the same index order.

import { pushSegment, PAD_AXIS, type MeshBuffers, type Section, type Vec3 } from './plate'
import { FOOT_TOP, GROUND_Y, type GearLeg, type Point3 } from './stance'

// Thicknesses are set for the SIDE view, where a leg plate is seen edge-on
// and its thickness is the only width it has. At the shot tool's framing the
// craft renders about 25 px per metre, so 0.22m of plate is five pixels —
// the same apparent bar the old cylinder strut had. Anything thinner and the
// legs go back to reading as wire whatever their silhouette does.
const HIP_ROOT: Section = { halfBreadth: 0.5, halfThick: 0.34 }
const HIP_TIP: Section = { halfBreadth: 0.38, halfThick: 0.22 }
/** How far proud of the skin the hip boss stands before the femur starts. */
const HIP_PROUD = 0.16
const FEMUR_START = 0.05

const RAIL_ROOT_OFFSET = 0.22
const RAIL_KNEE_OFFSET = 0.1
const RAIL_ROOT: Section = { halfBreadth: 0.145, halfThick: 0.11 }
const RAIL_KNEE: Section = { halfBreadth: 0.12, halfThick: 0.082 }

const KNUCKLE: Section = { halfBreadth: 0.25, halfThick: 0.135 }
const KNUCKLE_REACH = 0.15

const TIBIA_ROOT: Section = { halfBreadth: 0.23, halfThick: 0.115 }
const TIBIA_TIP: Section = { halfBreadth: 0.135, halfThick: 0.072 }

const FOOT_HEEL: Section = { halfBreadth: 0.19, halfThick: FOOT_TOP / 2 }
const FOOT_TOE: Section = { halfBreadth: 0.085, halfThick: 0.055 }
const HEEL_BEHIND = 0.3
const TOE_AHEAD = 0.52

function vec(p: Point3): Vec3 {
  return [p.x, p.y, p.z]
}

function towards(from: Vec3, to: Vec3): Vec3 {
  const d: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const length = Math.hypot(d[0], d[1], d[2]) || 1
  return [d[0] / length, d[1] / length, d[2] / length]
}

function walk(from: Vec3, direction: Vec3, distance: number): Vec3 {
  return [
    from[0] + direction[0] * distance,
    from[1] + direction[1] * distance,
    from[2] + direction[2] * distance,
  ]
}

/** Horizontal part of a direction — the foot pad lies flat, so it follows
 *  where the tibia is REACHING, not the angle it comes down at. */
function flatten(direction: Vec3): Vec3 {
  const length = Math.hypot(direction[0], direction[2]) || 1
  return [direction[0] / length, 0, direction[2] / length]
}

function withOffset(section: Section, offset: number): Section {
  return { ...section, offset }
}

/** Six segments, 72 triangles, all in craft-local space. */
export function pushLeg(out: MeshBuffers, leg: GearLeg): void {
  const hip = vec(leg.hip)
  const skin = vec(leg.hipSkin)
  const knee = vec(leg.knee)
  const ankle = vec(leg.ankle)
  const outward = towards(hip, skin)
  const boss = walk(skin, outward, HIP_PROUD)
  pushSegment(out, hip, boss, HIP_ROOT, HIP_TIP)

  const femurRoot = walk(skin, outward, FEMUR_START)
  for (const sign of [1, -1]) {
    pushSegment(
      out, femurRoot, knee,
      withOffset(RAIL_ROOT, sign * RAIL_ROOT_OFFSET),
      withOffset(RAIL_KNEE, sign * RAIL_KNEE_OFFSET),
    )
  }

  const femurAxis = towards(femurRoot, knee)
  const tibiaAxis = towards(knee, ankle)
  pushSegment(
    out,
    walk(knee, femurAxis, -KNUCKLE_REACH),
    walk(knee, tibiaAxis, KNUCKLE_REACH),
    KNUCKLE, KNUCKLE,
  )
  pushSegment(out, knee, ankle, TIBIA_ROOT, TIBIA_TIP)

  // The pad's underside sits ON the ground plane at both ends: each ring's
  // centre is exactly its own halfThick above GROUND_Y, so tapering the toe
  // thinner slopes the TOP of the foot down without lifting the sole. (The
  // sole rises by 0.2mm across the taper, from the section staying square to
  // a very slightly inclined sweep — four orders under the 0.01m the stance
  // test allows.)
  const reach = flatten(tibiaAxis)
  const heel = walk([leg.foot.x, GROUND_Y + FOOT_HEEL.halfThick, leg.foot.z], reach, -HEEL_BEHIND)
  const toe = walk([leg.foot.x, GROUND_Y + FOOT_TOE.halfThick, leg.foot.z], reach, TOE_AHEAD)
  pushSegment(out, heel, toe, FOOT_HEEL, FOOT_TOE, PAD_AXIS)
}
