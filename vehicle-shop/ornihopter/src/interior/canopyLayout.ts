// vehicle-shop/ornihopter/src/interior/canopyLayout.ts
// Where the cabin's roof is and where the hole in it is. Read by
// interior/canopyFrame.ts (the meshes) and interior/cabinShellWall.ts (the
// side liner's top edge), so the two cannot disagree about where the roof
// starts — the round-6a wall stopped at CANOPY_SIDE_SILL_Y and left a metre of
// bare upper flank between its top edge and the deck, which is the "no side
// sills, no bulkhead" half of the critique.
//
// THE CANOPY IS A DECK PANEL, so the cabin's ceiling IS the deck, and the
// windscreen is the stretch of that deck which rakes down over the nose
// (canopyPlan.ts: deckYAt falls from 2.107 at 3.0m aft to 0.806 at 0.5m aft —
// 23 degrees over the forward bay, 37 over the bullnose). The cockpit is
// therefore a cave with a raked skylight at its front, not a greenhouse: an
// opaque roof liner just under the deck, and one APERTURE cut in it where the
// crew look out.
//
// THE APERTURE IS SEALED BY CONSTRUCTION, which is the whole reason it is
// defined here as numbers rather than eyeballed as geometry. Its half-width
// is the canopy panel's own half-width less EDGE_MARGIN, so every ray that
// gets through it crosses the deck ON the panel — glass in the middle, the
// panel's frame chamfer at the edges — and never on the bare deck plate
// outboard of the panel, which is single-sided hull skin and therefore an
// open hole from inside. canopyFrame.ts fences the aperture's whole perimeter
// (side rails, brow beam, forward header) between the liner and the deck, so
// a shallow ray cannot crawl through the 0.06m gap and out the side either.

import { COCKPIT, HALF_LENGTH, PILOT_EYE, stationFromNose } from '../spec'
import { deckYAt, canopyHalfWidthAt, CANOPY_Z } from '../model/geometry/canopyPlan'
import { hullInteriorHalfWidthAt, HULL_INSET } from './hullSection'

/** Clearance between the roof liner and the deck skin above it. Big enough
 *  that the two never z-fight, small enough that the reveal round the
 *  aperture reads as a window frame rather than a light well. */
export const ROOF_DROP = 0.06

/** Panel left standing outboard of the aperture on each side. This is the
 *  margin that makes "every ray through the hole leaves through the canopy"
 *  true; it is not a styling number, and it is small on purpose. The reveal
 *  seals the 0.06m gap between liner and deck, so a ray through the hole
 *  crosses the deck at essentially the same station and the same x — 0.05 is
 *  slack for mesh thickness, not for a sightline drifting outboard. Set at
 *  0.13 first, and MEASURED: the level sightline at x = -0.62 crosses at 1.156m
 *  aft where the panel is 0.757 half-wide, so 0.13 left the horizon 7mm inside
 *  the aperture edge and the raycast landed on the rail instead of the glass. */
const EDGE_MARGIN = 0.05

/** Aperture ends, aft of the nose. The forward end stops short of the
 *  bullnose (the panel is only 0.42m half-wide at 0.5m aft — too narrow to
 *  see through and too narrow to fence); the rear end is the BROW, and it is
 *  what puts a header across the top of the pilot's view. MEASURED from
 *  PILOT_EYE: the brow beam's lower face subtends about +21 degrees against a
 *  34-degree half-VFOV, so the top of the forward frame is roof liner and the
 *  window stops short of it. The rear end is also what makes the window WIDE:
 *  the panel is 1.21m half-wide there against 0.76 at the sightline's own
 *  crossing, so the aperture is a wedge that opens upward, which is both what
 *  a raked deck window has to be and what puts glass in front of a pilot whose
 *  seat is off the craft's centreline. */
export const APERTURE_FORE_Z = stationFromNose(0.6)
export const APERTURE_REAR_Z = stationFromNose(2.45)

