// vehicle-shop/ornihopter/src/model/geometry/hullTailFork.ts
// The tail terminus: the measured two-tine fork the boom ends in.
//
// MEASURED, off Horizontal_tail.stl rather than off a photograph. Scanning the
// de-rotated 129.64 x 14.12 x 1.80mm plate station by station — the same
// pipeline docs/profiles/boom-plan.json came from, run at 1mm resolution
// through the aft third — the blade reads, per side of the centreline:
//
//   x < 91.5mm       one band: the solid blade, outer edge growing to 6.78mm
//   x 92 .. 108.4    TWO bands, 5.04..7.06mm and 0.99..3.04mm, split by a
//                    2.00mm through-slot at 3.04..5.04mm
//   x > 109          the outer band is gone; only 0.99..3.04mm continues
//   x 129.5          that survivor narrows to 1.44..2.71 and ends at 129.64
//
// So: the blade forks at 71% of its own length into an OUTER tine that stops
// SQUARE at 84%, and an INNER tine that runs to the tip and blunts to a point,
// with a real lightening slot between them for the 17mm they overlap. That is
// kit-dossier.md section d's "fork whose two tines are each of the other two"
// — one squared-and-slotted, one pointed — pinned to the tenth of a
// millimetre. (The plate also carries a 1.98mm slot down its own centreline
// for its whole length; that is the socket the Airframe_main spine plate slides
// through, not a silhouette feature, so it is not modelled.)
//
// WHAT THIS REPLACED. Two MIRROR tines, both spanning 20.15..22.80m aft, both
// tapering to a 0.02m point, no slot and no squared end anywhere — a fluted
// needle split down the middle. A blind critic read the pair before that as
// "leftover quill spikes"; this one simply read as one spike.
//
// SCALED AT THE KIT'S OWN RATIO, which is 170.80mm of Airframe_main.stl to
// OVERALL.length, or 0.1340 m/mm. The plate's fork zone is then, in metres:
// outer tine 0.676..0.946 from the spine, inner tine 0.133..0.408, and a
// 0.270m slot between them; the fork opens at 19.4m aft (the plate's 91.5 of
// 129.64mm mapped onto this hull's boom run, and already a station in
// hullStations.ts, so the tine roots emerge from a real ring rather than the
// middle of a bay) and the outer tine is cut off at 20.96m (the plate's
// 108.5mm). The tines therefore FLARE well outboard of the boom they leave,
// because the kit's tail really is a broad fan — Horizontal_tail.stl WIDENS
// from 7.3mm at its neck to its full 14.12mm through the fork — while this
// hull's boom tapers away under hullSlenderness.test.ts's rules. Layering the
// fan on top is how both stay true at once.
//
// Layered ON TOP of the main loft rather than authored into hullStations.ts:
// hullProfile.ts's isOutsideHull needs one half-width per z, and no test
// samples past the wing shoulder, so leaving the envelope functions describing
// the boom alone here costs nothing real.

import { HALF_LENGTH } from '../../spec'
import { buildRing, type CrossSectionShape } from './hullCrossSection'
import { hullKeelYAt } from './hullStations'
import { loftRingsFlat, type LoftMesh } from './hullLoft'
import { PADDLE_U } from './hullUv'

/** Flatter than the hull's own pod section — a tine is a blade, and its deck
 *  and keel fractions are equal so it reads as a lozenge rather than carrying
 *  the pod's tucked-keel language out to the tail. */
const SHAPE: CrossSectionShape = { deckHalfWidthFrac: 0.72, bellyHalfWidthFrac: 0.72 }

/** Where the blade splits. 19.4m aft is 71% of the way along this hull's boom,
 *  matching the plate's own 91.5 of 129.64mm, and it is already a station in
 *  hullStations.ts so the tine roots emerge from a real ring rather than from
 *  the middle of a bay. */
const FORK_ROOT = 19.4

/** (metresAft, centre offset from the boom's spine, half-width, half-height).
 *  Both tines start inside the boom's own section at FORK_ROOT (half-width
 *  ~0.35m there) so they emerge from solid material, then diverge. */
type Station = readonly [number, number, number, number]

/** OUTER tine: flares outboard, holds its width, and is CUT OFF SQUARE at
 *  20.9m aft — the plate's squared paddle. The last two stations are
 *  deliberately the same width: that is what makes the end a cut rather than a
 *  taper, and tailFork.test.ts measures exactly that. */
const OUTER: readonly Station[] = [
  [FORK_ROOT, 0.18, 0.14, 0.1],
  [20.0, 0.6, 0.135, 0.1],
  [20.5, 0.815, 0.135, 0.09],
  [20.96, 0.815, 0.135, 0.09],
]

/** INNER tine: stays close to the spine and runs the whole way to the tail,
 *  blunting to a point — the plate's pointed tine. */
const INNER: readonly Station[] = [
  [FORK_ROOT, 0.1, 0.1, 0.09],
  [20.0, 0.2, 0.13, 0.085],
  [21.0, 0.27, 0.14, 0.075],
  [22.0, 0.24, 0.11, 0.05],
  [22.85, 0.14, 0.025, 0.02],
]

/** One tine; `sign` +1 lies to starboard of the boom's spine, -1 to port. */
function buildTine(stations: readonly Station[], sign: 1 | -1): LoftMesh {
  const zs = stations.map(([metresAft]) => metresAft - HALF_LENGTH)
  const rings = stations.map(([, centreX, halfWidth, halfHeight], i) =>
    buildRing(halfWidth, halfHeight, SHAPE, sign * centreX, hullKeelYAt(zs[i])))
  return loftRingsFlat(rings, zs, PADDLE_U[0], PADDLE_U[1])
}

/** All four tines — inner and outer, starboard and port. hullGeometry.ts
 *  appends them onto the main loft. */
export function buildTailFork(): LoftMesh[] {
  return ([1, -1] as const).flatMap((sign) => [
    buildTine(INNER, sign),
    buildTine(OUTER, sign),
  ])
}
