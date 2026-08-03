// vehicle-shop/ornihopter/src/model/geometry/flankOpenings.ts
// HOW MANY holes there are in each flank and where their ends are. The SHAPE
// of any one of them — sill line, header line, corners on the skin — is still
// flankWindow.ts's single rule, applied at whatever station it is asked about;
// this file only says which stretches of flank get it.
//
// It exists because round 15 turned "the flank has a window" into "the flank
// has two windows", and four layers (hull cut, outer glazing, cabin liner,
// inner reveal) each had the single run written into them as a pair of
// constants. One list, read by all four, is the same discipline flankWindow.ts
// was created for one round earlier.
//
// USER ORDER, 2026-08-03, and the SECOND authorised exception to the exterior
// freeze: "there two more side pannels on the cockpit which can be swapped
// with glass. to provide better view. one left and one right."
//
// WHAT WAS MEASURED FIRST, from the pilot eye at pitch 0 (a 21x21 ray cone,
// +/-12 degrees, centred on each bearing):
//   yaw -25 0.0%   -30 0.0%   -35 2.3%   -40 12.9%   -45 25.4%
//   yaw +30 15.0%  +35 4.3%   +40 0.0%   +45 0.0%    +50 7.3%
// and the single centre ray, pitch 0: yaw -40 met `wall-pilot` at 2.04m aft,
// yaw -30 at 1.72m, yaw +40 met `wall-copilot` at 1.50m, yaw +60 met the main
// pane's own fore jamb at 2.25m. The forward quarter was a blind arc on both
// bearings, and the thing in it was the cabin liner between roughly 1.0 and
// 2.25m aft — the stretch of flank between the deck aperture and round 11's
// pane. That stretch is what the user is pointing at, and it is what gets
// glazed here.
//
// WHERE THE TWO NEW ENDS COME FROM:
//   FORE 1.45m aft. flankWindowEdgeAt refuses any station whose sill-to-header
//        height is under 0.25m, which is the hull running out of depth over
//        the bullnose; measured, it returns null at and forward of 1.30m aft
//        and 0.267m at 1.35m. 1.45m is the first station with real margin
//        (0.311m) and it leaves a 0.25m band of skin aft of the hull's own
//        bullnose break at 1.2m — an A-pillar, not a knife edge.
//   AFT  2.15m aft. WINDOW_FORE_Z less a 0.10m POST of solid skin, so round
//        11's opening is not touched at either end and the two panes are
//        genuinely two panes with a window post between them, which is what
//        the user asked for and what the reference station has.

import { stationFromNose } from '../../spec'
import { STATION_Z } from './hullStations'
import { WINDOW_FORE_Z, WINDOW_AFT_Z, flankWindowEdgeAt } from './flankWindow'

/** Solid skin left standing between the quarter pane and round 11's pane. */
export const WINDOW_POST = 0.1

export const QUARTER_FORE_Z = stationFromNose(1.45)
export const QUARTER_AFT_Z = WINDOW_FORE_Z - WINDOW_POST

export interface FlankOpening {
  readonly name: 'quarter' | 'main'
  readonly foreZ: number
  readonly aftZ: number
}

/** Forward to aft. Every layer iterates this; nobody re-authors a run. */
export const FLANK_OPENINGS: readonly FlankOpening[] = [
  { name: 'quarter', foreZ: QUARTER_FORE_Z, aftZ: QUARTER_AFT_Z },
  { name: 'main', foreZ: WINDOW_FORE_Z, aftZ: WINDOW_AFT_Z },
]

/** The opening a bay [za, zb] lies wholly inside, or null. Callers that build
 *  per-bay geometry ask this instead of comparing against a pair of
 *  constants. */
export function bayOpening(za: number, zb: number): FlankOpening | null {
  return (
    FLANK_OPENINGS.find((o) => za >= o.foreZ - 1e-9 && zb <= o.aftZ + 1e-9) ?? null
  )
}

/** True when the bay is inside SOME opening — hullLoft.ts's cut test. */
export function isWindowBay(za: number, zb: number): boolean {
  return bayOpening(za, zb) !== null
}

/**
 * Loft stations with every opening's ends inserted. The hull's authored breaks
 * (hullStations.ts) all survive — this adds stations, it never removes one, so
 * the machined plan the slenderness and plan guards measure is untouched.
 */
export function loftStationZs(): number[] {
  const zs = [...STATION_Z]
  for (const o of FLANK_OPENINGS) {
    for (const z of [o.foreZ, o.aftZ]) {
      if (!zs.some((s) => Math.abs(s - z) < 1e-9)) zs.push(z)
    }
  }
  return zs.sort((a, b) => a - b)
}

/** Mullion stations inside one opening: the hull's own breaks, so the members
 *  land on the craft's real structure exactly as the canopy's ribs do. The
 *  quarter run has none — 1.2m and 3.0m aft both fall outside it — so it is
 *  one unbroken plate between its jambs, which is the point of it. */
export function openingMullionZs(o: FlankOpening): number[] {
  return STATION_Z.filter((z) => z > o.foreZ + 0.3 && z < o.aftZ - 0.3)
}

/** Every station one opening's panes and trim are built over: its two ends
 *  plus the hull breaks inside it. */
export function openingStations(o: FlankOpening): number[] {
  return [o.foreZ, ...openingMullionZs(o), o.aftZ]
}

/** Sanity for readers, and the guard tests' own source: each opening's run in
 *  metres aft, with the sill-to-header height at both ends. Reads through
 *  flankWindow.ts's rule rather than restating it. */
export function openingHeightAt(z: number): number {
  const edge = flankWindowEdgeAt(z)
  return edge ? edge.high.y - edge.low.y : 0
}
