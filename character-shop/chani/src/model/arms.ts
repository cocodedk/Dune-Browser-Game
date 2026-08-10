// character-shop/chani/src/model/arms.ts
// One arm = a deltoid cap, a tapering tube shoulder-to-wrist, and a hand
// that overlaps back INTO the sleeve. R1 pass 3 fixes three findings:
//
//   - The shoulder line was a hard flat seam where the arm butted against
//     the torso's top ring. A deltoid blob now caps the joint, overlapping
//     the torso by ~40mm and the arm's first tube ring completely, so the
//     silhouette runs unbroken from ribcage to bicep and the shoulder has
//     front-to-back volume instead of an edge.
//   - The hand hung ~20mm below the cuff with background showing through
//     the gap at both wrists. The hand's ellipsoid now starts ABOVE the
//     wrist ring and the tube runs one point further, deep inside it: the
//     tube pinches to 24mm at the wrist while the hand swells to 34mm below
//     it, which is a wrist, and it can no longer separate.
//   - Radii read bicep (40) > elbow (33) < forearm (37) > wrist (24) in mm,
//     so the arm has articulation instead of one thickness; a small forward
//     drift in Z keeps the arms ahead of the body's coronal plane, which is
//     what stops the far arm reading as a detached blade in profile.
//
// armR is armL mirrored in X by the same function with the sign flipped, so
// bilateral symmetry holds by construction.

import type { Group, Mesh } from 'three'
import type { Proportions } from './proportions'
import type { ChaniMaterials } from './materials'
import { tube, blob, type Point3 } from './primitives'

/** Arm-local: origin is the shoulder joint, +Y up, -Z forward. Authored
 *  directly rather than swept from lean angles — an elbow that sits 129mm
 *  out and 320mm down is readable; two chained rotations are not. */
const PATH: readonly Point3[] = [
  // Buried inside the deltoid, with room to spare: the tube has no end
  // caps, so a first ring that pokes out of its parent mass shows the
  // background straight through the limb. The first pass-3 capture had
  // exactly that at the thigh (legs.ts) and it cut a notch in the hip.
  { x: -0.014, y: -0.022, z: 0.004 },
  { x: 0.022, y: -0.088, z: 0 },
  { x: 0.062, y: -0.190, z: -0.006 },
  { x: 0.100, y: -0.268, z: -0.010 },
  // Elbow: a DIRECTION break (upper arm 27.6deg off vertical, forearm
  // 7.4deg) landing on a RADIUS pinch (40 -> 29 -> 37mm). Pass 3a had the
  // direction change but carried 33mm through it, so the joint read as a
  // bend in a hose rather than an elbow.
  { x: 0.131, y: -0.322, z: -0.013 },
  { x: 0.145, y: -0.388, z: -0.018 },
  { x: 0.156, y: -0.474, z: -0.026 },
  { x: 0.167, y: -0.600, z: -0.034 },
  { x: 0.172, y: -0.650, z: -0.040 },
]
const RADII = [0.046, 0.043, 0.040, 0.035, 0.029, 0.037, 0.033, 0.023, 0.010]
const DEPTH = [1, 1.05, 1.08, 1.06, 0.98, 1.06, 1.02, 0.95, 0.85]

/** Wrist -> knuckles -> fingertip, in the same arm-local frame. A mitten,
 *  not a paddle: 46mm across the knuckles is the SAME width as the sleeve's
 *  wrist ring, it is only 26mm thick (DEPTH), and it tapers to a point.
 *  Pass 3a used one ellipsoid 67mm across on a 46mm wrist, which is what
 *  read as a blob. The first ring is buried in the sleeve and the sleeve's
 *  last ring is buried in this, so neither open end can show. */
const HAND_PATH: readonly Point3[] = [
  { x: 0.164, y: -0.578, z: -0.030 },
  { x: 0.170, y: -0.626, z: -0.037 },
  { x: 0.174, y: -0.678, z: -0.043 },
  { x: 0.177, y: -0.722, z: -0.048 },
  { x: 0.179, y: -0.746, z: -0.051 },
]
// Full width is HELD from knuckles through fingers and only rounds off over
// the last 24mm. Tapering straight from the knuckles to a point — the first
// try at this — turns a mitten into a talon.
// Knuckles 52mm across a 46mm wrist — 13% over, against the 46% the pass-3a
// ellipsoid ran. Exactly wrist-width read as a pointed sleeve-end rather
// than a hand; the palm needs to be findable, just not a paddle.
const HAND_RADII = [0.018, 0.026, 0.025, 0.019, 0.006]
const HAND_DEPTH = [0.62, 0.58, 0.55, 0.52, 0.5]

function buildOneArm(group: Group, side: -1 | 1, p: Proportions, mat: ChaniMaterials): Mesh[] {
  const path = PATH.map((q) => ({ x: side * q.x, y: q.y, z: q.z }))
  const arm = tube(path, RADII, mat.fabric, 14, DEPTH)
  arm.name = side < 0 ? 'armMassL' : 'armMassR'

  // Raised 10mm and made 8% taller in pass 3b so the cap reaches y=1.503
  // rather than 1.488. The band a critic reads as "the shoulders" is the
  // strip above the arms; with the cap stopping below it, the widest thing
  // in that strip was the trapezius and the figure measured pear-shaped
  // even though the mesh holds spec's 195/165 exactly.
  const deltoid = blob(p.shoulderHalfWidth * 0.318, { x: 0.95, y: 1.13, z: 0.9 }, mat.fabric, 14)
  deltoid.position.set(side * -0.012, -0.032, 0.004)
  deltoid.name = side < 0 ? 'deltoidL' : 'deltoidR'

  const hand = tube(
    HAND_PATH.map((q) => ({ x: side * q.x, y: q.y, z: q.z })),
    HAND_RADII, mat.skin, 12, HAND_DEPTH,
  )
  hand.name = side < 0 ? 'handL' : 'handR'

  group.add(arm, deltoid, hand)
  return [arm, deltoid, hand]
}

export function buildArms(groups: { armL: Group; armR: Group }, p: Proportions, mat: ChaniMaterials): Mesh[] {
  return [
    ...buildOneArm(groups.armL, -1, p, mat),
    ...buildOneArm(groups.armR, 1, p, mat),
  ]
}
