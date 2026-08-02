// vehicle-shop/ornihopter/src/model/geometry/canopyFlush.test.ts
// Round 6a's canopy guard. A blind critic: "a short windshield box perched on
// the fore-deck like a truck cab" where the kit has a flush glazed deck.
//
// The kit settles it. Canopy.stl is a 45.01 x 16.81 x 1.80mm PLATE — a
// footprint that tapers to a point at both ends, i.e. a panel that follows the
// hull's own taper, with a recessed glazing strip and chamfered edges
// (docs/profiles/kit-dossier.md section c, docs/profiles/canopy-deck.json).
// Nothing box-shaped anywhere in it. The assembled-kit close-up
// (docs/dune_ornihopter_kit-3.png) shows the same thing in three dimensions:
// a long tapering panel lying IN the deck with a chamfered rim, not a cab
// standing on it.
//
// Proudness is the assertable form of that. Measured on the pre-round canopy:
// the ridge stood 1.06m above the local deck line at 3.0m aft, on a hull whose
// whole half-height there is 2.11m — a box half as tall as the pod it sat on.
// The bar below is a rim, not a cab.

import { describe, it, expect } from 'vitest'
import { canopySectionAt, CANOPY_STATION_Z } from './canopyGeometry'
import { hullHalfHeightAt, hullKeelYAt } from './hullProfile'
import { HALF_LENGTH, PILOT_EYE } from '../../spec'

/** Top of the hull's own skin at craft-local z: that station's section centre
 *  plus its half-height — the same numbers hullGreebles.ts's deckYAt reads. */
const deckYAt = (z: number): number => hullKeelYAt(z) + hullHalfHeightAt(z)

/** How far the canopy's crown stands above the deck it sits on. A flush panel
 *  with a chamfered rim is a small positive number; a perched box is not. */
const proudnessAt = (z: number): number => canopySectionAt(z).peakY - deckYAt(z)

const SAMPLE_STEP = 0.1

function sampleStations(): number[] {
  const out: number[] = []
  const from = CANOPY_STATION_Z.nose
  const to = CANOPY_STATION_Z.rear
  for (let z = from; z <= to + 1e-9; z += SAMPLE_STEP) out.push(z)
  return out
}

describe('the canopy is a flush glazed deck, not a windshield box', () => {
  it('never stands more than a chamfered rim proud of the local deck line', () => {
    let worst = { z: 0, proud: -Infinity }
    for (const z of sampleStations()) {
      const proud = proudnessAt(z)
      if (proud > worst.proud) worst = { z, proud }
    }
    console.log(
      `[canopy] worst proudness ${worst.proud.toFixed(2)}m at ${(worst.z + HALF_LENGTH).toFixed(1)}m aft`,
    )
    expect(worst.proud).toBeLessThanOrEqual(0.45)
  })

  it('never dips below the deck either — it is a panel IN the skin, not a trench', () => {
    for (const z of sampleStations()) {
      expect(proudnessAt(z)).toBeGreaterThan(-0.2)
    }
  })

  it('follows the hull taper: its own half-width narrows toward the nose', () => {
    // The plate's footprint tapers; a box does not. Sampled at the two ends of
    // the canopy's own run rather than asserting a specific width.
    const fore = canopySectionAt(CANOPY_STATION_Z.nose + 0.4).halfWidth
    const aft = canopySectionAt(CANOPY_STATION_Z.rear - 0.4).halfWidth
    console.log(`[canopy] halfWidth fore ${fore.toFixed(2)}m, aft ${aft.toFixed(2)}m`)
    expect(fore).toBeLessThan(aft)
  })

  it('runs about 40% of the pod length, per the measured plate', () => {
    // Canopy.stl's 45.01mm against Airframe_main.stl's 112.8mm fat-hull run is
    // 39.9% (kit-dossier.md section c). The pod here is the run from the nose
    // to where the boom takes over, 13.5m.
    const run = CANOPY_STATION_Z.rear - CANOPY_STATION_Z.nose
    const fraction = run / 13.5
    console.log(`[canopy] length ${run.toFixed(2)}m = ${(fraction * 100).toFixed(1)}% of the pod`)
    expect(fraction).toBeGreaterThan(0.3)
    expect(fraction).toBeLessThan(0.55)
  })

  it('still covers the pilot: the eye sits under the glazing, inboard of its edge', () => {
    // The canopy may be flush, but it may not stop being the thing the pilot
    // sits under — spec.ts PILOT_EYE is where the pilot camera goes.
    const section = canopySectionAt(PILOT_EYE.z)
    console.log(
      `[canopy] at the eye: crown ${section.peakY.toFixed(2)}m, ` +
      `halfWidth ${section.halfWidth.toFixed(2)}m vs eye x ${PILOT_EYE.x}, y ${PILOT_EYE.y.toFixed(2)}`,
    )
    expect(section.peakY).toBeGreaterThan(PILOT_EYE.y + 0.5)
    expect(section.halfWidth).toBeGreaterThan(Math.abs(PILOT_EYE.x) + 0.3)
  })
})
