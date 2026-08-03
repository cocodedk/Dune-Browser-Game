// vehicle-shop/ornihopter/src/interior/canopyFrame.ts
// The cabin's roof and the window cut in it, assembled. The surfaces are
// canopyRoof.ts; where any of it goes is canopyLayout.ts, which reads
// model/geometry/canopyPlan.ts so the inside of the canopy cannot land
// anywhere the outside of it does not.
//
// FOUND, round 6b: "There is no canopy. 82% of the upper half of frame is bare
// sky — no brow, no roof, no top rail, no side sills, no bulkhead... the dash
// floats in open air." Measured with interior/sightlines.ts against the shipped
// build: 64% of the forward frame was rays leaving the airframe entirely, and
// 100% of it looking to port. There was no roof because the interior had never
// been rebuilt against the flush deck canopy — round 6a clamped the old liner's
// top edge to CANOPY_SIDE_SILL_Y precisely so it would not seal the cockpit
// shut, and left the metre above it to a later round. This is that round.
//
// The parts, forward to aft: a forward header, an APERTURE fenced by side
// reveals and rails, transverse mullions on the canopy's own station breaks, a
// brow beam at its aft end, and solid roof liner from there to the rear
// bulkhead.

import { Group } from 'three'
import { FLOOR_REAR_Z } from './layout'
import {
  APERTURE_FORE_Z, APERTURE_REAR_Z, roofYAt, roofHalfWidthAt,
  apertureHalfWidthAt, apertureStations, mullionStations,
} from './canopyLayout'
import { hullZSamples } from './hullSection'
import { box, disposeGroup, type Placed } from './sceneUtils'
import { hullLinerMaterial, gunmetalMaterial, machinedDarkMaterial, innerGlazingMaterial } from './materials'
import { bandsOver, roofBand, apertureReveal, innerPane, RAIL_THICKNESS } from './canopyRoof'

/** How far the brow beam hangs below the roof liner. It is the top edge of the
 *  pilot's window, so it is the frame member whose depth decides how much of
 *  the upper frame is structure. */
const BROW_DEPTH = 0.16
const HEADER_DEPTH = 0.12
/** Mullion depth, for whichever stations mullionStations() returns.
 *
 *  ROUND 6f, user finding #2: it USED to be capped instead of this, on the
 *  theory that spec.ts's floorY put the level sightline 43mm under the one
 *  mullion this band ever had (canopyLayout.ts's mullionStations(), at
 *  1.2m aft) and a deeper rib would eat that clearance. That theory was
 *  wrong in a way 43mm of clearance was never going to survive: pitch and
 *  yaw both move the sightline off dead-level, and the cone around
 *  dead-level a pilot's eye actually sweeps is centimetres wide at 1.2m
 *  range, not a knife-edge. interior/forwardCone.test.ts measured it —
 *  126 of 273 rays in a +/-6/+/-10 degree cone hit that one beam. The station
 *  is now dropped from the framed set entirely (canopyPlan.ts's
 *  FRAMED_CANOPY_Z), so this depth no longer has a member at 1.2m to cap;
 *  kept as the mullion depth for whatever FUTURE framed stations
 *  mullionStations() returns, should the aperture band ever gain another
 *  one outside the sightline cone. */
const MULLION_DEPTH = 0.075

/** A transverse beam across the aperture, hanging `depth` below the roof. */
function crossBeam(group: Group, z: number, depth: number, pad: number): void {
  const halfWidth = apertureHalfWidthAt(z) + pad
  if (halfWidth <= 0) return
  const at: Placed = { x: 0, y: roofYAt(z) - depth / 2, z }
  group.add(box(halfWidth * 2, depth, RAIL_THICKNESS * 1.6, gunmetalMaterial(), at))
}

export interface CanopyFrame {
  group: Group
  dispose(): void
}

export function createCanopyFrame(): CanopyFrame {
  const group = new Group()
  group.name = 'canopyFrame'
  const liner = hullLinerMaterial()
  const glass = innerGlazingMaterial()

  for (const band of bandsOver(apertureStations())) {
    roofBand(group, band, liner)
    apertureReveal(group, band)
    innerPane(group, band, glass)
  }
  for (const band of bandsOver(hullZSamples(APERTURE_REAR_Z, FLOOR_REAR_Z, 0.35))) {
    roofBand(group, band, liner)
  }

  // The window's own frame: a header at its forward end, the brow across its
  // aft end, and a mullion on each canopy station between.
  crossBeam(group, APERTURE_FORE_Z + 0.02, HEADER_DEPTH, 0.08)
  crossBeam(group, APERTURE_REAR_Z - 0.02, BROW_DEPTH, 0.1)
  for (const z of mullionStations()) crossBeam(group, z, MULLION_DEPTH, 0.02)

  // Roof ribs aft of the brow, on the same rhythm — structure overhead when
  // the pilot looks up, rather than a blank ceiling.
  for (let z = APERTURE_REAR_Z + 0.55; z < FLOOR_REAR_Z; z += 0.75) {
    const width = roofHalfWidthAt(z)
    if (width <= 0) continue
    group.add(
      box(width * 2, 0.08, 0.12, machinedDarkMaterial(), { x: 0, y: roofYAt(z) - 0.04, z })
    )
  }

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
