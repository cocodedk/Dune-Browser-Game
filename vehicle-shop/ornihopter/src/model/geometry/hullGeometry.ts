// vehicle-shop/ornihopter/src/model/geometry/hullGeometry.ts
// The hull as one faceted mesh: hullLoft.ts's tapering hexagonal boom plus
// hullTailFork.ts's two tail prongs, concatenated into a single buffer
// before three.js ever sees it — buildHullGeometry()'s signature and
// single-BufferGeometry return type are unchanged from the LatheGeometry
// round, so Ornithopter.ts's call site never needed to change.
//
// Non-indexed on purpose: every panel owns its own vertices (see
// hullCrossSection.ts's loftRingsFlat), which is what makes the hexagon
// actually LOOK faceted instead of Gouraud-smoothed into a tube — concatenation
// is then just appending position arrays, no index-offset bookkeeping at all.

import { BufferGeometry, BufferAttribute } from 'three'
import { buildHullLoft } from './hullLoft'
import { buildTailFork } from './hullTailFork'

export function buildHullGeometry(): BufferGeometry {
  const positions = [
    ...buildHullLoft().positions,
    ...buildTailFork().flatMap((prong) => prong.positions),
  ]

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.computeVertexNormals()
  return geometry
}
