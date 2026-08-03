// vehicle-shop/ornihopter/src/interior/quarterView.test.ts
// ROUND 15, the USER ORDER that opened the frozen exterior a second time:
// "there two more side pannels on the cockpit which can be swapped with glass.
// to provide better view. one left and one right."
//
// WHY THIS FILE AND NOT A LINE IN liveView.test.ts. The brief's proposed
// measurable was "exterior >= 25% of the frame at yaw +/-40". MEASURED on the
// shipped tree before a line was changed, 64x40 rays: yaw -40 read 33.6% and
// yaw +40 read 35.7%. Both already passed, and the view was still blind where
// the critic said it was — because the pilot camera's frame is 93 degrees WIDE
// (sightlines.ts: 68 deg vertical at 1.6 aspect), so a frame centred on yaw 40
// is three quarters filled by round 11's flank pane and reports its daylight
// as the quarter's. A full frame cannot measure a bearing. This file measures
// BEARINGS: a narrow +/-12 degree cone about each one, which is roughly what a
// pilot's foveal glance covers and is small enough that only the glass on that
// bearing can answer for it.
//
// MEASURED RED, same 21x21 cone, pitch 0, pilot eye — the forward quarter was
// a blind arc on BOTH bearings:
//   yaw  -20  0.9%   -25  0.0%   -30  0.0%   -35  2.3%   -40 12.9%   -45 25.4%
//   yaw  +30 15.0%   +35  4.3%   +40  0.0%   +45  0.0%   +50  7.3%
// and the single centre ray at pitch 0 named the thing in the way: yaw -30 met
// `wall-pilot` at 1.72m aft, yaw -40 at 2.04m, yaw +40 met `wall-copilot` at
// 1.50m. Cabin liner, over the stretch of flank between the deck aperture and
// round 11's pane — which is the panel the user is pointing at.
//
// GREEN after the quarter opening (flankOpenings.ts):
//   yaw  -20 15.4%   -25 24.9%   -30 28.6%   -35 30.4%   -40 36.7%   -45 39.5%
//   yaw  +30 17.9%   +35 15.0%   +40 20.0%   +45 23.4%   +50 31.1%
// The two bearings are not symmetric and cannot be: the pilot sits at x=-0.38,
// so his own flank is 1.3m away and the far one 2.1m, and a bearing across the
// cockpit crosses the far flank further forward — at +35 it crosses where the
// hull is too shallow to carry a window at all. The bar below is therefore per
// bearing, not a mirror.

