// vehicle-shop/ornihopter/src/model/geometry/gearGeometry.ts
// Landing gear: one strut + one foot pad per mount, both sides — spec.ts
// GEAR.stationsFromNose x2. Mounted on the belly (underside of the hull's
// own cross-section at that z) rather than at a fixed height, so it sits
// flush with the actual hull skin at every station instead of floating or
// burying.

import { CylinderGeometry, BoxGeometry, type BufferGeometry } from 'three'
import { GEAR, HALF_LENGTH } from '../../spec'
import { hullHalfWidthAt, hullHalfHeightAt } from './hullProfile'

const STRUT_RADIUS = 0.09
const FOOT_WIDTH = 0.5
const FOOT_HEIGHT = 0.18

export interface GearLegMount {
  x: number
  /** World-ish (craft-local) Y where the strut's top meets the belly. */
  hipY: number
  z: number
}

/** Three stations, both sides — six legs total. */
export const GEAR_LEG_MOUNTS: readonly GearLegMount[] = GEAR.stationsFromNose.flatMap((metresAft) => {
  const z = -HALF_LENGTH + metresAft
  const hipY = -hullHalfHeightAt(z) * 0.85
  const x = hullHalfWidthAt(z) * 0.5
  return [
    { x, hipY, z },
    { x: -x, hipY, z },
  ]
})

export interface GearGeometries {
  strut: BufferGeometry
  foot: BufferGeometry
}

/** One strut + one foot geometry, reused (via per-instance transform) across every leg mount. */
export function buildGearGeometries(): GearGeometries {
  const strut = new CylinderGeometry(STRUT_RADIUS, STRUT_RADIUS * 1.3, GEAR.strutLength, 8)
  // Cylinder is centred on its own local origin; shift so local y=0 is the TOP (hip) end.
  strut.translate(0, -GEAR.strutLength / 2, 0)
  const foot = new BoxGeometry(FOOT_WIDTH, FOOT_HEIGHT, GEAR.footLength)
  return { strut, foot }
}

/** Vertical drop from a mount's hip to the centre of its foot pad. */
export function footDropFromHip(): number {
  return GEAR.strutLength + FOOT_HEIGHT / 2
}
