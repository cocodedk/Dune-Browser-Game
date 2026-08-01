// vehicle-shop/ornihopter/src/model/geometry/canopyGeometry.ts
// A single faceted glass shell over the cockpit, proud of the hull's own
// nose taper rather than a boolean cut into it — the simplest correct shape
// for this round (see Ornithopter.ts's header). Low sphere-segment count
// reads as distinct angular panes once flatShading is on, matching the
// reference's wedge-shaped multi-pane greenhouse
// (.shots/reference/thopter-mr.jpg, mr-O4copy.jpg) rather than a smooth
// bubble.
//
// Sized and placed entirely within the hull's own nose-to-tail span (well
// clear of the nose tip and of every WING_ROOTS station) so it never
// enlarges the craft's overall length past OVERALL.length — see the
// bounding-box test in Ornithopter.test.ts.

import { SphereGeometry, type BufferGeometry } from 'three'
import { HALF_LENGTH } from '../../spec'
import { hullHalfWidthAt, hullHalfHeightAt } from './hullProfile'

/** Centre of the canopy dome, craft-local z — well inside the hull's nose taper. */
export const CANOPY_Z = -HALF_LENGTH + 3.0
const CANOPY_HALF_LENGTH = 2.4

export interface CanopyPlacement {
  geometry: BufferGeometry
  position: { x: number; y: number; z: number }
}

export function buildCanopy(): CanopyPlacement {
  const scaleX = hullHalfWidthAt(CANOPY_Z) * 0.95
  const scaleY = hullHalfHeightAt(CANOPY_Z) * 1.1
  const geometry = new SphereGeometry(1, 8, 6)
  geometry.scale(scaleX, scaleY, CANOPY_HALF_LENGTH)
  return {
    geometry,
    position: { x: 0, y: hullHalfHeightAt(CANOPY_Z) * 0.4, z: CANOPY_Z },
  }
}
