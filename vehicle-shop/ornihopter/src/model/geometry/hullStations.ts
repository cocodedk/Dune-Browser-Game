// vehicle-shop/ornihopter/src/model/geometry/hullStations.ts
// The hull's longitudinal authoring table, rewritten against the assembled
// print kit (docs/dune_ornihopter_kit-3.png, the nose-on close-up, plus
// .shots/reference/kit-assembled.png for the boom and tail).
//
// THE DEFECT THIS ROUND FIXES. The previous table held widthFrac >= 0.93 from
// 2.1m aft to 12.2m aft — 10.1m of a 22.896m body at essentially full beam,
// then a taper. Measured, that is a slab with a point on each end, and it is
// exactly why the craft read as "a submarine with wings, not a dragonfly".
// hullSlenderness.test.ts now guards against a plateau ever returning.
//
// WHAT THE KIT ACTUALLY SHOWS, and what each column encodes:
//   widthFrac   rises to ONE peak at the wing shoulder (9.8m aft) and falls
//               continuously either side. The four WING_ROOTS stations
//               (7.4/9.0/10.6/12.2m) all ride that single crest, so the
//               ball-joint pods still seat on a real shoulder, but the crest
//               is a crest and not a plateau: the run at >= 0.9 is ~3.3m.
//   heightFrac  is now INDEPENDENT of widthFrac (it used to be a fixed ratio
//               of it). The kit's forward pod is DEEP and the boom is thin and
//               FLATTENED; one shared aspect ratio cannot say both. The pod
//               peaks at 0.98 while its width sits at 0.88; the boom runs
//               height ~0.7x width.
//   deckFrac    widens over the shoulder (0.75) into the raised dorsal shelf
//               the wing mounts ride, and narrows over the pod where the
//               canopy sits.
//   bellyFrac   is now NARROWER than deckFrac everywhere forward of the boom:
//               the close-up shows tucked lower flanks running to a narrow
//               keel, not the flat-bottomed barge the old table described. It
//               is held wider than the flanks alone would want over the cabin
//               (0.45-5.7m aft), for two measured reasons: gearGeometry.ts's
//               hip point at 4.2m has to stay inside the skin, and
//               interior/cabinShell.ts builds its floor at COCKPIT.clearWidth
//               (4.9m) regardless of what the hull does, so every metre of
//               tuck there is another metre of black floor slab showing
//               through the pod's underside in an exterior render.
//   keelY       drops the section centre aft of the shoulder, so the boom
//               sweeps down-and-back rather than running dead level — the
//               drooping abdomen of the reference silhouette.
//
// Every field is interpolated independently by metresAft, so hullProfile.ts
// (containment) and hullLoft.ts (the visible mesh) read the exact same
// numbers — see hullCrossSection.ts's header for why that matters.

import { OVERALL, HALF_LENGTH } from '../../spec'
import type { CrossSectionShape } from './hullCrossSection'

const HALF_WIDTH = OVERALL.bodyWidth / 2
const HALF_HEIGHT = OVERALL.bodyHeight / 2

export interface StationRow {
  readonly metresAft: number
  readonly widthFrac: number
  readonly heightFrac: number
  readonly deckFrac: number
  readonly bellyFrac: number
  /** Section centre offset in metres — negative droops the boom. */
  readonly keelY: number
}

