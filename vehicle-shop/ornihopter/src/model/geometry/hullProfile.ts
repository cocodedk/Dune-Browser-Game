// vehicle-shop/ornihopter/src/model/geometry/hullProfile.ts
// Pure hull cross-section envelope and containment test. No three.js — the
// wing-clearance tests and the actual mesh builder (./hullLoft.ts) both read
// the same station table (./hullStations.ts) and the same ring shape
// (./hullCrossSection.ts), so the rendered surface and "does a wing clip the
// hull" check can never disagree.
//
// Round 3: replaced an elliptical containment test with an exact polygon
// one. The hull itself stopped being a body of revolution (see
// ./hullLoft.ts) — LatheGeometry is circular by construction and cannot
// produce the flat underside and hard chine the reference photographs show
// (.shots/reference/kit-assembled.png, mr-O4copy.jpg) — and isOutsideHull
// had to follow, or it would silently approve a wing clipping a corner the
// old inscribed ellipse had rounded off.

import { hullHalfWidthAt, hullHalfHeightAt, hullShapeAt } from './hullStations'
import { buildRing, outwardDistance } from './hullCrossSection'

export { hullHalfWidthAt, hullHalfHeightAt }

/**
 * True if (x, y) at craft-local z lies outside (or exactly on) the hull's
 * faceted skin at that station. Used both by the wing-clearance tests and
 * available for any part that wants to mount flush with the actual surface.
 */
export function isOutsideHull(x: number, y: number, z: number, epsilon = 1e-6): boolean {
  const halfWidth = hullHalfWidthAt(z)
  const halfHeight = hullHalfHeightAt(z)
  if (halfWidth <= 0 || halfHeight <= 0) return true
  const ring = buildRing(halfWidth, halfHeight, hullShapeAt(z))
  return outwardDistance(x, y, ring) >= -epsilon
}
