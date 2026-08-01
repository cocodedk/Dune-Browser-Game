// vehicle-shop/ornihopter/src/model/geometry/hullCrossSection.ts
// The hull's cross-section polygon: a faceted hexagon (flat dorsal deck,
// hard chine at the widest point, flat ventral belly), not a circle. This is
// the fix for the "cigar fuselage" defect (progress.md, Round 3) — a
// LatheGeometry revolve is circular by construction and cannot produce a
// chine or a flat underside; lofting hexagons instead of circles
// (hullLoft.ts) is the only change needed to get hard edges.
//
// hullProfile.ts's isOutsideHull and hullLoft.ts's visible mesh both call
// buildRing with the same (halfWidth, halfHeight, shape) numbers from
// hullStations.ts, so the rendered surface and the containment test can
// never disagree — the single-source-of-truth discipline this file exists
// to keep (see hullProfile.ts's own header for what broke before it did).

export interface Point2 {
  readonly x: number
  readonly y: number
}

export interface CrossSectionShape {
  /** Flat deck half-width, as a fraction of the chine half-width. */
  readonly deckHalfWidthFrac: number
  /** Flat belly half-width, as a fraction of the chine half-width. Wider
   *  than the deck fraction reads as "flat underside" (kit-assembled.png). */
  readonly bellyHalfWidthFrac: number
}

/** The chine (widest point) sits below the vertical centre, as a fraction of
 *  halfHeight — a low hard chine with a short belly rise and a tall flank up
 *  to the deck, the boat-hull look the reference photographs show. */
const CHINE_Y_FRAC = -0.3

/** Vertices per ring. hullLoft.ts and hullTailFork.ts both loft rings this size. */
const RING_SIZE = 6

/**
 * Six points, counter-clockwise in the local X-Y plane (+X right, +Y up):
 * chine-right, deck-right, deck-left, chine-left, belly-left, belly-right.
 * loftRingsFlat's winding rule depends on this exact order and on the ring
 * being convex, which holds whenever both shape fractions are below 1.
 */
export function buildRing(
  halfWidth: number,
  halfHeight: number,
  shape: CrossSectionShape,
  centreX = 0,
  centreY = 0,
): Point2[] {
  const chineY = CHINE_Y_FRAC * halfHeight
  const deckHalfW = shape.deckHalfWidthFrac * halfWidth
  const bellyHalfW = shape.bellyHalfWidthFrac * halfWidth
  const local: Point2[] = [
    { x: halfWidth, y: chineY },
    { x: deckHalfW, y: halfHeight },
    { x: -deckHalfW, y: halfHeight },
    { x: -halfWidth, y: chineY },
    { x: -bellyHalfW, y: -halfHeight },
    { x: bellyHalfW, y: -halfHeight },
  ]
  return local.map((p) => ({ x: p.x + centreX, y: p.y + centreY }))
}

/**
 * Signed outward distance of (x, y) from a convex, counter-clockwise ring:
 * positive (or within epsilon of zero) means outside-or-on-skin, negative
 * means inside. The max over every edge's outward half-plane — the polygon
 * equivalent of the old ellipse formula `(x/a)^2 + (y/b)^2 >= 1 - epsilon`,
 * exact for the actual faceted shape instead of an inscribed approximation.
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

/**
 * Every consecutive pair of rings, lofted into flat-shaded triangles: each
 * of the RING_SIZE side panels gets its OWN four vertices (never shared with
 * its neighbour), as plain (x, y, z) triples appended straight into a
 * non-indexed position array. This is deliberate, not an oversight — an
 * indexed loft sharing vertices between adjacent panels is exactly what the
 * previous LatheGeometry-successor round shipped, and computeVertexNormals()
 * then averages each shared vertex's normal across both neighbouring
 * panels, which SMOOTHS the lighting straight across every chine — the
 * render still reads as a round tube even though the polygon itself is a
 * hard-edged hexagon (measured: .shots/thopter-shop/top.png before this
 * fix). Duplicating vertices per panel means no vertex is ever shared
 * between two different panels, so computeVertexNormals() cannot blend
 * across an edge it should not.
 *
 * Winding (A0,A1,B1) then (A0,B1,B0), ring A forward (smaller z) of ring B,
 * derived by hand from the ring's CCW convention (cross-product worked
 * through for a shoulder edge and a belly edge, both outward) and confirmed
 * against the actual built geometry, edge by edge, station by station.
 */
export function loftRingsFlat(rings: readonly Point2[][], zs: readonly number[]): number[] {
  const positions: number[] = []
  const push = (p: Point2, z: number) => positions.push(p.x, p.y, z)
  for (let s = 0; s < rings.length - 1; s++) {
    const ringA = rings[s]
    const ringB = rings[s + 1]
    const zA = zs[s]
    const zB = zs[s + 1]
    for (let k = 0; k < RING_SIZE; k++) {
      const k1 = (k + 1) % RING_SIZE
      push(ringA[k], zA); push(ringA[k1], zA); push(ringB[k1], zB)
      push(ringA[k], zA); push(ringB[k1], zB); push(ringB[k], zB)
    }
  }
  return positions
}
