// vehicle-shop/ornihopter/src/model/geometry/hullGeometry.ts
// The hull as one faceted mesh: hullLoft.ts's pod-shoulder-boom loft, plus
// hullTailFork.ts's two paddle tines, plus hullGreebles.ts's authored detail,
// concatenated into a single buffer before three.js ever sees it.
// buildHullGeometry()'s signature and single-BufferGeometry return type are
// unchanged, so Ornithopter.ts's call site never needed to change.
//
// Non-indexed on purpose: every panel owns its own vertices (see
// hullLoft.ts's loftRingsFlat), which is what makes the section actually LOOK
// faceted instead of Gouraud-smoothed into a tube — concatenation is then just
// appending arrays, no index-offset bookkeeping at all.
//
// The uv attribute is new this round. Without it hullWeathering.ts's panel and
// grime maps have nothing to land on, and the surface stays the flat single
// colour a blind critic called "uniform material, no wear". Merging the
// greebles into this same buffer rather than adding them as separate meshes is
// what lets them carry the same maps as the skin they sit on.

import { BufferGeometry, BufferAttribute } from 'three'
import { buildHullLoft } from './hullLoft'
import { buildTailFork } from './hullTailFork'
import { buildHullGreebles } from './hullGreebles'
import { buildWingMountPlates } from './wing/mountPlate'

export function buildHullGeometry(): BufferGeometry {
  const parts = [
    buildHullLoft(),
    ...buildTailFork(),
    ...buildHullGreebles(),
    // The wing-mount frames' visible hardware. Merged here rather than added
    // as their own meshes for the same reason the greebles are: one mesh, one
    // material, so the shelves and clevis cheeks weather with the skin they
    // are bolted to instead of reading as parts stuck on afterwards.
    ...buildWingMountPlates(),
  ]
  const positions: number[] = []
  const uvs: number[] = []
  for (const part of parts) {
    positions.push(...part.positions)
    uvs.push(...part.uvs)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.computeVertexNormals()
  return geometry
}
