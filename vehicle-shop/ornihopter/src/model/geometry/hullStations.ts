// vehicle-shop/ornihopter/src/model/geometry/hullStations.ts
// The hull's longitudinal authoring table: three-part massing (cockpit
// block, mid-body shoulder, tail boom), not one continuous taper — the kit's
// own parts list is a panelled assembly (Airframe_main/left/right,
// Side_left/right, Top_support), which is why it is faceted rather than
// smooth. Each row is (metresAft, widthFrac, deckFrac, bellyFrac); every
// field is interpolated independently by metresAft, so hullProfile.ts
// (containment) and hullLoft.ts (the visible mesh) read the exact same
// numbers — see hullCrossSection.ts's header for why that matters.
//
// widthFrac holds a flat 1.0 plateau across 7.4-12.2m aft — every
// WING_ROOTS station (spec.ts) — so WING_ROOT_X sits exactly at (never
// inside) the hull skin there, the same guarantee the original single-curve
// profile made. Outside that plateau the curve breaks sharply rather than
// tapering smoothly: a cockpit that never quite reaches full beam, a
// shoulder plateau at full beam (the widest point, per the reference top
// view mr-O9copy.jpg), and a tail boom that falls away fast into a long,
// slender abdomen, not one continuous cigar.
//
// deckFrac widens over the shoulder (0.58, its highest value) so the flat
// dorsal deck reads as a distinct surface carrying the wing mounts;
// bellyFrac stays wider than deckFrac everywhere, so the underside reads as
// the dominant flat, per kit-assembled.png.

import { OVERALL, HALF_LENGTH } from '../../spec'
import type { CrossSectionShape } from './hullCrossSection'

const HALF_WIDTH = OVERALL.bodyWidth / 2
const HEIGHT_OVER_WIDTH = OVERALL.bodyHeight / OVERALL.bodyWidth

interface StationRow {
  readonly metresAft: number
  readonly widthFrac: number
  readonly deckFrac: number
  readonly bellyFrac: number
}

const STATIONS: readonly StationRow[] = [
  { metresAft: 0, widthFrac: 0, deckFrac: 0.5, bellyFrac: 0.5 }, // nose point
  { metresAft: 0.5, widthFrac: 0.55, deckFrac: 0.5, bellyFrac: 0.6 },
  { metresAft: 1.2, widthFrac: 0.82, deckFrac: 0.45, bellyFrac: 0.65 },
  { metresAft: 2.1, widthFrac: 0.93, deckFrac: 0.42, bellyFrac: 0.68 }, // COCKPIT.consoleZ
  { metresAft: 3.6, widthFrac: 0.95, deckFrac: 0.42, bellyFrac: 0.68 }, // COCKPIT.seatZ
  { metresAft: 5.8, widthFrac: 0.97, deckFrac: 0.42, bellyFrac: 0.68 }, // cockpit block ends
  { metresAft: 7.4, widthFrac: 1.0, deckFrac: 0.58, bellyFrac: 0.72 }, // shoulder begins
  { metresAft: 12.2, widthFrac: 1.0, deckFrac: 0.58, bellyFrac: 0.72 }, // shoulder ends
  { metresAft: 13.5, widthFrac: 0.78, deckFrac: 0.4, bellyFrac: 0.68 }, // sharp knee into the boom
  { metresAft: 15.0, widthFrac: 0.62, deckFrac: 0.35, bellyFrac: 0.65 }, // cabin ends
  { metresAft: 17.0, widthFrac: 0.42, deckFrac: 0.3, bellyFrac: 0.6 },
  { metresAft: 19.0, widthFrac: 0.26, deckFrac: 0.3, bellyFrac: 0.55 },
  { metresAft: 21.0, widthFrac: 0.12, deckFrac: 0.3, bellyFrac: 0.5 },
  { metresAft: 22.3, widthFrac: 0.04, deckFrac: 0.3, bellyFrac: 0.5 },
  { metresAft: OVERALL.length, widthFrac: 0, deckFrac: 0.3, bellyFrac: 0.5 }, // tail point
]

/** Craft-local z for every authored station — hullLoft.ts's actual ring positions. */
export const STATION_Z: readonly number[] = STATIONS.map((s) => s.metresAft - HALF_LENGTH)

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function rowAt(metresAft: number): Omit<StationRow, 'metresAft'> {
  if (metresAft <= STATIONS[0].metresAft) return STATIONS[0]
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const s0 = STATIONS[i]
    const s1 = STATIONS[i + 1]
    if (metresAft >= s0.metresAft && metresAft <= s1.metresAft) {
      const t = s1.metresAft === s0.metresAft ? 0 : (metresAft - s0.metresAft) / (s1.metresAft - s0.metresAft)
      return {
        widthFrac: lerp(s0.widthFrac, s1.widthFrac, t),
        deckFrac: lerp(s0.deckFrac, s1.deckFrac, t),
        bellyFrac: lerp(s0.bellyFrac, s1.bellyFrac, t),
      }
    }
  }
  return STATIONS[STATIONS.length - 1]
}

/** Hull half-width (local X extent) at craft-local z — the envelope both the
 *  mesh and the wing-clearance tests read. */
export function hullHalfWidthAt(z: number): number {
  return rowAt(z + HALF_LENGTH).widthFrac * HALF_WIDTH
}

/** Hull half-height — a fixed aspect ratio of width, unchanged from before
 *  this round (see Ornithopter.ts's "simple form" header). The faceted
 *  cross-section shape is what changed, not this envelope relationship. */
export function hullHalfHeightAt(z: number): number {
  return hullHalfWidthAt(z) * HEIGHT_OVER_WIDTH
}

/** Deck/belly proportions at craft-local z, for hullCrossSection.ts's ring builder. */
export function hullShapeAt(z: number): CrossSectionShape {
  const row = rowAt(z + HALF_LENGTH)
  return { deckHalfWidthFrac: row.deckFrac, bellyHalfWidthFrac: row.bellyFrac }
}
