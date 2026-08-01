// vehicle-shop/ornihopter/src/model/geometry/hullTailFork.ts
// The tail paddle: the flattened, slotted spatula the boom ends in.
//
// Measured off .shots/reference/kit-assembled.png, where the tail crop shows
// it clearly — a long, thin, near-round boom that flares over its last two
// metres into a short flat blade roughly twice the boom's width, with a dark
// slot running down the middle and a rounded tip. The previous version of
// this file split the tail vertically into two diverging prongs, which read
// in every render as a pair of spikes rather than as a paddle, and doubled up
// with tailGeometry.ts's crossed vanes sitting in the same place (a blind
// critic called the pair "leftover quill spikes"). Those vanes are gone; this
// is now the only thing at the tail tip.
//
// Built as TWO horizontal tines that meet at the root and again near the tip,
// with the boom's own fine taper running between them. That is what makes the
// slot: the tines stand slightly wider and flatter than the boom, so the boom
// reads as a raised centre spine with a groove either side, exactly the
// reference's read, and there is no seam to hide because both tine roots sit
// inside the boom's still-solid section at 20.15m aft.
//
// Layered ON TOP of the main loft rather than authored into hullStations.ts:
// hullProfile.ts's isOutsideHull needs one half-width per z, and the
// wing-clearance tests never sample past 12.2m aft, so leaving the envelope
// functions describing the boom alone here costs nothing real.

import { HALF_LENGTH } from '../../spec'
import { buildRing, type CrossSectionShape } from './hullCrossSection'
import { hullKeelYAt } from './hullStations'
import { loftRingsFlat, type LoftMesh } from './hullLoft'
import { PADDLE_U } from './hullUv'

/** Flatter than the hull's own pod section — the paddle is a blade, and its
 *  deck and keel fractions are equal so it reads as a lozenge rather than
 *  carrying the pod's tucked-keel language out to the tail. */
const SHAPE: CrossSectionShape = { deckHalfWidthFrac: 0.7, bellyHalfWidthFrac: 0.7 }

/** (metresAft, centreX, halfWidth, halfHeight), root to tip. The root is
 *  comfortably inside the boom's own section there (~0.29m half-width,
 *  ~0.18m half-height), so the tine emerges from solid material. */
const STATIONS: ReadonlyArray<readonly [number, number, number, number]> = [
  [20.15, 0.1, 0.1, 0.09],
  [20.9, 0.24, 0.16, 0.09],
  [21.7, 0.32, 0.2, 0.08],
  [22.35, 0.26, 0.15, 0.06],
  [22.8, 0.1, 0.02, 0.02],
]

/** One tine; `sign` +1 lies to starboard of the boom's spine, -1 to port. */
function buildTine(sign: 1 | -1): LoftMesh {
  const zs = STATIONS.map(([metresAft]) => metresAft - HALF_LENGTH)
  const rings = STATIONS.map(([, centreX, halfWidth, halfHeight], i) =>
    buildRing(halfWidth, halfHeight, SHAPE, sign * centreX, hullKeelYAt(zs[i])))
  return loftRingsFlat(rings, zs, PADDLE_U[0], PADDLE_U[1])
}

/** Both tines, starboard then port. hullGeometry.ts appends both onto the main loft. */
export function buildTailFork(): LoftMesh[] {
  return [buildTine(1), buildTine(-1)]
}
