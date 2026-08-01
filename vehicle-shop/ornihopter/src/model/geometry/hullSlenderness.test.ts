// vehicle-shop/ornihopter/src/model/geometry/hullSlenderness.test.ts
// The regression guard for the defect this round exists to fix.
//
// The previous station table held widthFrac >= 0.93 from 2.1m aft to 12.2m
// aft — 10.1m of a 22.896m body at essentially full beam. That is a slab with
// a point on each end, and it is exactly why the craft read as "a submarine
// with wings, not a dragonfly". Nothing in the suite could see it: every hull
// test asked about a single station at a time, and every single station was
// individually defensible.
//
// So these assertions are about the SHAPE OF THE DISTRIBUTION, not about any
// one station: how long the hull is allowed to stay near full beam, where the
// single widest point may sit, and how thin the boom must have become by a
// given distance aft. A future edit can move any station it likes; it cannot
// reintroduce a plateau without one of these failing.

import { describe, it, expect } from 'vitest'
import { STATIONS, widthFracAt, hullHalfHeightAt, hullHalfWidthAt } from './hullStations'
import { buildRing } from './hullCrossSection'
import { OVERALL, WING_ROOTS, HALF_LENGTH, COCKPIT } from '../../spec'

const STEP = 0.01

/** Longest CONTIGUOUS run, in metres, over which widthFrac stays at or above
 *  `threshold`. Contiguous rather than total: a crest that briefly touches the
 *  threshold twice is not a plateau, and this measure says so. */
function longestRunAtOrAbove(threshold: number): number {
  let longest = 0
  let run = 0
  for (let m = 0; m <= OVERALL.length; m += STEP) {
    if (widthFracAt(m) >= threshold) {
      run += STEP
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }
  return longest
}

describe('the hull is slender, not a slab (the "submarine with wings" regression)', () => {
  it('never holds 90% of full beam for longer than 3.5m', () => {
    const run = longestRunAtOrAbove(0.9)
    console.log(`[slenderness] longest run at >=0.90 beam: ${run.toFixed(2)}m`)
    expect(run).toBeLessThanOrEqual(3.5)
  })

  it('never holds 85% of full beam for longer than 6.5m', () => {
    // The old table's own figure here was over 12m. Catching only the 0.9
    // case would let a near-plateau one notch lower slip straight back in.
    expect(longestRunAtOrAbove(0.85)).toBeLessThanOrEqual(6.5)
  })

  it('has narrowed to under 30% of full beam by 16m aft, and 20% by 18m', () => {
    expect(widthFracAt(16)).toBeLessThanOrEqual(0.3)
    expect(widthFracAt(18)).toBeLessThanOrEqual(0.2)
  })

  it('puts its single widest point on the wing shoulder', () => {
    let widest = { metresAft: 0, frac: -1 }
    for (let m = 0; m <= OVERALL.length; m += STEP) {
      const frac = widthFracAt(m)
      if (frac > widest.frac) widest = { metresAft: m, frac }
    }
    const first = WING_ROOTS[0].z + HALF_LENGTH
    const last = WING_ROOTS[WING_ROOTS.length - 1].z + HALF_LENGTH
    expect(widest.metresAft).toBeGreaterThanOrEqual(first)
    expect(widest.metresAft).toBeLessThanOrEqual(last)
    expect(widest.frac).toBeCloseTo(1, 6)
  })

  it('still gives every wing-root station a real shoulder to sit on', () => {
    // The crest may be a crest, but it must genuinely span all four mounts:
    // rootPod.ts seats the ball housings off hullHalfWidthAt, so a shoulder
    // that collapsed between stations would splay the row of eight pods.
    for (const mount of WING_ROOTS) {
      expect(widthFracAt(mount.z + HALF_LENGTH)).toBeGreaterThanOrEqual(0.8)
    }
  })

  it('keeps the pod deep and the boom shallow — the dragonfly proportion', () => {
    const pod = hullHalfHeightAt(COCKPIT.seatZ)
    const boom = hullHalfHeightAt(18 - HALF_LENGTH)
    console.log(`[slenderness] pod half-height ${pod.toFixed(2)}m, boom ${boom.toFixed(2)}m`)
    // The old table, where height was a fixed multiple of width, managed 2.8
    // here. Measured on this one: 7.1.
    expect(pod / boom).toBeGreaterThan(6)
  })

  it('flattens the boom: it is wider than it is tall aft of the shoulder', () => {
    for (const m of [14, 16, 18, 20]) {
      const z = m - HALF_LENGTH
      expect(hullHalfHeightAt(z)).toBeLessThan(hullHalfWidthAt(z))
    }
  })
})

describe('every authored station produces a convex section', () => {
  // hullCrossSection.ts's outwardDistance is a max over edge half-planes,
  // which is only an exact containment test for a CONVEX ring — and
  // isOutsideHull is what the wing-clearance suite trusts. The upper-flank
  // vertex added this round is the one that could break it.
  it('turns the same way at every vertex, at every station', () => {
    for (const s of STATIONS) {
      if (s.widthFrac <= 0 || s.heightFrac <= 0) continue
      const ring = buildRing(
        s.widthFrac * (OVERALL.bodyWidth / 2),
        s.heightFrac * (OVERALL.bodyHeight / 2),
        { deckHalfWidthFrac: s.deckFrac, bellyHalfWidthFrac: s.bellyFrac },
      )
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        const c = ring[(i + 2) % ring.length]
        const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
        expect(cross).toBeGreaterThan(0)
      }
    }
  })
})
