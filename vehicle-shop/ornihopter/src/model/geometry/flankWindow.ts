// vehicle-shop/ornihopter/src/model/geometry/flankWindow.ts
// THE ONE PLACE the SHAPE of an Apache side pane is described, for the same
// reason canopyPlan.ts's FRAMED_CANOPY_Z exists: four separate layers have to
// agree about where the hole in the flank is, and any two of them disagreeing
// is a visible gap or a ray that leaves the airframe.
//
//   model/geometry/hullFlankCut.ts   cuts the opening out of the hull skin
//   model/geometry/flankGlazing.ts   hangs the outer glass and its trim in it
//   interior/cabinShellWall.ts       opens the cabin liner behind it
//   interior/flankPaneFrame.ts       fences the reveal and hangs the inner pane
//
// ROUND 15 split the bookkeeping out: HOW MANY openings there are and where
// each one starts and stops now lives in flankOpenings.ts, because the user
// ordered a second pane per flank. The sill/header rule below is unchanged and
// is applied to whatever station either file asks about.
//
// USER RULING, 2026-08-02 (apache-gauntlet.md B6), and the single authorised
// exception to the exterior freeze: "full apache side panes and thiner frames.
// cause the two pilots share the same narrow front window and they don't sit
// center to it. so each pilot sees more to the other side than its front
// view."
//
// WHERE THE NUMBERS COME FROM — every one is read off something that already
// exists, not styled:
//   FORE/AFT   2.25m and 5.6m aft. The pilot eye is at 3.45m (spec.ts), so
//              the run is 1.20m ahead of him and 2.15m behind: a sideways
//              glance is inside it by 35 degrees forward and 51 aft. It stops
//              short of the 6.2m waist break, where the hull starts shedding
//              beam and depth fast, and short of the bullnose chamfer forward.
//   SILL_Y     PILOT_EYE.y - 0.15. interior/canopyLayout.ts's RAIL_Y puts the
//              shoulder rail at eye - 0.22 and it is 0.14 deep, so its crown
//              is exactly eye - 0.15: the glass starts where the armoured tub
//              ends. The sill STAYS (round 9d's armored-tub read) — the pane
//              sits on top of it, as it does in the reference station.
//   HEAD_DROP  0.16 below the hull own deck cap, leaving the deck edge, the
//              canopy panel's outboard chamfer and a header trim untouched.
// The pane therefore spans roughly -5 to +24 degrees about the level sightline
// at 1.7m — the band a seated crewman actually looks through.
//
// The window CROSSES the upper-flank break (hullCrossSection.ts's crease at
// 0.58 of half-height, which lands 0.10m above the eye over the cockpit). That
// is deliberate and it is what makes the pane read Apache: one large FLAT
// plate, not two facets with a member across the sightline at eye level. The
// crease resumes fore and aft of the opening, so the hull's trim line still
// runs the length of the pod.

import { HALF_LENGTH, PILOT_EYE, stationFromNose } from '../../spec'
import { STATION_Z, hullHalfWidthAt, hullHalfHeightAt, hullShapeAt, hullKeelYAt } from './hullStations'
import { buildRing, type Point2 } from './hullCrossSection'

export const WINDOW_FORE_Z = stationFromNose(2.25)
export const WINDOW_AFT_Z = stationFromNose(5.6)

/** Crown of the shoulder rail — see the header. */
export const SILL_Y = PILOT_EYE.y - 0.15

/** How far the head of the opening sits below the hull's deck cap. */
const HEAD_DROP = 0.16

/** Right-side flank profile at z, bottom to top: chine, upper-flank break,
 *  deck edge — ring indices 0, 1, 2 (hullCrossSection.ts's point order). The
 *  left flank is the same three points with x negated. */
export function flankProfileAt(z: number): [Point2, Point2, Point2] {
  const ring = buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
  return [ring[0], ring[1], ring[2]]
}

/** The point at height y on that three-point polyline, or null if y is off
 *  the end of it. Both x and y interpolate, so the point lies ON the skin. */
function onFlank(profile: readonly Point2[], y: number): Point2 | null {
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]
    const b = profile[i + 1]
    if (y >= a.y && y <= b.y) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y)
      return { x: a.x + (b.x - a.x) * t, y }
    }
  }
  return null
}

export interface WindowEdge {
  /** Sill corner, on the skin. */
  low: Point2
  /** Header corner, on the skin. */
  high: Point2
}

/**
 * The opening's two corners at station z, on the RIGHT flank. Null where the
 * hull is too shallow to hold a window that clears both the sill and the deck
 * — which is what keeps the cut inside the pod's deep run rather than running
 * off the nose chamfer if the span is ever widened.
 */
export function flankWindowEdgeAt(z: number): WindowEdge | null {
  const profile = flankProfileAt(z)
  const headY = profile[2].y - HEAD_DROP
  if (headY - SILL_Y < 0.25) return null
  const low = onFlank(profile, SILL_Y)
  const high = onFlank(profile, headY)
  return low && high ? { low, high } : null
}

/**
 * The u this z would have had in the ORIGINAL station loft: hullUv.ts sizes
 * one texture cell to one authored bay, so an inserted station has to land at
 * the fractional u of the bay it splits or every painted seam aft of the
 * window walks. Returns a fraction of the hull's u range, 0..1.
 */
export function stationUFraction(z: number): number {
  const bays = STATION_Z.length - 1
  if (z <= STATION_Z[0]) return 0
  for (let i = 0; i < bays; i++) {
    const a = STATION_Z[i]
    const b = STATION_Z[i + 1]
    if (z >= a && z <= b) return (i + (z - a) / (b - a)) / bays
  }
  return 1
}

/** Sanity for readers: round 11's opening in metres aft. The quarter pane's
 *  own run is flankOpenings.ts's QUARTER_FORE_Z/QUARTER_AFT_Z. */
export const WINDOW_SPAN_AFT: readonly [number, number] = [
  WINDOW_FORE_Z + HALF_LENGTH,
  WINDOW_AFT_Z + HALF_LENGTH,
]
