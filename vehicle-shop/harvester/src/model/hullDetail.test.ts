// vehicle-shop/harvester/src/model/hullDetail.test.ts
// Deck plate / seam / seam-lip invariants — split out of hull.test.ts
// (I2 pass 3) alongside hullDetail.ts, so hull.test.ts stays under the
// 200-line cap once the nose-step taper (destination 1) and the per-plate
// seam-lip rewrite (destination 3) added their own assertions.
//
// I2 pass 3 (critic 2/10 — taper/beams art-direction errors, not visible
// from ANY profile/3-4 camera below the housing line): ADDS the nose-step
// taper invariant — the foremost deck plate's own top must sit strictly
// between the track housing's top and the un-stepped deck top, never at or
// below the housing line (below which no profile camera can see it).
// REWRITES the seam-lip test to check each lip against ITS OWN plate's
// local top, not a single global constant, now that plate 0 has a
// different one.

import { describe, it, expect } from 'vitest'
import { buildHull } from './hull'
import { deckTopAt, NOSE_DECK_STEPS } from './hullDetail'
import { BODY, TRACK } from '../spec'
import { mats, bounds, named } from './testSupport'

describe('hull deck detail', () => {
  it('deck seams are inset — no seam geometry above the deck top plane', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const seams = named(group, 'deckSeam')
    expect(seams.length).toBeGreaterThanOrEqual(3)
    for (const seam of seams) {
      const b = bounds(seam)
      expect(b.max.y).toBeLessThanOrEqual(BODY.deckTop + 1e-6)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('seam lips stand proud of their OWN plate\'s local top, framing the recessed groove', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const lips = named(group, 'deckSeamLip')
    expect(lips.length).toBeGreaterThanOrEqual(6)
    const validTops = [BODY.deckTop, ...NOSE_DECK_STEPS]
    for (const lip of lips) {
      const b = bounds(lip)
      const matchesATop = validTops.some((top) => Math.abs(b.min.y - top) < 1e-6)
      expect(matchesATop).toBe(true)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('the foremost deck plate steps down but stays above the track housing\'s own top', () => {
    // Destination 1: the taper must read in profile, which pass 2's
    // sub-housing tiers could not (occluded by the full-length pods below
    // y=11). Pinning the constraint directly: strictly between the housing
    // top and the un-stepped deck top.
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const plates = named(group, 'deckPlate')
    const noseMost = plates.reduce((a, p) => (bounds(p).min.z < bounds(a).min.z ? p : a))
    const b = bounds(noseMost)
    expect(b.max.y).toBeCloseTo(deckTopAt(0), 6)
    expect(deckTopAt(0)).toBeGreaterThan(TRACK.housing.yHigh)
    expect(deckTopAt(0)).toBeLessThan(BODY.deckTop)
    for (const mat of Object.values(m)) mat.dispose()
  })
})
