// vehicle-shop/ornihopter/src/model/geometry/hullLoft.ts
// The main hull loft, and the flat-shaded ring stitcher both it and
// hullTailFork.ts use: hullStations.ts's station table, each row turned into
// an eight-point ring (hullCrossSection.ts) and stitched to its neighbour
// with non-shared vertices.
//
// PER-PANEL VERTICES ARE DELIBERATE, not an oversight. An indexed loft that
// shares vertices between adjacent panels is what an earlier round shipped,
// and computeVertexNormals() then averages each shared vertex's normal across
// both neighbouring panels — which SMOOTHS the lighting straight across every
// chine, so the render reads as a round tube even though the polygon is a
// hard-edged section. Duplicating vertices per panel means no vertex is ever
// shared between two panels, so computeVertexNormals() cannot blend across an
// edge it should not.
//
// UVs are emitted here for the first time (hullWeathering.ts's maps have
// nothing to land on otherwise): u along the length, one texture cell per
// bay; v around the perimeter, one cell per panel. See hullUv.ts for why the
// cell counts are derived rather than authored.
//
// Winding (A0,A1,B1) then (A0,B1,B0), ring A forward (smaller z) of ring B,
// derived from the ring's CCW convention and confirmed against the built
// geometry edge by edge.

import { hullHalfWidthAt, hullHalfHeightAt, hullShapeAt, hullKeelYAt } from './hullStations'
import { buildRing, type Point2 } from './hullCrossSection'
import { HULL_U_MAX } from './hullUv'
import { isWindowBay, loftStationZs, stationUFraction } from './flankWindow'
import { FLANK_PANELS, bayCanCut, cutFlankBay } from './hullFlankCut'

export interface LoftMesh {
  positions: number[]
  uvs: number[]
}

/**
 * Every consecutive pair of rings, lofted into flat-shaded triangles, with
 * matching UVs spanning [uStart, uEnd] along the length and the full v range
 * around the perimeter.
 */
export function loftRingsFlat(
  rings: readonly Point2[][],
  zs: readonly number[],
  uStart: number,
  uEnd: number,
): LoftMesh {
  const positions: number[] = []
  const uvs: number[] = []
  const bays = Math.max(1, rings.length - 1)

  for (let s = 0; s < rings.length - 1; s++) {
    const uA = uStart + ((uEnd - uStart) * s) / bays
    const uB = uStart + ((uEnd - uStart) * (s + 1)) / bays
    const bay = loftBay(rings[s], rings[s + 1], zs[s], zs[s + 1], uA, uB)
    positions.push(...bay.positions)
    uvs.push(...bay.uvs)
  }
  return { positions, uvs }
}

/**
 * One bay, panel by panel. `skip` drops panels the caller means to emit some
 * other way — round 11's flank window is the only user, and hullFlankCut.ts
 * re-emits exactly the panels it names, minus the opening.
 */
export function loftBay(
  ringA: readonly Point2[],
  ringB: readonly Point2[],
  zA: number,
  zB: number,
  uA: number,
  uB: number,
  skip?: ReadonlySet<number>,
): LoftMesh {
  const positions: number[] = []
  const uvs: number[] = []
  const size = ringA.length
  const push = (p: Point2, z: number, u: number, v: number) => {
    positions.push(p.x, p.y, z)
    uvs.push(u, v)
  }
  for (let k = 0; k < size; k++) {
    if (skip?.has(k)) continue
    const k1 = (k + 1) % size
    const vA = k / size
    const vB = (k + 1) / size
    push(ringA[k], zA, uA, vA)
    push(ringA[k1], zA, uA, vB)
    push(ringB[k1], zB, uB, vB)
    push(ringA[k], zA, uA, vA)
    push(ringB[k1], zB, uB, vB)
    push(ringB[k], zB, uB, vA)
  }
  return { positions, uvs }
}

const ringAt = (z: number): Point2[] =>
  buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))

/**
 * One ring per station, nose to tail, lofted flat-shaded — with the Apache
 * side windows cut out of the upper flanks over their run (flankWindow.ts).
 * The station list is the authored table PLUS the window's two ends, and u is
 * read from the ORIGINAL bay each station falls in, so the painted panel seams
 * land exactly where they did before the cut existed.
 */
export function buildHullLoft(): LoftMesh {
  const zs = loftStationZs()
  const rings = zs.map(ringAt)
  const positions: number[] = []
  const uvs: number[] = []
  const add = (mesh: LoftMesh): void => {
    positions.push(...mesh.positions)
    uvs.push(...mesh.uvs)
  }
  for (let s = 0; s < zs.length - 1; s++) {
    const zA = zs[s]
    const zB = zs[s + 1]
    const uA = HULL_U_MAX * stationUFraction(zA)
    const uB = HULL_U_MAX * stationUFraction(zB)
    const cut = isWindowBay(zA, zB) && bayCanCut(zA, zB)
    add(loftBay(rings[s], rings[s + 1], zA, zB, uA, uB, cut ? FLANK_PANELS : undefined))
    if (cut) add(cutFlankBay(rings[s], rings[s + 1], zA, zB, uA, uB))
  }
  return { positions, uvs }
}
