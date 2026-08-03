// vehicle-shop/ornihopter/src/interior/sideGlance.test.ts
// BAR B6 — the USER RULING that opened the frozen exterior for exactly one
// change: "full apache side panes and thiner frames. cause the two pilots
// share the same narrow front window and they don't sit center to it. so each
// pilot sees more to the other side than its front view."
//
// The ruling carries its own reasoning, and it is geometric: both seats look
// out of ONE deck aperture whose centreline is the craft's, while the seats
// sit +/-0.38m off it (spec.ts COCKPIT.seatOffsetX). From the pilot's chair
// the useful half of that window is the copilot's half. A crew station is not
// flyable out of the far half of someone else's windscreen, so each seat gets
// its own flank glazed.
//
// WHAT THIS MEASURES, and why it needs two instruments:
//   reachesExterior() walks past transparent hits and answers "is there
//   daylight down this ray" — the B6 destination, quantified as the fraction
//   of a level sideways frame that reaches outside.
//   castGaze() stops at the FIRST hit and answers "was anything there at all"
//   — the zero-escape contract, extended over the new openings. A pane that
//   raised the first number by cutting a hole in the liner and nothing else
//   would fail the second, which is precisely the failure mode this pairs
//   against.
//
// MEASURED RED, before round 11's panes (32x20 = 640 rays per pose):
//   pilot   at yaw -90, pitch 0 : exterior  0.0%   escaped 0
//   copilot at yaw +90, pitch 0 : exterior  0.0%   escaped 0
// The cabin was sealed and blind on both flanks: cabinShellWall.ts's liner ran
// floor to roof with no opening in it anywhere.

import { describe, it, expect, afterAll } from 'vitest'
import type { Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { buildCanopy } from '../model/geometry/canopyGeometry'
import { PILOT_EYE } from '../spec'
import { COPILOT_EYE, gazeDirection, reachesExterior, castGaze, seatEye } from './sightlines'

const cockpit = createCockpit()
const canopy = buildCanopy()
const targets: Object3D[] = [cockpit.root as unknown as Object3D, canopy.group]

afterAll(() => {
  cockpit.dispose()
  for (const g of canopy.geometries) g.dispose()
  for (const m of canopy.materials) m.dispose()
})

const COLS = 32
const ROWS = 20

interface Glance {
  exterior: number
  escaped: number
  total: number
}

/** One level sideways frame from `seat`, at `yawDeg` — every ray asked both
 *  questions in one sweep so the two numbers describe the same rays. */
function glance(seat: { x: number; y: number; z: number }, yawDeg: number): Glance {
  const eye = seatEye(seat)
  let exterior = 0
  let escaped = 0
  for (let r = 0; r < ROWS; r++) {
    const ndcY = 1 - ((r + 0.5) * 2) / ROWS
    for (let c = 0; c < COLS; c++) {
      const ndcX = ((c + 0.5) * 2) / COLS - 1
      const dir = gazeDirection(ndcX, ndcY, yawDeg, 0)
      if (reachesExterior(targets, dir, eye)) exterior++
      if (castGaze(targets, dir, eye).hit === 'open') escaped++
    }
  }
  return { exterior, escaped, total: COLS * ROWS }
}

/** Own side: the pilot sits to port (PILOT_EYE.x < 0) and looks to port, which
 *  is negative yaw (sightlines.ts's gazeDirection: positive yaw is starboard). */
const SEATS: ReadonlyArray<readonly [string, { x: number; y: number; z: number }, number]> = [
  ['pilot', PILOT_EYE, -90],
  ['copilot', COPILOT_EYE, 90],
]

describe('B6 — a level sideways glance from either seat reaches the desert', () => {
  for (const [name, seat, yaw] of SEATS) {
    it(`${name} sees outside through the flank pane at yaw ${yaw}, pitch 0`, () => {
      const g = glance(seat, yaw)
      expect((g.exterior / g.total) * 100).toBeGreaterThanOrEqual(30)
    })
  }

  it('the two flanks are glazed symmetrically, not one side only', () => {
    const port = glance(PILOT_EYE, -90)
    const starboard = glance(COPILOT_EYE, 90)
    const delta = Math.abs(port.exterior - starboard.exterior) / port.total
    expect(delta).toBeLessThan(0.05)
  })
})

describe('the zero-escape contract extends over the new openings', () => {
  // Sideways and steeply sideways, both seats and BOTH directions: a pane
  // cut on the pilot's flank is also something the copilot looks across at,
  // and the far pane's frame edges are where a grazing ray would slip out.
  const YAWS = [-100, -90, -60, 60, 90, 100]
  for (const [name, seat] of SEATS) {
    for (const yaw of YAWS) {
      it(`${name} at yaw ${yaw} leaves only through glazing`, () => {
        const g = glance(seat, yaw)
        expect(`${name} yaw ${yaw}: ${g.escaped} escaped`).toBe(`${name} yaw ${yaw}: 0 escaped`)
      })
    }
  }
})
