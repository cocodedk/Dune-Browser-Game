// landscape-shop/cliff/src/model/skirtApron.ts
// Everything below y = 0: the authored rock skirt the adapter seats into the
// procedural terrain, raking forward into a sand apron as it goes down
// ("apron slopes outward", docs/gauntlet-loop.md's cliff correctness line).
//
// Its columns come from the BAKE'S OWN front outline (massifBake.json), not
// from a hand-authored profile, so the skirt and the rock can never disagree
// about where the base of the massif is — the two are derived from the same
// geometry.

import type { Mesh } from 'three'
import { buildGridGeometry, meshFrom, type GridColumns } from './grid'
import { MASSIF_BAKE } from './massif'
import { PALETTE } from '../spec'

const ROWS_EACH = 5
// How far the apron leans forward (more negative z) by the time it reaches
// the skirt floor, clamped so nothing outruns the entrance's own frontmost
// plane (minZ, passed in from Cliff.ts).
const APRON_LEAN_M = 14

function buildBand(
  minZ: number, yTop: number, yBottom: number,
  tStart: number, tEnd: number, color: number, name: string,
): Mesh {
  const { xs, zs } = MASSIF_BAKE.outline
  const columns: GridColumns = xs.map((x, i) => {
    const baseZ = zs[i]
    const points = []
    for (let r = 0; r <= ROWS_EACH; r++) {
      const t = tStart + ((tEnd - tStart) * r) / ROWS_EACH
      const y = yTop + (yBottom - yTop) * (r / ROWS_EACH)
      const z = Math.max(minZ, baseZ - t * APRON_LEAN_M)
      points.push({ x, y, z })
    }
    return points
  })
  const mesh = meshFrom(buildGridGeometry(columns), color)
  mesh.name = name
  return mesh
}

export function buildSkirtApron(skirtDepthM: number, minZ: number): Mesh[] {
  const midY = -skirtDepthM / 2
  const rock = buildBand(minZ, 0, midY, 0, 0.5, PALETTE.rockShadow, 'skirtRock')
  const sand = buildBand(minZ, midY, -skirtDepthM, 0.5, 1, PALETTE.sandApron, 'sandApron')
  return [rock, sand]
}
