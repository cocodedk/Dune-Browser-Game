// vehicle-shop/ornihopter/src/model/geometry/tailGeometry.ts
// Small paired tail vanes at the tip of the hull's own aft taper. The hull
// (hullGeometry.ts) already tapers to a fine point over its last several
// metres, standing in for a dragonfly-style tail boom; these two flat vanes
// are the small distinguishing feature that reads as "a tail" rather than
// the fuselage simply ending (reference: .shots/reference/thopter-mr.jpg
// shows small crossed fins at the tail boom's tip).

import { BoxGeometry, type BufferGeometry } from 'three'
import { HALF_LENGTH } from '../../spec'
import { hullHalfWidthAt } from './hullProfile'

/** Craft-local z for the vane pair — inside the hull's own tail taper. */
export const TAIL_VANE_Z = HALF_LENGTH - 1.6
const VANE_SPAN = 1.6
const VANE_CHORD = 0.9
const VANE_THICKNESS = 0.05

export interface TailVanesResult {
  geometry: BufferGeometry
  placements: ReadonlyArray<{ position: { x: number; y: number; z: number }; rotationZ: number }>
}

/** Two vanes canted like a shallow V (not a flat cross) for a touch of dihedral. */
export function buildTailVanes(): TailVanesResult {
  const geometry = new BoxGeometry(VANE_SPAN, VANE_THICKNESS, VANE_CHORD)
  const dropY = -hullHalfWidthAt(TAIL_VANE_Z) * 0.2
  return {
    geometry,
    placements: [
      { position: { x: 0, y: dropY, z: TAIL_VANE_Z }, rotationZ: 0.5 },
      { position: { x: 0, y: dropY, z: TAIL_VANE_Z }, rotationZ: -0.5 },
    ],
  }
}
