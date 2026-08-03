// vehicle-shop/harvester/src/model/rounded.ts
// One shared helper so every component rounds its big masses the same way.
// The film harvester is heavy and soft-edged — rounded boxes for the large
// forms, sharp boxes kept for thin structural detail (rails, cleats, teeth,
// lips), which is the industrial contrast the machine actually has.

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/** A rounded box, the film harvester's heavy soft-edged forms. `radius` is
 *  the corner radius in metres and must stay below half the smallest
 *  dimension; `segments` is the resolution per corner. */
export function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 3,
): RoundedBoxGeometry {
  return new RoundedBoxGeometry(width, height, depth, segments, radius)
}