export const STATIONS: readonly StationRow[] = [
  // nose: a blunt vertical chisel, not a point (kit-3 shows two stacked slots
  // across a flat tip face; hullGreebles.ts adds the slots themselves).
  { metresAft: 0, widthFrac: 0.085, heightFrac: 0.19, deckFrac: 0.62, bellyFrac: 0.42, keelY: 0 },
  { metresAft: 0.6, widthFrac: 0.36, heightFrac: 0.5, deckFrac: 0.6, bellyFrac: 0.42, keelY: 0 },
  { metresAft: 1.4, widthFrac: 0.63, heightFrac: 0.82, deckFrac: 0.6, bellyFrac: 0.44, keelY: 0 },
  { metresAft: 2.1, widthFrac: 0.81, heightFrac: 0.91, deckFrac: 0.61, bellyFrac: 0.47, keelY: 0 }, // consoleZ
  { metresAft: 2.7, widthFrac: 0.9, heightFrac: 0.96, deckFrac: 0.62, bellyFrac: 0.49, keelY: 0 }, // canopy shoulder
  { metresAft: 3.6, widthFrac: 0.88, heightFrac: 0.98, deckFrac: 0.63, bellyFrac: 0.51, keelY: 0 }, // seatZ, deepest
  { metresAft: 4.9, widthFrac: 0.83, heightFrac: 0.94, deckFrac: 0.66, bellyFrac: 0.51, keelY: 0 }, // canopy rear
  { metresAft: 6.2, widthFrac: 0.79, heightFrac: 0.78, deckFrac: 0.7, bellyFrac: 0.49, keelY: 0 }, // waist
  { metresAft: 7.4, widthFrac: 0.84, heightFrac: 0.64, deckFrac: 0.74, bellyFrac: 0.46, keelY: 0 }, // wing root 1
  { metresAft: 8.6, widthFrac: 0.94, heightFrac: 0.62, deckFrac: 0.75, bellyFrac: 0.45, keelY: 0 },
  { metresAft: 9.8, widthFrac: 1, heightFrac: 0.61, deckFrac: 0.75, bellyFrac: 0.45, keelY: 0 }, // BEAM PEAK
  { metresAft: 11, widthFrac: 0.93, heightFrac: 0.58, deckFrac: 0.75, bellyFrac: 0.45, keelY: 0 },
  { metresAft: 12.2, widthFrac: 0.84, heightFrac: 0.53, deckFrac: 0.74, bellyFrac: 0.46, keelY: 0 }, // wing root 4
  { metresAft: 13.4, widthFrac: 0.6, heightFrac: 0.41, deckFrac: 0.7, bellyFrac: 0.54, keelY: -0.06 },
  { metresAft: 14.6, widthFrac: 0.42, heightFrac: 0.32, deckFrac: 0.68, bellyFrac: 0.58, keelY: -0.14 },
  { metresAft: 16, widthFrac: 0.27, heightFrac: 0.22, deckFrac: 0.66, bellyFrac: 0.62, keelY: -0.24 },
  { metresAft: 17.6, widthFrac: 0.19, heightFrac: 0.15, deckFrac: 0.65, bellyFrac: 0.64, keelY: -0.34 },
  { metresAft: 19.4, widthFrac: 0.13, heightFrac: 0.1, deckFrac: 0.65, bellyFrac: 0.65, keelY: -0.44 },
  { metresAft: 21, widthFrac: 0.085, heightFrac: 0.062, deckFrac: 0.65, bellyFrac: 0.65, keelY: -0.52 },
  { metresAft: 22.3, widthFrac: 0.04, heightFrac: 0.028, deckFrac: 0.65, bellyFrac: 0.65, keelY: -0.57 },
  { metresAft: OVERALL.length, widthFrac: 0, heightFrac: 0, deckFrac: 0.65, bellyFrac: 0.65, keelY: -0.6 },
]

/** Craft-local z for every authored station — hullLoft.ts's actual ring positions. */
export const STATION_Z: readonly number[] = STATIONS.map((s) => s.metresAft - HALF_LENGTH)

/** Number of lofted bays. hullWeathering.ts sizes its panel grid off this so
 *  painted seams land on real facet edges rather than crossing them. */
export const HULL_BAYS = STATIONS.length - 1

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function rowAt(metresAft: number): Omit<StationRow, 'metresAft'> {
  if (metresAft <= STATIONS[0].metresAft) return STATIONS[0]
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const s0 = STATIONS[i]
    const s1 = STATIONS[i + 1]
    if (metresAft >= s0.metresAft && metresAft <= s1.metresAft) {
      const span = s1.metresAft - s0.metresAft
      const t = span === 0 ? 0 : (metresAft - s0.metresAft) / span
      return {
        widthFrac: lerp(s0.widthFrac, s1.widthFrac, t),
        heightFrac: lerp(s0.heightFrac, s1.heightFrac, t),
        deckFrac: lerp(s0.deckFrac, s1.deckFrac, t),
        bellyFrac: lerp(s0.bellyFrac, s1.bellyFrac, t),
        keelY: lerp(s0.keelY, s1.keelY, t),
      }
    }
  }
  return STATIONS[STATIONS.length - 1]
}

/** Interpolated beam fraction at a distance aft of the nose — the slenderness
 *  guard reads this directly rather than re-implementing the interpolation. */
export function widthFracAt(metresAft: number): number {
  return rowAt(metresAft).widthFrac
}

/** Hull half-width (local X extent) at craft-local z — the envelope both the
 *  mesh and the wing-clearance tests read. */
export function hullHalfWidthAt(z: number): number {
  return rowAt(z + HALF_LENGTH).widthFrac * HALF_WIDTH
}

/** Hull half-height at craft-local z, measured from that station's own keel
 *  line (hullKeelYAt), NOT from y = 0. Independent of half-width since this
 *  round: the pod is deep where it is not especially wide, and the boom is
 *  flattened. */
export function hullHalfHeightAt(z: number): number {
  return rowAt(z + HALF_LENGTH).heightFrac * HALF_HEIGHT
}

/** Vertical centre of the section at craft-local z. Zero forward of the wing
 *  shoulder, dropping aft so the boom sweeps down-and-back. */
export function hullKeelYAt(z: number): number {
  return rowAt(z + HALF_LENGTH).keelY
}

/** Deck/belly proportions at craft-local z, for hullCrossSection.ts's ring builder. */
export function hullShapeAt(z: number): CrossSectionShape {
  const row = rowAt(z + HALF_LENGTH)
  return { deckHalfWidthFrac: row.deckFrac, bellyHalfWidthFrac: row.bellyFrac }
}
