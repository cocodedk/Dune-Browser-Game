// landscape-shop/sietch/src/model/loftGeometry.ts
// Sweep a per-ring cross-section boundary along Z into a ruled lateral
// surface: rings stitched into quads between adjacent rings. Open at both
// Z ends (no caps) — a tube, not a solid. `ringAt(z)` is called once
// per ring so the boundary can vary along the sweep (vaultScale.ts) —
// every ring must return the SAME point count. Shared by envelope.ts (the
// tapered vault), entrance.ts (a short collar at the mouth) and floor.ts
// (a 2-point-per-ring strip that tapers with the vault), so all three
// surfaces are built by the same math and never drift apart.
//
// R2: a ring may also carry its own UV per point. The surface layer needs
// it — the shell's U is arc length round the carved section, not the
// point index, and its V is depth into the hall measured from the back
// wall, not the local sweep fraction (the mouth collar sweeps only 2 m of
// a 52 m hall and must still land on the right part of the map).

import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Point2 } from './crossSection'
import { buildCreasedGeometry } from './creasedGrid'

export interface LoftRing {
  points: Point2[]
  /** Per-point [u, v]. Defaults to [index / (count - 1), sweep fraction]. */
  uv?: Array<[number, number]>
}

/**
 * @param ringAt  Cross-section boundary AT a given z, in order, left
 *   to right. Called once per ring; every call must return the same
 *   number of points.
 * @param zFrom   Z of the first ring (nearer the back, e.g. 0 or a mouth
 *   offset). Rings are spaced evenly toward `zTo`.
 * @param zTo     Z of the last ring.
 * @param rings   Number of rings, minimum 2 (zFrom and zTo themselves).
 * @param creaseDeg  R2.1, opt-in. Given, the surface is finished with
 *   crease-angle normals (creasedGrid.ts) instead of a flat average, so a
 *   carved course's riser keeps its own edge instead of being smoothed
 *   into a fillet. The envelope and the mouth collar use it; the floor
 *   (two points per ring, nothing to crease) does not.
 */
export function buildRuledTube(
  ringAt: (z: number) => LoftRing,
  zFrom: number,
  zTo: number,
  rings: number,
  creaseDeg?: number,
): BufferGeometry {
  const ringCount = Math.max(2, rings)
  const positions: number[] = []
  const uvs: number[] = []
  let segCount = 0

  for (let r = 0; r < ringCount; r++) {
    const t = r / (ringCount - 1)
    const z = zFrom + (zTo - zFrom) * t
    const { points, uv } = ringAt(z)
    segCount = points.length
    for (let s = 0; s < points.length; s++) {
      positions.push(points[s].x, points[s].y, z)
      const pair = uv ? uv[s] : [points.length > 1 ? s / (points.length - 1) : 0, t]
      uvs.push(pair[0], pair[1])
    }
  }

  if (creaseDeg !== undefined && segCount > 2) {
    return buildCreasedGeometry({
      rows: ringCount,
      cols: segCount,
      position: new Float32Array(positions),
      uv: new Float32Array(uvs),
    }, creaseDeg)
  }

  const indices: number[] = []
  for (let r = 0; r < ringCount - 1; r++) {
    const ringStart = r * segCount
    const nextStart = (r + 1) * segCount
    for (let s = 0; s < segCount - 1; s++) {
      const a = ringStart + s
      const b = ringStart + s + 1
      const c = nextStart + s
      const d = nextStart + s + 1
      // Two triangles per quad, wound so the surface normal (via
      // computeVertexNormals) faces the tube's interior — the material is
      // still set to DoubleSide (materials.ts) so a raycast from inside
      // hits regardless of winding.
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
