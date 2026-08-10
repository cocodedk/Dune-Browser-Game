// landscape-shop/cliff/src/model/gateLip.ts
// The lit rim of the sietch gate: the flare of rock between the prow's own
// surface and the mouth's inner edge. Split out of model/socket.ts in R2.1,
// because the fix this part needed was more geometry and that file was at the
// 200-line rule.
//
// WHY IT CHANGED. The R2 landing critic read the left half of the frame as "a
// soft, indistinct blur-blob with no rock-like edges", and after the prow was
// flat-shaded the blob that survived was THIS: a two-row ribbon 13 m across
// and 66 m wide, smooth-shaded and coloured per vertex, sitting in the middle
// of the frame right where a person looks. Two rows cannot carry an edge —
// every pixel of it is an interpolation between the same two rings.
//
// So the flare is now built out of RINGS, each one lying on the prow's own
// fluted surface before it is pulled forward to the rim. That gives it real
// relief instead of a ruled ramp, and the facets it breaks into are the same
// size as the prow's own.

import { Mesh } from 'three'
import { buildGridGeometry, flatShade, meshFrom } from './grid'
import { gateWallZ } from './gateWall'
import { LIP_OUTER, LIP_INNER, ovalPoint, pushOutsideSocket, ring, type Ring } from './socketRings'
import { PALETTE } from '../spec'

// Rings across the flare, counting both edges. Five puts a facet edge about
// every 3 m across the lip, which matches the prow's own 3.2 m cells — the
// two surfaces then break at the same scale and read as one rock.
const RINGS = 5

export interface GateLip {
  mesh: Mesh
  /** The mouth's inner edge — model/socket.ts hangs the chamfer off it. */
  inner: Ring
}

export function buildGateLip(frontZ: number, backZ: number): GateLip {
  const rings: Ring[] = []
  for (let i = 0; i < RINGS; i++) rings.push(lipRing(i / (RINGS - 1), frontZ, backZ))
  const columns = rings[0].map((_, at) => rings.map((r) => r[at]))
  const mesh = meshFrom(flatShade(buildGridGeometry(columns)), PALETTE.rock)
  mesh.name = 'gateLip'
  return { mesh, inner: rings[RINGS - 1] }
}

/** One ring across the flare. `t` is 0 out on the prow and 1 at the rim.
 *
 *  The z is the interesting part. At t = 0 the ring lies on the prow's own
 *  surface, flutes and bed steps and all; at t = 1 it is the flat plane the
 *  mouth is cut in, which is what makes the entrance own the set's -Z extreme
 *  by construction. In between it is the wall's own surface pulled forward on
 *  a smoothstep, so the flare keeps the rock's relief most of the way in
 *  rather than being a cone. */
function lipRing(t: number, frontZ: number, backZ: number): Ring {
  const pull = t * t * (3 - 2 * t)
  return ring((angle) => {
    const [outerX, outerY] = pushOutsideSocket(...ovalPoint(LIP_OUTER, angle))
    const [innerX, innerY] = ovalPoint(LIP_INNER, angle)
    const x = outerX + (innerX - outerX) * t
    const y = outerY + (innerY - outerY) * t
    // Capped at backZ: where the fluting runs deeper than the recess, the rim
    // stands a little proud instead, or it drags the z-span past recessM.
    const onWall = Math.min(gateWallZ(x, y) - LIP_OUTER.proud, backZ)
    return { x, y, z: onWall + (frontZ - onWall) * pull }
  })
}
