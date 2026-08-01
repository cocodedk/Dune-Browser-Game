// vehicle-shop/ornihopter/src/model/geometry/hullLoft.ts
// The main hull loft: hullStations.ts's station table, each turned into a
// hexagon ring (hullCrossSection.ts) and stitched to its neighbour with
// flat-shaded, non-shared vertices — see loftRingsFlat's header for why
// sharing vertices between panels defeats the faceted look entirely.
// hullGeometry.ts appends hullTailFork.ts's prongs onto the same array
// before building the buffer, so the fuselage and its tail fork end up in
// one mesh, matching buildHullGeometry()'s unchanged contract.

import { STATION_Z, hullHalfWidthAt, hullHalfHeightAt, hullShapeAt } from './hullStations'
import { buildRing, loftRingsFlat } from './hullCrossSection'

export interface LoftMesh {
  positions: number[]
}

/** One ring per station in STATION_Z, nose to tail, lofted flat-shaded. */
export function buildHullLoft(): LoftMesh {
  const rings = STATION_Z.map((z) => buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z)))
  return { positions: loftRingsFlat(rings, STATION_Z) }
}
