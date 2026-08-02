// vehicle-shop/ornihopter/src/model/geometry/gear/hipSeat.ts
// Finding a point on — and a point INSIDE — the hull's lower flank.
//
// Split out of ./stance.ts, which was the only caller and which crossed 200
// lines carrying both. It is also the half worth reading on its own: the
// recorded defect the whole round starts from is a gear that attached "where
// there is little hull", and everything that stops that from recurring is
// here rather than in the stance table.
//
// Nothing guesses an (x, y). Both functions bisect against
// hullCrossSection.ts's real faceted ring, the same surface hullLoft.ts
// renders — the discipline wing/rootPod.ts's seatOnHull established for the
// deck, pointed downward for the belly. A guessed normal would not do: the
// lower flank's slope changes station to station (hullStations.ts's bellyFrac
// column runs 0.42 at the nose to 0.65 at the tail), so only a measured
// signed distance can promise a given depth of bite.

import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt } from '../hullProfile'
import { hullShapeAt } from '../hullStations'
import { buildRing, outwardDistance } from '../hullCrossSection'

export interface Point3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Signed distance outward from the hull skin: negative is inside. */
export function skinDistanceAt(x: number, y: number, z: number): number {
  const ring = buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
  return outwardDistance(x, y, ring)
}

/**
 * The hull's LOWER-FLANK surface at craft-local z, at `fraction` of the
 * station's own half-width. Bisects Y downward from the section's keel line
 * (inside, by hullProfile.test.ts's "encloses its own axis" case) to that
 * line minus the half-height (the keel plate, on-or-outside by construction).
 */
export function lowerFlankSeat(z: number, fraction: number): Point3 {
  const x = fraction * hullHalfWidthAt(z)
  const centreY = hullKeelYAt(z)
  let inside = centreY
  let outside = centreY - hullHalfHeightAt(z)
  for (let i = 0; i < 48; i++) {
    const mid = (inside + outside) / 2
    if (skinDistanceAt(x, mid, z) >= 0) outside = mid
    else inside = mid
  }
  return { x, y: (inside + outside) / 2, z }
}

/** The seat pulled back along the ray toward its own section centre until it
 *  is exactly `depth` inside the skin — the leg's anchor. */
export function burySeat(seat: Point3, depth: number): Point3 {
  const centreY = hullKeelYAt(seat.z)
  const at = (t: number): Point3 => ({
    x: seat.x * (1 - t),
    y: seat.y + (centreY - seat.y) * t,
    z: seat.z,
  })
  let shallow = 0
  let deep = 1
  for (let i = 0; i < 48; i++) {
    const t = (shallow + deep) / 2
    const p = at(t)
    if (skinDistanceAt(p.x, p.y, p.z) > -depth) shallow = t
    else deep = t
  }
  return at((shallow + deep) / 2)
}
