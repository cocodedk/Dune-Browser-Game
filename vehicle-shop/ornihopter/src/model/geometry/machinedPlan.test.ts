// vehicle-shop/ornihopter/src/model/geometry/machinedPlan.test.ts
// Round 6a's plan-read guard. hullSlenderness.test.ts already forbids a slab;
// nothing forbade the opposite defect, which is what a blind critic actually
// saw: "the pod reads as a lofted rounded bulb... a beetle thorax, not a
// wedge... the render's front mass reads organic where the reference reads
// engineered."
//
// The cause is measurable and it is not the cross-section (hullCrossSection.ts
// has been an eight-point faceted ring for three rounds). It is the PLAN. A
// station table whose widthFrac changes slope at EVERY row is a French curve:
// every bay is a slightly different angle, so no two adjacent panels share a
// plane and none of them is long enough to read as a slab. Measured on the
// pre-round table: the longest straight run in the pod was 1.30m out of a
// 22.896m craft, and seven of its nineteen interior stations turned by under
// 3 degrees — breaks too soft to catch a different light value, which is the
// definition of a curve approximated by facets.
//
// So these assertions are about the plan outline's PIECEWISE STRUCTURE, not
// about any station's value: how long a straight run the flanks must contain,
// and how hard every corner between runs must be. hullSlenderness.test.ts is
// free to keep governing the envelope; this governs the language.

import { describe, it, expect } from 'vitest'
import { STATIONS } from './hullStations'
import { OVERALL } from '../../spec'

const HALF_WIDTH = OVERALL.bodyWidth / 2

/** The pod and shoulder — everything forward of where the boom takes over. The
 *  boom is a fine taper and is allowed to be finely stepped; the front mass is
 *  what the critic was looking at. */
const FRONT_MASS_AFT = 13.5

const front = STATIONS.filter((s) => s.metresAft <= FRONT_MASS_AFT)

/** Plan half-width in metres at an authored station — the outline this file
 *  measures is the real one the loft draws, not the normalised fraction. */
const planX = (i: number): number => front[i].widthFrac * HALF_WIDTH

/** Turn angle in degrees at interior station i: how sharply the plan outline
 *  changes direction there. Zero is dead straight through. */
function turnDegreesAt(i: number): number {
  const before = Math.atan2(planX(i) - planX(i - 1), front[i].metresAft - front[i - 1].metresAft)
  const after = Math.atan2(planX(i + 1) - planX(i), front[i + 1].metresAft - front[i].metresAft)
  return Math.abs(before - after) * (180 / Math.PI)
}

describe('the pod plan is machined slabs, not a French curve', () => {
  it('contains a genuinely long straight flank run', () => {
    // A slab has to be long enough to read as one surface at hero distance.
    // Measured pre-round: 1.30m, and that is the whole defect — no facet in
    // the front mass was ever more than a metre and change of a 22.9m craft.
    let longest = 0
    let where = ''
    for (let i = 0; i < front.length - 1; i++) {
      const run = front[i + 1].metresAft - front[i].metresAft
      if (run > longest) {
        longest = run
        where = `${front[i].metresAft}m -> ${front[i + 1].metresAft}m`
      }
    }
    console.log(`[plan] longest straight flank run: ${longest.toFixed(2)}m (${where})`)
    expect(longest).toBeGreaterThanOrEqual(3.0)
  })

  it('turns hard at every break, with no soft micro-turns anywhere in the front mass', () => {
    // A break under a few degrees is not a break: adjacent panels end up
    // near-coplanar, their normals near-identical, and the flat-shaded loft
    // hullLoft.ts goes to such trouble to keep faceted renders as one smooth
    // surface anyway. Pre-round, stations at 3.6m, 4.9m and 11.0m aft turned
    // 2.5, 1.2 and 2.5 degrees.
    const soft: string[] = []
    for (let i = 1; i < front.length - 1; i++) {
      const turn = turnDegreesAt(i)
      if (turn < 6) soft.push(`${front[i].metresAft}m: ${turn.toFixed(1)}deg`)
    }
    console.log(`[plan] breaks softer than 6deg: ${soft.length ? soft.join(', ') : 'none'}`)
    expect(soft).toEqual([])
  })

  it('spends few enough stations on the front mass that each one has to earn its place', () => {
    // The direct expression of "a few flat slab segments". Every extra station
    // is another chance to interpolate a curve; the pre-round table used
    // thirteen to cover the same 13.5m these must cover in at most eight.
    console.log(`[plan] front-mass stations: ${front.length} (${front.map((s) => s.metresAft).join(', ')})`)
    expect(front.length).toBeLessThanOrEqual(8)
  })
})

describe('the machined plan still seats the cabin it wraps', () => {
  it('keeps the belly wide enough at the seat station for the floor to land inside the skin', () => {
    // interior/hullSection.ts derives the cabin floor and walls live from this
    // table, so a plan edit silently moves them. 0.436 is the measured
    // threshold below which cabinShell.ts's floor stops finding hull to sit
    // on at COCKPIT.floorY and starts dropping segments.
    const seat = STATIONS.find((s) => s.metresAft <= 3.6 && s.metresAft >= 2.9)
    expect(seat).toBeDefined()
    for (const s of STATIONS) {
      if (s.metresAft < 2.5 || s.metresAft > 5.0) continue
      expect(s.bellyFrac).toBeGreaterThanOrEqual(0.44)
    }
  })
})
