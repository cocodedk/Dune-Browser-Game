// vehicle-shop/ornihopter/src/interior/eyeLine.test.ts
// Where the pilot's eye has to be, re-derived from the canopy every run.
//
// spec.ts's COCKPIT.floorY and seatOffsetX are literals — they have to be,
// since canopyPlan.ts imports spec.ts and the dependency cannot run both ways.
// So the derivation lives here instead of in a comment: this file reads
// canopyPlan.ts directly and asserts the literals still satisfy it. Change the
// canopy's plan or its rake and this fails, which is the point. Round 6's
// cockpit shipped with the eye 2.26m below the deck and nothing anywhere said
// that was wrong.

import { describe, it, expect } from 'vitest'
import { COCKPIT, PILOT_EYE, HALF_LENGTH } from '../spec'
import {
  deckYAt, canopyHalfWidthAt, CANOPY_Z,
} from '../model/geometry/canopyPlan'
import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt } from '../model/geometry/hullProfile'
import { hullShapeAt } from '../model/geometry/hullStations'
import { buildRing, outwardDistance } from '../model/geometry/hullCrossSection'

/** The forward bay is the one canopyGeometry.ts glazes edge to edge — its
 *  chamfer, its rim face and its strip are all glass (that file's `i === 0`).
 *  Everywhere aft of it, only the recessed strip is. */
const BAY0_FORE = CANOPY_Z[0]
const BAY0_AFT = CANOPY_Z[1]

/** Where a level ray from `y` first rises above the deck, marching forward
 *  from the eye. Same march sightlines.ts's raycast performs geometrically. */
function levelCrossing(y: number): number {
  for (let d = 0.01; d < 14; d += 0.002) {
    const z = PILOT_EYE.z - d
    if (deckYAt(z) <= y) return z
  }
  return NaN
}

function outwardAt(x: number, y: number, z: number): number {
  const ring = buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
  return outwardDistance(x, y, ring)
}

describe('the pilot eye sits where the canopy lets it see out', () => {
  it('the eye is inside the deck-height band spanned by the glazed forward bay', () => {
    const low = deckYAt(BAY0_FORE)
    const high = deckYAt(BAY0_AFT)
    expect(PILOT_EYE.y).toBeGreaterThan(low)
    expect(PILOT_EYE.y).toBeLessThan(high)
  })

  it('the level sightline crosses the deck INSIDE that bay, not on the nose plate', () => {
    const z = levelCrossing(PILOT_EYE.y)
    expect(Number.isNaN(z)).toBe(false)
    expect(z).toBeLessThanOrEqual(BAY0_AFT)
    expect(z).toBeGreaterThanOrEqual(BAY0_FORE)
  })

  it('and crosses inboard of the panel edge, so it leaves through glass not deck plate', () => {
    const z = levelCrossing(PILOT_EYE.y)
    const halfWidth = canopyHalfWidthAt(z)
    // A real margin, not a knife edge: the panel narrows fast toward the nose.
    expect(halfWidth - Math.abs(PILOT_EYE.x)).toBeGreaterThan(0.08)
  })

  it('the eye is 1.65m above the cabin floor, seated, not standing', () => {
    expect(PILOT_EYE.y - COCKPIT.floorY).toBeCloseTo(1.65, 6)
  })
})

describe('the raised deck still fits inside the hull', () => {
  const stations = [COCKPIT.consoleZ, PILOT_EYE.z, COCKPIT.seatZ, COCKPIT.seatZ + 0.6]

  it('the eye clears the skin at every cockpit station', () => {
    for (const z of stations) {
      expect(outwardAt(PILOT_EYE.x, PILOT_EYE.y, z)).toBeLessThan(-0.2)
    }
  })

  it('the head above the eye, and the seat outboard of it, clear it too', () => {
    const headTop = PILOT_EYE.y + 0.14
    const seatEdge = COCKPIT.seatOffsetX + COCKPIT.seatWidth / 2
    for (const z of [PILOT_EYE.z, COCKPIT.seatZ]) {
      expect(outwardAt(PILOT_EYE.x, headTop, z)).toBeLessThan(-0.05)
      expect(outwardAt(seatEdge, COCKPIT.floorY + COCKPIT.seatPanAboveFloor, z)).toBeLessThan(-0.3)
    }
  })

  it('the floor stands on real hull for the whole cockpit, nose station included', () => {
    for (let aft = 0.5; aft <= 5.7; aft += 0.25) {
      const z = aft - HALF_LENGTH
      const ring = buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
      // Inside the skin at the floor's own height, on the centreline at least.
      expect(outwardDistance(0, COCKPIT.floorY, ring)).toBeLessThan(0)
    }
  })
})
