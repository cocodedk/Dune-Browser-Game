// landscape-shop/sietch/src/model/loftGeometry.ts
// Sweep a per-ring cross-section boundary along Z into a ruled lateral
// surface: rings stitched into quads between adjacent rings. Open at both
// Z ends (no caps) — a tube, not a solid. `ringPointsAt(z)` is called once
// per ring so the boundary can vary along the sweep (vaultScale.ts) —
// every ring must return the SAME point count. Shared by envelope.ts (the
// tapered vault), entrance.ts (a short collar at the mouth) and floor.ts
// (a 2-point-per-ring strip that tapers with the vault), so all three
// surfaces are built by the same math and never drift apart.

import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Point2 } from './crossSection'

/**
 * @param ringPointsAt  Cross-section boundary AT a given z, in order, left
 *   to right. Called once per ring; every call must return the same
 *   number of points.
 * @param zFrom   Z of the first ring (nearer the back, e.g. 0 or a mouth
 *   offset). Rings are spaced evenly toward `zTo`.
 * @param zTo     Z of the last ring.
 * @param rings   Number of rings, minimum 2 (zFrom and zTo themselves).
 */
export function buildRuledTube(
  ringPointsAt: (z: number) => Point2[],
  zFrom: number,
  zTo: number,
  rings: number,
): BufferGeometry {
  const ringCount = Math.max(2, rings)
  const positions: number[] = []
  let segCount = 0

  for (let r = 0; r < ringCount; r++) {
    const t = r / (ringCount - 1)
    const z = zFrom + (zTo - zFrom) * t
    const points = ringPointsAt(z)
    segCount = points.length
    for (const p of points) positions.push(p.x, p.y, z)
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
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
