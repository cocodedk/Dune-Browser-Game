// vehicle-shop/ornihopter/src/interior/liveView.test.ts
// BAR B3-LIVE, and the whole of round 9e: what the pilot sees at the gaze he
// actually FLIES in — level, pitch 0.
//
// USER FINDING #3, from flying the craft: "the pilot view is not good at all.
// I see literally nothing. Just a narrow band of view. I can fly it when the
// camera is outside the cockpit." Every earlier number in this campaign was
// measured at a +12 degree HELD head-look (round 9a's capture pose), which is
// not a pose anybody flies in — the bar flattered the view. So this file
// measures at pitch 0 and nowhere else.
//
// It also measures a different THING. enclosure.test.ts asks whether the
// airframe is sealed, and for that a transparent first hit is a fine answer.
// This asks whether the desert is actually there, so it walks the hit list to
// the first OPAQUE surface (sightlines.ts's firstOpaque): a ray that meets the
// cabin-side pane and then the canopy's own rim shows the pilot rim, not sky.
// MEASURED on the shipped tree, the two instruments disagreed by half —
// 15.2% "glazing" against 9.7% exterior.
//
// RED->GREEN, this round, all at pitch 0 with 64x40 = 2560 rays:
//   exterior          9.7% -> 20.5%   (bar: >= 20%; 11.0% -> 21.4% on capture pixels)
//   horizon run       17/80 cols -> 17/80  (unchanged; kit-bound, see below)
//   straight up       roof liner -> exterior (the aperture now spans the eye)
// The one number this round did NOT move is the horizon's own width, and that
// is honest: at level gaze the sightline crosses the deck 1.16m aft, where the
// KIT's panel is 0.77m half-wide (canopyPlan.ts's PLAN, frozen). What changed
// is everything above it — the pilot sits under glass instead of looking down
// a duct at a distant skylight.

import { describe, it, expect, afterAll } from 'vitest'
import type { Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { buildCanopy } from '../model/geometry/canopyGeometry'
import { gazeDirection, firstOpaque, reachesExterior } from './sightlines'
import { mullionStations, APERTURE_REAR_Z } from './canopyLayout'
import { PILOT_EYE, HALF_LENGTH } from '../spec'

/** The capture is 1600x1000; 64x40 samples it on the same aspect, one sample
 *  per 25x25 pixel block — fine enough that a frame member cannot hide
 *  between samples and coarse enough to stay a sub-second unit test. */
const COLS = 64
const ROWS = 40

const cockpit = createCockpit()
const canopy = buildCanopy()
const targets: Object3D[] = [cockpit.root as unknown as Object3D, canopy.group]

afterAll(() => {
  cockpit.dispose()
  for (const g of canopy.geometries) g.dispose()
  for (const m of canopy.materials) m.dispose()
})

interface Sample {
  ndcX: number
  ndcY: number
  exterior: boolean
}

function levelFrame(): Sample[] {
  const out: Sample[] = []
  for (let r = 0; r < ROWS; r++) {
    const ndcY = 1 - ((r + 0.5) * 2) / ROWS
    for (let c = 0; c < COLS; c++) {
      const ndcX = ((c + 0.5) * 2) / COLS - 1
      out.push({ ndcX, ndcY, exterior: reachesExterior(targets, gazeDirection(ndcX, ndcY)) })
    }
  }
  return out
}

/** Longest unbroken run of exterior samples along one screen row. */
function longestRun(ndcY: number, cols = 80): number {
  let best = 0
  let run = 0
  for (let c = 0; c < cols; c++) {
    const ndcX = ((c + 0.5) * 2) / cols - 1
    if (reachesExterior(targets, gazeDirection(ndcX, ndcY))) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

function blockerAt(ndcX: number, ndcY: number): string {
  const hit = firstOpaque(targets, gazeDirection(ndcX, ndcY))
  if (!hit) return '(exterior)'
  const group = hit.object.parent?.name || hit.object.name || '(unnamed)'
  return `${group}@${(hit.point.z + HALF_LENGTH).toFixed(2)}m-aft`
}

const frame = levelFrame()
const exteriorFraction = frame.filter((s) => s.exterior).length / frame.length

describe('B3-LIVE: the level-gaze view a pilot actually flies in', () => {
  it('the outside is at least a fifth of the frame at pitch 0', () => {
    // Was 0.097 on the shipped tree — the "narrow band" the user reported,
    // and the reason he could only fly from an outside camera.
    expect(exteriorFraction).toBeGreaterThanOrEqual(0.2)
  })

  it('the horizon line is dead ahead: the centre of the frame is open sky/desert', () => {
    // At level gaze the horizon is at ndcY 0 by construction, so this is the
    // attitude reference itself. Reported with its blocker so a regression
    // names the member that took the horizon away.
    expect(`(0,0) -> ${blockerAt(0, 0)}`).toBe('(0,0) -> (exterior)')
  })

  it('and the horizon is a band, not a slit: an unbroken run across the centre row', () => {
    // MEASURED 17 of 80 columns (21% of frame width) both before and after
    // this round: the level sightline crosses the deck at 1.16m aft where the
    // KIT panel is 0.77m half-wide, so this width is not ours to spend. Pinned
    // as a floor so a later round cannot narrow it while widening something
    // else. Raising PILOT_EYE 0.25m moves the crossing aft into wider panel
    // and measures 25/80 — a real lever, costed and deliberately not taken
    // here (it moves the 6b eye derivation and every panel-subtense number
    // with it).
    expect(longestRun(0)).toBeGreaterThanOrEqual(15)
  })

  it('glass is overhead: the pilot sits UNDER the aperture, not a metre behind it', () => {
    // The aperture used to end at 2.45m aft with the eye at 3.45m aft. Looking
    // straight up from the seat met roof liner; now it meets the canopy.
    // MEASURED sweep straight up the pilot's own centreline: sky from level to
    // 45 degrees, the overhead console from 50 to 70 (it hangs at 3.0m aft —
    // where an overhead console belongs, and it is named here rather than
    // assumed away), then sky again to the vertical. 50-70 is therefore
    // deliberately absent from this list, and 55 at a 25-degree glance to
    // port — past the console — is present.
    for (const [yaw, pitch] of [[0, 40], [-25, 55], [0, 75], [0, 89]]) {
      expect(
        `yaw ${yaw} pitch ${pitch} -> ${reachesExterior(targets, gazeDirection(0, 0, yaw, pitch))}`
      ).toBe(`yaw ${yaw} pitch ${pitch} -> true`)
    }
    expect(APERTURE_REAR_Z).toBeGreaterThan(PILOT_EYE.z)
  })

  it('it still reads ENCLOSED: most of the frame is structure, with arches overhead', () => {
    // The anti-"open hole" half of the bar (B4.3). A greenhouse is the goal;
    // a canopy-less dash floating in the air is the round-6b failure. Both
    // halves are asserted: the majority of the level frame is still opaque
    // cockpit, and the new glazing carries transverse frame members on the
    // canopy's own stations rather than being one unbroken void.
    expect(1 - exteriorFraction).toBeGreaterThan(0.5)
    const arches = mullionStations().map((z) => Number((z + HALF_LENGTH).toFixed(2)))
    expect(arches.length).toBeGreaterThanOrEqual(1)
    for (const aft of arches) expect(aft).toBeGreaterThan(0.6)
  })
})
