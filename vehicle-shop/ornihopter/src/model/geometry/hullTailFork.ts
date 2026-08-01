// vehicle-shop/ornihopter/src/model/geometry/hullTailFork.ts
// Two small prongs riding out of the tail boom's own taper: a fork, not a
// point, per .shots/reference/mr-O4copy.jpg and mr-IMG_9440copy.jpg. Read as
// a vertical (up/down) split rather than a left-right one — a left-right
// fork would overlap itself in the side view, and that is where the
// reference calls the fork clearest.
//
// Their roots sit embedded inside the boom's own still-solid cross-section
// at 19.5m aft (hullStations.ts gives ~0.6m half-width there, comfortably
// larger than this shape's 0.34m root), so there is no seam to hide; their
// tips diverge above and below the centreline and taper to a point short of
// hullLoft.ts's own tail point at OVERALL.length, so the craft's measured
// length is still set by the boom alone (bar item: length stays 22.896m).
//
// Deliberately layered ON TOP of the main loft rather than a literal split
// in hullStations.ts's ring: hullProfile.ts's isOutsideHull needs one
// half-width per z, and the wing-clearance tests never sample this far aft
// (WING_ROOTS tops out at 12.2m; this starts past 19m), so leaving the
// envelope functions describing the boom alone here costs nothing real and
// keeps that seam simple — see hullProfile.ts's own header.

import { HALF_LENGTH } from '../../spec'
import { buildRing, loftRingsFlat, type CrossSectionShape } from './hullCrossSection'
import type { LoftMesh } from './hullLoft'

const SHAPE: CrossSectionShape = { deckHalfWidthFrac: 0.5, bellyHalfWidthFrac: 0.6 }

/** (metresAft, centreYMagnitude, halfWidth, halfHeight), root to tip. */
const STATIONS: ReadonlyArray<readonly [number, number, number, number]> = [
  [19.5, 0.1, 0.34, 0.3],
  [20.6, 0.42, 0.24, 0.2],
  [21.8, 0.78, 0.13, 0.1],
  [22.75, 1.05, 0, 0],
]

/** One prong; `sign` +1 diverges above the centreline, -1 below. */
function buildProng(sign: 1 | -1): LoftMesh {
  const zs = STATIONS.map(([metresAft]) => metresAft - HALF_LENGTH)
  const rings = STATIONS.map(([, centreYMag, halfWidth, halfHeight]) =>
    buildRing(halfWidth, halfHeight, SHAPE, 0, sign * centreYMag))
  return { positions: loftRingsFlat(rings, zs) }
}

/** Both prongs, upper then lower. hullGeometry.ts appends both onto the main loft. */
export function buildTailFork(): LoftMesh[] {
  return [buildProng(1), buildProng(-1)]
}
