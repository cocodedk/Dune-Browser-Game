// vehicle-shop/ornihopter/src/model/geometry/gear/skid.ts
// The foot: a horizontal skid bar with a slot through it, not a spade.
//
// docs/profiles/kit-dossier.md §a, measured off `Gear_left.stl`: the foot "is
// itself a hollow elongated rectangular loop, i.e. a flat bar lying along the
// ground. That foot really does read as a horizontal skid bar, not a wheel or
// a point." The assembled photograph agrees and adds the bit a flat plate
// cannot show — docs/dune_ornihopter_kit-2.png's front leg lands on a bar
// with an UPTURNED toe and a visible hole just forward of where the struts
// come down.
//
// So the loop here is two fore-aft rails with a real gap between them, closed
// at the back by the tie the tibia lands on and at the front by the upturned
// toe blade. The gap IS the kit's slot; nothing has to be cut.
//
// LONG AXIS IS FORE-AFT, always. The spade this replaces pointed wherever the
// tibia happened to be reaching, which for the middle pair is very nearly
// straight outboard — a foot lying across the direction of travel. A skid
// takes its load along the craft's axis.
//
// SOLE. Only the two rails touch the ground plane, and they touch it with a
// flat bottom face over their whole length: gearMesh.test.ts counts exactly
// four sole triangles per leg and checks every one points at the ground. The
// tie and the toe blade are lifted clear (their lowest points sit 0.06m and
// 0.09m above the plane), which is what keeps that count exact and the
// stance's one-plane guarantee provable from the mesh.

import { pushSegment, PAD_AXIS, type MeshBuffers, type Section, type Vec3 } from './plate'
import { FOOT_TOP, GROUND_Y, type GearLeg } from './stance'

export const SKID = {
  /** Half the gap between the rail centrelines. */
  halfGap: 0.2,
  railHalfBreadth: 0.1,
  /** Sole on the plane, top at FOOT_TOP — the ankle height stance.ts owns. */
  railHalfThick: FOOT_TOP / 2,
  /** How far the rails run aft of the ankle, and forward of it before the toe
   *  kicks up. -Z is forward, so "forward" is a subtraction. */
  heelBehind: 0.46,
  toeBreak: 0.7,
  /** Where the upturned tip finishes, and how far it has risen by then. */
  toeAhead: 1.12,
  toeRise: 0.34,
  toeHalfBreadth: 0.3,
  toeHalfThick: 0.055,
  /** The tie the tibia lands on, spanning the rails at the ankle station. */
  tieHalfLong: 0.13,
  tieHalfThick: 0.07,
  tieCentreY: 0.13,
} as const

/** Total fore-aft length of one skid — the number the anatomy test scans. */
export const SKID_LENGTH = SKID.heelBehind + SKID.toeAhead

const RAIL: Section = { halfBreadth: SKID.railHalfBreadth, halfThick: SKID.railHalfThick }
const TIE: Section = { halfBreadth: SKID.tieHalfLong, halfThick: SKID.tieHalfThick }
const TOE: Section = { halfBreadth: SKID.toeHalfBreadth, halfThick: SKID.toeHalfThick }

/** Four segments, 48 triangles, in craft-local space for the right side. */
export function pushSkid(out: MeshBuffers, leg: GearLeg): void {
  const x = leg.foot.x
  const z = leg.foot.z
  const railY = GROUND_Y + SKID.railHalfThick
  for (const side of [1, -1] as const) {
    const railX = x + side * SKID.halfGap
    pushSegment(
      out,
      [railX, railY, z + SKID.heelBehind],
      [railX, railY, z - SKID.toeBreak],
      RAIL, RAIL, PAD_AXIS,
    )
  }

  // Rail CENTRE to rail centre plus a rail half-breadth each way, so the tie
  // caps the rails' outer faces instead of stopping short inside them.
  const reach = SKID.halfGap + SKID.railHalfBreadth
  const tieY = GROUND_Y + SKID.tieCentreY
  pushSegment(out, [x - reach, tieY, z], [x + reach, tieY, z], TIE, TIE, PAD_AXIS)

  const toeRoot: Vec3 = [x, tieY, z - SKID.toeBreak]
  const toeTip: Vec3 = [x, tieY + SKID.toeRise, z - SKID.toeAhead]
  pushSegment(out, toeRoot, toeTip, TOE, TOE, PAD_AXIS)
}