/** Underside of the roof liner at craft-local z. */
export function roofYAt(z: number): number {
  return deckYAt(z) - ROOF_DROP
}

/**
 * How wide the cabin is at the roof line. hullInteriorHalfWidthAt insets by
 * HULL_INSET in X so a liner never lands coincident with the hull mesh; that
 * inset is added back HERE, and only here.
 *
 * FOUND by raycast, round 6b: the 0.05m inset leaves a slot between the liner
 * and the skin that runs the length of the cabin and is open at the top, where
 * the roof band's outboard edge stops short of the deck. Four rays in ten
 * thousand — all within a degree of level, all sweeping outboard as they ran
 * forward — threaded that slot and left the craft. The roof is 0.06m below the
 * deck plane already, so it has vertical clearance from the skin without any
 * lateral inset at all: taking the edge out to the true section closes the
 * slot's only opening, and the wall below reads the same function so the two
 * still meet exactly.
 */
export function roofHalfWidthAt(z: number): number {
  const inner = hullInteriorHalfWidthAt(roofYAt(z), z)
  return inner <= 0 ? 0 : inner + HULL_INSET
}

/** Half-width of the hole in the roof at z. Zero outside the aperture's own
 *  z-span, which is what makes the roof solid everywhere else. */
export function apertureHalfWidthAt(z: number): number {
  if (z < APERTURE_FORE_Z || z > APERTURE_REAR_Z) return 0
  const panel = canopyHalfWidthAt(z) - EDGE_MARGIN
  const roof = roofHalfWidthAt(z) - 0.1
  return Math.max(0, Math.min(panel, roof))
}

/** Longitudinal sampling for the roof and its aperture: every authored canopy
 *  station inside the span (so a mullion lands on a real panel break, as it
 *  does outside) plus the two ends, plus a mid-point per bay so the raked
 *  liner traces the deck rather than chording across it. */
export function apertureStations(): number[] {
  const ends = [APERTURE_FORE_Z, APERTURE_REAR_Z]
  const breaks = CANOPY_Z.filter((z) => z > APERTURE_FORE_Z && z < APERTURE_REAR_Z)
  const keys = [...ends, ...breaks].sort((a, b) => a - b)
  const out: number[] = []
  for (let i = 0; i < keys.length - 1; i++) {
    out.push(keys[i], (keys[i] + keys[i + 1]) / 2)
  }
  out.push(keys[keys.length - 1])
  return out
}

/** The canopy's own transverse breaks inside the aperture — where
 *  canopyGeometry.ts puts a mullion on the outside, so the inner frame puts
 *  one in the same place instead of inventing a second rhythm. */
export function mullionStations(): number[] {
  return CANOPY_Z.filter((z) => z > APERTURE_FORE_Z + 0.15 && z < APERTURE_REAR_Z - 0.15)
}

/** Forward bulkhead: closes the nose bay off from the cockpit. Without it the
 *  floor simply ends at FLOOR_FRONT_Z and a shallow down-forward ray sails
 *  over its edge and out through the bullnose — the critic's "sunlit desert
 *  filling the lower-left past the dash's end". */
export const NOSE_BULKHEAD_Z = APERTURE_FORE_Z

/** Rear canopy arch, just behind the seats: the transverse frame the reference
 *  board calls BULKHEAD, and the thing that reads as structure behind the
 *  pilot's shoulder when the head turns. */
export const REAR_ARCH_Z = COCKPIT.seatZ + 0.7

/** Shoulder rail: the longitudinal beam running along each side at the
 *  pilot's shoulder line. Sits between the eye and the roof so it reads as
 *  the tub edge a seated body is down inside. */
export const RAIL_Y = PILOT_EYE.y - 0.22

/** Sanity for readers: the cockpit's whole roof run in metres aft. */
export const ROOF_SPAN_AFT: readonly [number, number] = [
  APERTURE_FORE_Z + HALF_LENGTH,
  APERTURE_REAR_Z + HALF_LENGTH,
]