import { describe, it, expect, afterAll } from 'vitest'
import type { Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { buildCanopy } from '../model/geometry/canopyGeometry'
import { gazeDirection, reachesExterior, castGaze, seatEye, COPILOT_EYE } from './sightlines'
import { PILOT_EYE } from '../spec'
import {
  FLANK_OPENINGS, QUARTER_FORE_Z, QUARTER_AFT_Z, openingHeightAt,
} from '../model/geometry/flankOpenings'
import { WINDOW_FORE_Z } from '../model/geometry/flankWindow'

const cockpit = createCockpit()
const canopy = buildCanopy()
const targets: Object3D[] = [cockpit.root as unknown as Object3D, canopy.group]

afterAll(() => {
  cockpit.dispose()
  for (const g of canopy.geometries) g.dispose()
  for (const m of canopy.materials) m.dispose()
})

type Seat = { x: number; y: number; z: number }

/** Fraction of a +/-`half` degree cone about (yaw, 0) that reaches daylight. */
function cone(seat: Seat, yawDeg: number, half = 12, n = 21): number {
  const eye = seatEye(seat)
  let out = 0
  for (let r = 0; r < n; r++) {
    const pitch = -half + (2 * half * r) / (n - 1)
    for (let c = 0; c < n; c++) {
      const yaw = yawDeg - half + (2 * half * c) / (n - 1)
      if (reachesExterior(targets, gazeDirection(0, 0, yaw, pitch), eye)) out++
    }
  }
  return out / (n * n)
}

/** Rays of that cone that leave the airframe without meeting anything at all. */
function escapes(seat: Seat, yawDeg: number, half = 12, n = 21): number {
  const eye = seatEye(seat)
  let bad = 0
  for (let r = 0; r < n; r++) {
    const pitch = -half + (2 * half * r) / (n - 1)
    for (let c = 0; c < n; c++) {
      const yaw = yawDeg - half + (2 * half * c) / (n - 1)
      if (castGaze(targets, gazeDirection(0, 0, yaw, pitch), eye).hit === 'open') bad++
    }
  }
  return bad
}

/** OWN-SIDE quarter: the bearing each crewman turns his own head onto.
 *  Measured 0.0-12.9% before, 24.9-39.5% after. */
const OWN_SIDE = [25, 30, 35, 40, 45]
/** ACROSS-COCKPIT quarter: the far flank, crossed further forward. Measured
 *  0.0-15.0% before, 15.0-23.4% after. */
const FAR_SIDE = [35, 40, 45]

describe('the forward quarter reaches the desert, from both seats', () => {
  for (const yaw of OWN_SIDE) {
    it(`pilot at yaw -${yaw} sees out; copilot mirrors it at +${yaw}`, () => {
      expect(cone(PILOT_EYE, -yaw)).toBeGreaterThanOrEqual(0.2)
      expect(cone(COPILOT_EYE, yaw)).toBeGreaterThanOrEqual(0.2)
    })
  }
  for (const yaw of FAR_SIDE) {
    it(`pilot at yaw +${yaw} sees out across the cockpit; copilot at -${yaw}`, () => {
      expect(cone(PILOT_EYE, yaw)).toBeGreaterThanOrEqual(0.12)
      expect(cone(COPILOT_EYE, -yaw)).toBeGreaterThanOrEqual(0.12)
    })
  }

  it('the two flanks are glazed symmetrically, not one side only', () => {
    for (const yaw of [...OWN_SIDE, ...FAR_SIDE]) {
      const port = cone(PILOT_EYE, -yaw)
      const starboard = cone(COPILOT_EYE, yaw)
      expect(`${yaw}: ${Math.abs(port - starboard) < 0.02}`).toBe(`${yaw}: true`)
    }
  })

  it('the forward view is no longer a slit: the horizon row is half daylight', () => {
    // The critic's own complaint, as a number: "the aperture is a
    // downward-narrowing V", 9.8% of the horizon row outside on the capture.
    // This harness read 17 of 80 columns (21.25%) before and 40 (50.0%) after
    // — three runs now, the deck aperture in the middle with a quarter pane
    // either side of it, instead of one central slot.
    let outside = 0
    const cols = 80
    for (let c = 0; c < cols; c++) {
      const ndcX = ((c + 0.5) * 2) / cols - 1
      if (reachesExterior(targets, gazeDirection(ndcX, 0))) outside++
    }
    expect(outside / cols).toBeGreaterThanOrEqual(0.4)
  })
})

describe('the zero-escape contract extends over the quarter panes', () => {
  // The round-6b rule the reveal exists for: a new hole in the skin is a new
  // way out unless every edge of it is fenced with OVERLAP, not with a shared
  // edge. Swept at the bearings that actually cross the new opening and at its
  // jambs, both seats, 441 rays each — the grazing angles are where a butted
  // edge leaks.
  const YAWS = [-50, -45, -40, -35, -30, -25, -20, 20, 25, 30, 35, 40, 45, 50]
  for (const [name, seat] of [['pilot', PILOT_EYE], ['copilot', COPILOT_EYE]] as const) {
    for (const yaw of YAWS) {
      it(`${name} at yaw ${yaw} leaves only through glazing`, () => {
        expect(`${name} ${yaw}: ${escapes(seat, yaw)}`).toBe(`${name} ${yaw}: 0`)
      })
    }
  }
})

describe('the quarter opening is where the hull can carry it', () => {
  it('there are exactly two openings per flank, forward to aft', () => {
    expect(FLANK_OPENINGS.map((o) => o.name)).toEqual(['quarter', 'main'])
  })

  it('a real post of skin stands between them — two panes, not one long one', () => {
    // 0.10m. Round 11's opening keeps both its own ends, which is what makes
    // "the round 11 panes are untouched" checkable rather than asserted.
    expect(WINDOW_FORE_Z - QUARTER_AFT_Z).toBeCloseTo(0.1, 6)
  })

  it('both ends clear flankWindow.ts own 0.25m sill-to-header minimum', () => {
    // The forward end is the tight one: 0.267m at 1.35m aft, null at 1.30m.
    // 1.45m aft measures 0.311m — margin, not a knife edge.
    expect(openingHeightAt(QUARTER_FORE_Z)).toBeGreaterThan(0.3)
    expect(openingHeightAt(QUARTER_AFT_Z)).toBeGreaterThan(0.5)
  })
})
