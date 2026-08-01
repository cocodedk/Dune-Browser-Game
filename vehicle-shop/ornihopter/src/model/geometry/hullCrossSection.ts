// vehicle-shop/ornihopter/src/model/geometry/hullCrossSection.ts
// The hull's cross-section polygon: an eight-point faceted section, not a
// circle and no longer a plain hexagon.
//
// The kit close-up (docs/dune_ornihopter_kit-3.png) reads, top to bottom, as:
// a flat-ish dorsal deck, an ANGLED UPPER FLANK, a hard chine at the widest
// line running from the nose tip aft along the whole pod, then a long, deeply
// tucked LOWER FLANK down to a narrow keel. The old hexagon had no break
// between deck and chine, so the upper flank was one long face and the deck
// edge read as a soft corner instead of the hard trim line the kit shows.
// Adding the upper-flank vertex costs two triangles per bay and buys the
// chine, the trim line, and a section that reads as machined plate.
//
// Point order, counter-clockwise in the local X-Y plane (+X right, +Y up):
//   0 chine-R  1 upper-R  2 deck-R  3 deck-L  4 upper-L  5 chine-L
//   6 keel-L   7 keel-R
// so the eight lofted panels are, in order: lower-upper-flank R, upper-flank R,
// DECK, upper-flank L, lower-upper-flank L, lower flank L, KEEL, lower flank R.
// hullWeathering.ts paints its v bands against exactly that order.
//
// hullProfile.ts's isOutsideHull and hullLoft.ts's visible mesh both call
// buildRing with the same numbers from hullStations.ts, so the rendered
// surface and the "does a wing clip the hull" check can never disagree — the
// single-source-of-truth discipline this file exists to keep.

export interface Point2 {
  readonly x: number
  readonly y: number
}

export interface CrossSectionShape {
  /** Flat deck half-width, as a fraction of the chine half-width. */
  readonly deckHalfWidthFrac: number
  /** Flat keel half-width, as a fraction of the chine half-width. NARROWER
   *  than the deck fraction over the pod: the close-up's tucked lower flanks. */
  readonly bellyHalfWidthFrac: number
}

/** The chine (widest point) sits a little below the section's vertical centre,
 *  as a fraction of halfHeight. High enough that the lower flank is the long,
 *  strongly tucked face the kit shows, low enough that the deck still reads as
 *  a distinct top surface rather than the whole upper half. */
const CHINE_Y_FRAC = -0.12

/** Height of the upper-flank break, as a fraction of halfHeight. */
const UPPER_Y_FRAC = 0.58

/** How far the upper-flank break sits from the deck edge toward the chine:
 *  0 puts it at the deck half-width, 1 at full beam. Measured against the
 *  first render at 0.7, the section read as a smooth lozenge rather than
 *  machined plate — the deck-to-flank corner was too shallow to catch a
 *  different light value. 0.58 turns it into a real corner while keeping the
 *  section convex at every deck fraction the station table uses (asserted in
 *  hullSlenderness.test.ts, which outwardDistance depends on). */
const UPPER_BLEND = 0.58

/** Vertices per ring. loftRingsFlat reads the count off the ring itself, so a
 *  future section change needs no edit there; this stays exported because
 *  hullWeathering.ts sizes its v bands to it. */
export const RING_SIZE = 8

/**
 * Eight points, counter-clockwise. loftRingsFlat's winding rule depends on
 * this exact order and on the ring being convex, which holds for every
 * deck/belly fraction in hullStations.ts.
 */
export function buildRing(
  halfWidth: number,
  halfHeight: number,
  shape: CrossSectionShape,
  centreX = 0,
  centreY = 0,
): Point2[] {
  const chineY = CHINE_Y_FRAC * halfHeight
  const upperY = UPPER_Y_FRAC * halfHeight
  const deckHalfW = shape.deckHalfWidthFrac * halfWidth
  const keelHalfW = shape.bellyHalfWidthFrac * halfWidth
  const upperHalfW = deckHalfW + (halfWidth - deckHalfW) * UPPER_BLEND
  const local: Point2[] = [
    { x: halfWidth, y: chineY },
    { x: upperHalfW, y: upperY },
    { x: deckHalfW, y: halfHeight },
    { x: -deckHalfW, y: halfHeight },
    { x: -upperHalfW, y: upperY },
    { x: -halfWidth, y: chineY },
    { x: -keelHalfW, y: -halfHeight },
    { x: keelHalfW, y: -halfHeight },
  ]
  return local.map((p) => ({ x: p.x + centreX, y: p.y + centreY }))
}

/**
 * Signed outward distance of (x, y) from a convex, counter-clockwise ring:
 * positive (or within epsilon of zero) means outside-or-on-skin, negative
 * means inside. The max over every edge's outward half-plane — the polygon
 * equivalent of the old ellipse formula, exact for the actual faceted shape
 * instead of an inscribed approximation.
 */
export function outwardDistance(x: number, y: number, ring: readonly Point2[]): number {
  let max = -Infinity
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    const edgeLength = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = (b.y - a.y) / edgeLength
    const ny = -(b.x - a.x) / edgeLength
    max = Math.max(max, (x - a.x) * nx + (y - a.y) * ny)
  }
  return max
}
