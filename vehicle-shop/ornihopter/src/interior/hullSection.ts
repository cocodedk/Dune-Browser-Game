// vehicle-shop/ornihopter/src/interior/hullSection.ts
// Round 4b. Exact hull-skin slices for the cabin floor and rear bulkhead: how
// wide the hull's own INTERIOR actually is at a given (y, z), read straight
// off the same ring hullLoft.ts renders and hullProfile.ts's isOutsideHull
// tests (hullCrossSection.ts's buildRing) — not a separately-authored width
// that could disagree with either. See cabinShell.ts's header for the defect
// this exists to close: a floor and bulkhead built at a flat COCKPIT.clearWidth
// (the chine's own width, at the chine's own height) regardless of how much
// narrower the hull actually is at the floor's height, well below the chine.
//
// The ring is convex and bilaterally symmetric (hullCrossSection.ts's own
// header), so its RIGHT-side profile — keel, chine, upper-flank break, deck,
// bottom to top — is all either slice needs; the left side is always the
// same x, negated. A floor slice fixes y and reads width across a span of z;
// a bulkhead slice fixes z and reads width across a span of y. Both go
// through the one function below so neither can drift from the other.

import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt } from '../model/geometry/hullProfile'
import { hullShapeAt } from '../model/geometry/hullStations'
import { buildRing, type Point2 } from '../model/geometry/hullCrossSection'

/** Kept strictly inboard of the skin rather than touching it, so the liner
 *  never sits exactly coincident with the hull mesh's own faces (z-fighting)
 *  and isOutsideHull-based containment checks get a real margin, not a
 *  knife-edge one. Mirrors cabinShell.ts's own SILL_MARGIN precedent. */
export const HULL_INSET = 0.05

/** Right-side ring profile at z, bottom to top: keel, chine, upper-flank
 *  break, deck — exactly ring indices 7, 0, 1, 2 (hullCrossSection.ts's own
 *  point-order comment). Four points, three straight edges. */
function rightProfile(z: number): Point2[] {
  const ring = buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
  return [ring[7], ring[0], ring[1], ring[2]]
}

/**
 * Interior half-width of the hull skin at absolute height y, craft-local z,
 * inset by HULL_INSET. Zero if y sits within HULL_INSET of the deck or the
 * keel at this station — not just AT or beyond them.
 *
 * The keel and deck are FLAT caps (hullCrossSection.ts's own doc comment:
 * "flat keel half-width"), each a horizontal edge with an outward normal of
 * (0, -1) or (0, 1). HULL_INSET only ever shifts a point in X, so against a
 * near-horizontal edge that shift buys almost no perpendicular clearance —
 * a point a millimetre above the keel line would pass the OLD `y <= bottom.y`
 * cutoff and then read as outside-with-margin against the keel edge itself,
 * regardless of how far it was pulled inward in X. Requiring real vertical
 * clearance from both caps closes that gap. It also means a fixed-height
 * floor cannot ramp smoothly to zero at the exact nose crossover where the
 * hull first grows deep enough to reach it — the keel is flat, so the
 * instant the hull is deep enough at all, the full keel width is already
 * there. See this round's report for the measured crossover and why a
 * multi-segment mesh turns that jump into a visually gradual wedge anyway.
 */
export function hullInteriorHalfWidthAt(y: number, z: number): number {
  const profile = rightProfile(z)
  const bottom = profile[0]
  const top = profile[profile.length - 1]
  if (y <= bottom.y + HULL_INSET || y >= top.y - HULL_INSET) return 0
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]
    const b = profile[i + 1]
    if (y >= a.y && y <= b.y) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y)
      return Math.max(0, a.x + t * (b.x - a.x) - HULL_INSET)
    }
  }
  return 0
}

/**
 * The ring's own interior vertical breakpoints at z (chine, upper-flank)
 * within [yMin, yMax] — the exact y's a bulkhead slice must land on to trace
 * the polygon's real corners instead of a chord that cuts across them.
 *
 * yMin/yMax are first clipped to the SAME safe band hullInteriorHalfWidthAt
 * enforces (HULL_INSET clear of the keel and deck caps), not used verbatim.
 * A caller that asks for [floorY, ceilingY] and gets back a range starting
 * above floorY is not a bug: it is hullInteriorHalfWidthAt(floorY, z) itself
 * returning 0 there, and this function's whole job is to hand back
 * breakpoints that function will answer with a genuinely safe width at every
 * one of them, INCLUDING the two ends — a caller that used yMin/yMax
 * unclipped as the ends of its outermost bands got exactly this round's bug:
 * an x=0 "pinch" vertex at (0, yMin, z), which is safe in X by construction
 * but was never checked for clearance in Y, and sat as little as 0.009m from
 * the keel cap. Returns an empty array if the safe band and [yMin, yMax]
 * do not overlap at all.
 */
export function hullSectionBreakpoints(z: number, yMin: number, yMax: number): number[] {
  const profile = rightProfile(z)
  const safeLo = Math.max(yMin, profile[0].y + HULL_INSET)
  const safeHi = Math.min(yMax, profile[profile.length - 1].y - HULL_INSET)
  if (safeLo >= safeHi) return []
  const inner = profile
    .slice(1, -1)
    .map((p) => p.y)
    .filter((y) => y > safeLo && y < safeHi)
  return [safeLo, ...inner, safeHi]
}
