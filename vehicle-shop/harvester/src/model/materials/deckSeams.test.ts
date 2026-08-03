// vehicle-shop/harvester/src/model/materials/deckSeams.test.ts
// THE CORRECTNESS BAR FOR ROUND I6, as arithmetic: "do the panel lines follow
// the machine's actual construction — seams where plates would meet?"
//
// These walk the deck's REAL seam stations, computed from hullDetail's own
// SEAM_COUNT and SEAM_WIDTH (the numbers buildDeck lays the plates out with),
// through the RoundedBoxGeometry UV mapping and into the body map's texels.
// A map whose dark bands landed anywhere else — a fifth of the way in, or on
// the rounded shoulder where no flat deck is — fails here even though it
// would look "textured" in a render.

import { describe, it, expect } from 'vitest'
import { BODY } from '../../spec'
import { SEAM_COUNT } from '../hullDetail'
import {
  DECK_PLATE_COUNT, DECK_SEG_LEN, SEAM_HALF_GAP,
  deckPlateAt, deckPlateSpan, deckSeamStations, deckTopV, topV,
} from './deckSeams'
import { buildPlateMaps, PLATE_SIZE_LARGE } from './maps'
import { BODY_PLATE } from './plateTexel'
import { sampleAlbedo } from './dataTexture'
import { luminance } from './palette'

const maps = buildPlateMaps(BODY_PLATE, PLATE_SIZE_LARGE)
/** A u well clear of the centre join at u = 0.5 and of the side border
 *  bands, so these read the TRANSVERSE seam story and nothing else. */
const U_CLEAR = 0.3

const lumAt = (u: number, v: number): number => luminance(sampleAlbedo(maps.map, u, v))

describe('the deck plate stations', () => {
  it('are the four transverse seams buildDeck actually builds', () => {
    const stations = deckSeamStations()
    expect(stations).toHaveLength(SEAM_COUNT)
    stations.forEach((z, i) => expect(z).toBeCloseTo([-14.4, -4.8, 4.8, 14.4][i], 6))
    expect(DECK_PLATE_COUNT).toBe(SEAM_COUNT + 1)
    expect(DECK_SEG_LEN).toBe((BODY.tailZ - BODY.noseZ) / DECK_PLATE_COUNT)
  })

  it('leave a real gap at each seam — the station is on no plate', () => {
    for (const z of deckSeamStations()) expect(deckPlateAt(z)).toBe(-1)
    expect(deckPlateAt(BODY.noseZ)).toBe(0)
    expect(deckPlateAt(BODY.tailZ)).toBe(SEAM_COUNT)
  })

  it('map z to v the way RoundedBoxGeometry does, shoulders included', () => {
    // Probed off the real 19 x 2.5 x 9.6 r=1.0 plate: 1 m in from an edge is
    // v = 0.086, not the 0.104 a linear face would give.
    expect(topV(1, 9.6, 1)).toBeCloseTo(0.9144, 3)
    expect(topV(8.6, 9.6, 1)).toBeCloseTo(0.0856, 3)
    expect(topV(0, 9.6, 1)).toBe(1)
    expect(topV(9.6, 9.6, 1)).toBe(0)
  })
})

describe('the panel map lands its dark bands on the real seams', () => {
  it('darkens the deck at every seam station and nowhere in a plate centre', () => {
    const centres: number[] = []
    for (let i = 0; i < DECK_PLATE_COUNT; i++) {
      const [start, end] = deckPlateSpan(i)
      centres.push(lumAt(U_CLEAR, deckTopV((start + end) / 2)))
    }
    const cleanest = Math.min(...centres)

    for (const station of deckSeamStations()) {
      // The plate edges either side of the gap: 5 cm onto the plate, which is
      // the first deck a camera sees past the recessed seam itself.
      for (const z of [station - SEAM_HALF_GAP - 0.05, station + SEAM_HALF_GAP + 0.05]) {
        const seamLum = lumAt(U_CLEAR, deckTopV(z))
        expect(seamLum).toBeLessThan(cleanest * 0.85)
      }
    }
  })

  it('draws a scribed line INSIDE each plate, on flat deck the eye can see', () => {
    const [start, end] = deckPlateSpan(2)
    const centreLum = lumAt(U_CLEAR, deckTopV((start + end) / 2))
    // Sweep from 1 m in (past the rounded shoulder, where flat deck starts)
    // to 3.5 m in and find the darkest deck: that is where the line is. A
    // line drawn at a UV inset that fell on the shoulder would leave this
    // stretch featureless and fail.
    let darkest = Infinity
    let darkestAt = 0
    for (let d = 1; d <= 3.5; d += 0.02) {
      const lum = lumAt(U_CLEAR, deckTopV(start + d))
      if (lum < darkest) {
        darkest = lum
        darkestAt = d
      }
    }
    expect(darkest).toBeLessThan(centreLum * 0.8)
    expect(darkestAt).toBeGreaterThan(1.2)
    expect(darkestAt).toBeLessThan(2.2)
  })

  it('draws the longitudinal centre join down the deck, not across it', () => {
    const mid = deckTopV(0)
    expect(lumAt(0.5, mid)).toBeLessThan(lumAt(U_CLEAR, mid) * 0.8)
  })
})
