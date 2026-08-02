// vehicle-shop/ornihopter/src/model/geometry/canopyPlan.ts
// Where the canopy is and what shape its section is — split out of
// canopyGeometry.ts in round 6a so that file can stay under the 200-line cap
// while carrying a real flush-deck mesh instead of four beams and a tent.
//
// ROUND 6a — WHY THE OLD CANOPY WENT. A blind critic: "a short windshield box
// perched on the fore-deck like a truck cab" where the kit has a flush glazed
// deck. Measured on the old shell, the ridge stood 1.14m above the local deck
// line at 2.7m aft — on a hull whose entire half-height there is 2.07m. It was
// a cab, and it was half the pod tall.
//
// THE KIT'S CANOPY IS A PLATE. Canopy.stl is 45.01 x 16.81 x 1.80mm: a
// footprint that flares over its first 4.5mm and then tapers in one straight
// line for the remaining 40mm, with a rectangular recess offset toward the
// wide end and a chamfered border all round (docs/profiles/canopy-deck.json,
// kit-dossier.md section c). docs/dune_ornihopter_kit-3.png shows the same
// part installed: a long tapering panel lying IN the deck behind a raised
// chamfered rim, with a recessed, textured glazing strip down its middle. Not
// one edge of it stands up as a box.
//
// PLACEMENT, from two independent sources that agree. Canopy.stl's 45.01mm is
// 39.9% of Airframe_main.stl's 112.8mm fat-hull run (kit-dossier.md section
// c); 39.9% of this hull's 13.5m front mass is 5.4m, and the panel below runs
// 6.0m — same order, chosen so it reaches from the end of the bullnose chamfer
// to the waist, which is exactly where kit-3 puts it. The dossier's other
// clue, that the canopy sits over a SHALLOW part of the hull, points the same
// way: forward, over the nose taper, not over the 3.0m-aft crest.
//
// The panel reaches all the way forward onto the nose chamfer (0.5m aft),
// which is where kit-3 puts it — the plate's narrow end butts against the
// bullnose block itself — and it is also what carries the glazing down into
// the pilot's forward view instead of leaving it flat on the crown behind him.
//
// The half-widths below are held INSIDE the hull's own flat deck cap at every
// station (hullStations.ts's deckFrac), which is what makes "flush" true by
// construction rather than by eye: the panel's outboard edge lands ON the flat
// deck, at the deck's own height, and its rim is the only thing standing proud
// of it at all.

import { HALF_LENGTH, COCKPIT } from '../../spec'
import { hullHalfHeightAt, hullKeelYAt } from './hullProfile'

/** How far the rim stands proud of the deck it sits on — the chamfered border,
 *  and the ONLY proudness the canopy has. canopyFlush.test.ts caps this. */
export const CANOPY_RIM = 0.22

/** How far the glazing strip is recessed below the rim's top. */
export const CANOPY_RECESS = 0.1

/** Fraction of the panel half-width at which the chamfer reaches full rim
 *  height, and where the recessed glazing strip begins. The narrow band
 *  between them is the rim's inner face. */
export const RIM_TOP_FRACTION = 0.78
export const GLAZE_FRACTION = 0.7

/** Where the canopy's side glazing starts — kept as the line the opaque cabin
 *  liner stops at (interior/cabinShellWall.ts). It is NOT the flush panel's
 *  own base any more: the panel's base is the deck, metres higher, and a liner
 *  built to that would wall the cockpit in. See cabinShellWall.ts's clamp. */
export const CANOPY_SIDE_SILL_Y = COCKPIT.floorY + COCKPIT.clearHeight * 0.42

/** (metresAft, panel half-width). Breaks at 1.2 / 4.6 / 6.2 are the HULL's own
 *  breaks (hullStations.ts), so the panel never chords across a deck kink; the
 *  0.72 at the aft end is the plate's own rear chamfer. */
const PLAN: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.42],
  [1.2, 0.78],
  [3.0, 1.4],
  [4.6, 1.5],
  [6.2, 1.3],
  [6.9, 0.72],
]

/** Craft-local z of every authored canopy station, nose to rear. */
export const CANOPY_Z: readonly number[] = PLAN.map(([aft]) => aft - HALF_LENGTH)

/** The three named z's interior/cabinShellWall.ts brackets its own sampling
 *  with. Kept as three keys because that is the shape its WALL_ZS expects;
 *  `shoulder` is now the pod crest, the deepest break under the panel. */
export const CANOPY_STATION_Z = {
  nose: CANOPY_Z[0],
  shoulder: CANOPY_Z[2],
  rear: CANOPY_Z[CANOPY_Z.length - 1],
} as const

/** Top of the hull's own skin at craft-local z — the flat deck cap the panel
 *  lies on. Same expression hullGreebles.ts's deckYAt uses. */
export function deckYAt(z: number): number {
  return hullKeelYAt(z) + hullHalfHeightAt(z)
}

/** Panel half-width at craft-local z, clamped to the authored run. */
export function canopyHalfWidthAt(z: number): number {
  const aft = z + HALF_LENGTH
  if (aft <= PLAN[0][0]) return PLAN[0][1]
  for (let i = 0; i < PLAN.length - 1; i++) {
    const [a, wa] = PLAN[i]
    const [b, wb] = PLAN[i + 1]
    if (aft <= b) return wa + ((wb - wa) * (aft - a)) / (b - a)
  }
  return PLAN[PLAN.length - 1][1]
}

/** halfWidth/baseY: the panel's outboard edge, where it meets the deck.
 *  peakY: the crown of its chamfered rim. */
export interface CanopySection {
  readonly halfWidth: number
  readonly baseY: number
  readonly peakY: number
}

/**
 * The canopy's section outline at a craft-local z.
 *
 * CONTRACT, unchanged in meaning and changed in value: baseY is where the
 * canopy meets the hull and peakY is its highest point, whatever shape the
 * canopy is. For the old tent that meant a sill low on the flank and a ridge
 * standing 1.14m proud; for a flush deck panel it means the deck line itself
 * and a 0.22m rim. interior/cabinShell.ts and interior/canopyLiner.ts consume
 * this and both now clamp against CANOPY_SIDE_SILL_Y rather than following
 * baseY up onto the deck — see their headers.
 */
export function canopySectionAt(z: number): CanopySection {
  const deck = deckYAt(z)
  return {
    halfWidth: canopyHalfWidthAt(z),
    baseY: deck,
    peakY: deck + CANOPY_RIM,
  }
}

/** Rim height alone — interior/layout.ts mounts the overhead panel to the real
 *  frame with this rather than into open air. */
export function ridgeHeightAt(z: number): number {
  return canopySectionAt(z).peakY
}
