// vehicle-shop/ornihopter/src/model/geometry/hullStations.ts
// The hull's longitudinal authoring table.
//
// ROUND 6a — THE DEFECT THIS TABLE NOW FIXES. A blind critic: "the pod reads
// as a lofted rounded bulb... a beetle thorax, not a wedge... at any angle the
// render's front mass reads organic where the reference reads engineered."
// That is true, and the cause was here, not in the cross-section:
// hullCrossSection.ts has been an eight-point faceted ring for three rounds
// and hullLoft.ts goes to real trouble to keep every panel's normal its own.
// None of that survives a PLAN that changes slope at every single station.
// Measured on the previous table: fourteen stations covered the 13.5m front
// mass, the longest dead-straight flank run in it was 1.30m, and four of its
// breaks turned by under 6 degrees (3.6m: 2.5, 4.9m: 1.2, 8.6m: 5.0, 11m:
// 2.5). Facets that fine, that close together, ARE a curve — the loft was
// doing exactly what it was told and the result was a French curve rendered
// in triangles. machinedPlan.test.ts guards the piecewise structure now.
//
// The kit says slabs, unambiguously. The pod is a flat-pack box: a vertical
// centre plate (Airframe_main.stl, 170.80 x 33.30 x 1.97mm) with two FLAT side
// skins (Airframe_left/right.stl, 74.02 x 27.01 x 1.81mm — 74.02mm being
// exactly the 170.80 - 96.78 the pod occupies on the centre plate) and a deck
// plate over them. Flat plates cannot make a bulb. The assembled photographs
// agree: docs/dune_ornihopter_kit-2.png and -3.png show one enormous flat
// trapezoid per flank with a single hard crease, a separate flat deck, and a
// chamfered bullnose — panels, not a body of revolution.
//
// SO THE TABLE IS NOW THE LIST OF HARD BREAKS AND NOTHING ELSE. Ten stations,
// nine bays, every bay a genuine slab: the waist-to-shoulder run alone is one
// unbroken 3.6m panel. Adding a station here is not free — it is another
// chance to interpolate a curve — so every row below has to name the break it
// exists to make.
//
// WHAT EACH COLUMN ENCODES:
//   widthFrac   two lobes, as measured: a forward pod crest (0.92, held dead
//               straight from 3.0 to 4.6m — the parallel mid-body), a waist
//               (0.75 at 6.2m), and ONE peak at the wing shoulder (1.00 at
//               9.8m) that falls away in two straight runs. The run at >= 0.9
//               is 2.88m; hullSlenderness.test.ts still forbids a plateau.
//   heightFrac  INDEPENDENT of widthFrac. The pod is deep where it is not
//               especially wide, and the boom is thin and FLATTENED; one
//               shared aspect ratio cannot say both. The nose tip's 0.20 is
//               the kit's own number: Airframe_main's tip cap plateaus at
//               6.27mm of a 29.36mm maximum, 21% (kit-dossier.md section g).
//               The crown is held LONG and set AFT, because that is what the
//               plate says: station-scanning it gives 45% of max depth at
//               0.78m aft, 56% at 1.2m, 75% at 3.5m and its true maximum at
//               5.4m. A crown that peaks early and then plunges to the nose is
//               what makes a front mass read as a bulb, and the pre-round
//               table peaked at 3.0m and fell away on both sides.
//   deckFrac    widens over the shoulder into the raised dorsal shelf the wing
//               mounts ride, and narrows over the nose where the flush canopy
//               deck (canopyGeometry.ts) has to sit ON it rather than perch.
//   bellyFrac   NARROWER than deckFrac everywhere forward of the boom: tucked
//               lower flanks running to a narrow keel, not a flat-bottomed
//               barge. Held at 0.50 across the cockpit because
//               interior/hullSection.ts derives the cabin floor and walls live
//               from this column — below about 0.436 at COCKPIT.seatZ,
//               cabinShell.ts stops finding hull to stand its floor on and
//               starts dropping segments (machinedPlan.test.ts asserts it).
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
  // BULLNOSE TIP. Not a point and not a wide face: Airframe_main's tip cap
  // reaches a constant chord almost immediately and holds it, 21% of the
  // plate's maximum depth. Taller than it is wide, which is why kit-3's nose
  // end reads as vertical fluting. hullGreebles.ts caps it and paints the two
  // slots; the slots stay (photo evidence the flat plates cannot contradict).
  // deckFrac/bellyFrac run HIGH here on purpose, and they are the ONLY way to
  // square the tip that does not cost a station: a section whose flats shrink
  // in proportion with it tapers to a cone and reads rounded from astern
  // however faceted it is. Adding an intermediate station instead was tried
  // and machinedPlan.test.ts rejected it — 0.4 degrees of turn, a textbook
  // soft micro-turn, which is the very thing that made the old table a curve.
  { metresAft: 0, widthFrac: 0.085, heightFrac: 0.2, deckFrac: 0.78, bellyFrac: 0.62, keelY: 0 },
  // BREAK 1 — the end of the nose chamfer. One straight 1.2m run does the
  // whole bullnose; the old table spent three stations easing into it.
  { metresAft: 1.2, widthFrac: 0.6, heightFrac: 0.62, deckFrac: 0.6, bellyFrac: 0.44, keelY: 0 },
  // BREAK 2 — the forward pod crest, and the deepest station on the craft.
  { metresAft: 3, widthFrac: 0.92, heightFrac: 0.98, deckFrac: 0.62, bellyFrac: 0.5, keelY: 0 },
  // PARALLEL MID-BODY. widthFrac AND heightFrac are both deliberately
  // IDENTICAL to the row above: 1.6m of dead-straight flank and dead-level
  // deck, the one run on the craft with zero taper in either view. This is the
  // slab the critique was missing, and it is also what lets the flush canopy
  // deck lie on a genuinely flat surface over the cockpit rather than on a
  // crown. Airframe_main.stl agrees that the depth peak is a plateau over this
  // stretch and not a point: it holds 24.5-26.2mm from x=96 to x=121, which is
  // 3.5m to 6.7m aft.
  { metresAft: 4.6, widthFrac: 0.92, heightFrac: 0.98, deckFrac: 0.66, bellyFrac: 0.5, keelY: 0 },
  // BREAK 3 — the waist, between the two measured lobes.
  { metresAft: 6.2, widthFrac: 0.75, heightFrac: 0.84, deckFrac: 0.7, bellyFrac: 0.47, keelY: 0 },
  // BREAK 4 — BEAM PEAK, the wing shoulder. The 3.6m run up to it and the
  // 3.6m run away from it are the two largest panels on the hull.
  { metresAft: 9.8, widthFrac: 1, heightFrac: 0.61, deckFrac: 0.76, bellyFrac: 0.45, keelY: 0 },
  // BREAK 5 — where the shoulder ends and the boom's own taper begins.
  { metresAft: 13.4, widthFrac: 0.75, heightFrac: 0.4, deckFrac: 0.72, bellyFrac: 0.52, keelY: -0.06 },
  { metresAft: 16, widthFrac: 0.27, heightFrac: 0.22, deckFrac: 0.66, bellyFrac: 0.62, keelY: -0.24 },
  { metresAft: 19.4, widthFrac: 0.13, heightFrac: 0.1, deckFrac: 0.65, bellyFrac: 0.65, keelY: -0.44 },
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
