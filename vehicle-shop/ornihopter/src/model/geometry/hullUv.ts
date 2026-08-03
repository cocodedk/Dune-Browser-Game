// vehicle-shop/ornihopter/src/model/geometry/hullUv.ts
// The hull's UV layout, in one place, because three modules have to agree on
// it or the surface pass is decoration rather than detail: hullLoft.ts and
// hullTailFork.ts emit the coordinates, hullGreebles.ts points its boxes at
// the detail islands, and hullWeathering.ts paints them.
//
// u runs along the craft's length, v around the section's perimeter. The
// LOFTED hull occupies only u in [0, HULL_U_MAX]; the remaining fifth of the
// texture is reserved for detail islands the geometry cannot afford as real
// triangles — the fine-ribbed intake grille and the machinery/trim tones for
// the greeble boxes (see docs/dune_ornihopter_kit-3.png, where that grille is
// a large, unmissable feature on the upper flank aft of the canopy).
//
// UV_COLUMNS is chosen so one texture cell is exactly one lofted bay: the
// hull has HULL_BAYS bays across HULL_U_MAX of the u axis, so the painted
// panel seams land ON the real facet edges instead of crossing them at some
// unrelated frequency. Change either number and they drift apart, which is
// why they are derived here rather than typed twice.

import { HULL_BAYS } from './hullStations'
import { RING_SIZE } from './hullCrossSection'

/** Fraction of the u axis the lofted hull itself occupies. */
export const HULL_U_MAX = 0.8

/** Texture cells along u. One cell per lofted bay, by construction. */
export const UV_COLUMNS = Math.round(HULL_BAYS / HULL_U_MAX)

/** Texture cells around v. One cell per section panel, by construction. */
export const UV_ROWS = RING_SIZE

/** Fine vertical-rib intake grille. */
export const GRILLE_U: readonly [number, number] = [0.8, 0.88]

/** The blunt nose tip's face plate, carrying its two stacked horizontal slots. */
export const NOSE_U: readonly [number, number] = [0.88, 0.94]

/** Dark olive machinery — mount plate flanks and louvre slats. */
export const MACHINERY_U: readonly [number, number] = [0.94, 0.97]

/** Pale structural trim — the raised top faces of the mount plates. */
export const TRIM_U: readonly [number, number] = [0.97, 1]

/** u for the tail paddle, at the aft end of the hull's own u range so it
 *  picks up the same weathered boom tone the boom itself carries. */
export const PADDLE_U: readonly [number, number] = [HULL_U_MAX * 0.9, HULL_U_MAX]
