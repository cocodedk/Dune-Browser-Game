// vehicle-shop/ornihopter/src/interior/enclosure.test.ts
// THE contract this round exists to make true: from the pilot's eye, every
// direction inside the camera's own frustum meets the cockpit — structure or
// glazing — and none of them leaves the airframe.
//
// MEASURED BEFORE THE FIX, with interior/sightlines.ts against the shipped
// round-6a cockpit, 48x30 samples per pose:
//   yaw   0, pitch   0 : open 64.0%  glazing  4.0%  structure 32.0%  top-half structure 16.3%
//   yaw  60, pitch   0 : open 50.3%  glazing  2.4%  structure 47.2%  top-half structure 15.6%
//   yaw -60, pitch   0 : open 100.0% glazing  0.0%  structure  0.0%  top-half structure  0.0%
//   yaw   0, pitch -20 : open 78.5%  glazing  0.0%  structure 21.5%  top-half structure 20.8%
// The critic sampling the capture read 18.3% top-half structure by eye; this
// harness read 16.3% from the meshes. Two independent instruments, one
// answer — and looking to port, the cockpit did not exist at all.
//
// MEASURED AFTER, same harness, same sample counts:
//   yaw   0, pitch   0 : open 0%  glazing 15.2%  structure 84.8%  top-half 72.1%
//   yaw  60, pitch   0 : open 0%  glazing 10.7%  structure 89.3%  top-half 80.4%
//   yaw -60, pitch   0 : open 0%  glazing  2.8%  structure 97.2%  top-half 94.4%
//   yaw   0, pitch -20 : open 0%  glazing  9.8%  structure 90.2%  top-half 80.4%
// and zero escapes at yaw +/-100 as well — 17,920 rays over seven poses.
//
// The bar below is deliberately about COVERAGE, not about any particular
// part being present. A test that named parts would pass with a hole beside
// every one of them, which is exactly how this shipped.

import { describe, it, expect, afterAll } from 'vitest'
import type { Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { buildCanopy } from '../model/geometry/canopyGeometry'
import { sampleFrame, coverage, castGaze, gazeDirection } from './sightlines'

const POSES: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [60, 0],
  [-60, 0],
  [0, -20],
]

const cockpit = createCockpit()
const canopy = buildCanopy()
const targets: Object3D[] = [cockpit.root as unknown as Object3D, canopy.group]

afterAll(() => {
  cockpit.dispose()
  for (const g of canopy.geometries) g.dispose()
  for (const m of canopy.materials) m.dispose()
})

describe('no ray from the pilot eye leaves the airframe', () => {
  for (const [yaw, pitch] of POSES) {
    it(`is sealed at yaw ${yaw}, pitch ${pitch}`, () => {
      const samples = sampleFrame(targets, 48, 30, yaw, pitch)
      const escaped = samples.filter((s) => s.hit === 'open')
      // Report the worst offender's screen position, so a regression says
      // WHERE the hole is rather than only that there is one.
      const where = escaped
        .slice(0, 3)
        .map((s) => `(${s.ndcX.toFixed(2)}, ${s.ndcY.toFixed(2)})`)
        .join(' ')
      expect(`${escaped.length} escaped ${where}`).toBe('0 escaped ')
    })
  }
})

describe('the cockpit reads as a cave, not a dash floating in open air', () => {
  it('opaque structure holds a real share of the top half of the forward frame', () => {
    const samples = sampleFrame(targets, 48, 30, 0, 0)
    const c = coverage(samples)
    // THRESHOLD CHANGED, round 9e: 0.55 -> 0.30. MEASURED across the change,
    // same 48x30 grid, same pose: structureTopHalf 0.721 -> 0.426.
    //
    // 0.55 encoded round 6b's cave — brow, roof liner and rails over the
    // pilot's head, one aperture ahead of him — and the user then flew it and
    // could not see out ("just a narrow band of view"). The aperture now spans
    // the eye station (canopyLayout.ts's APERTURE_REAR_Z, 2.45 -> 4.6m aft), so
    // the top of the frame is DELIBERATELY glass; keeping 0.55 would pin the
    // defect.
    //
    // ADAPTED AGAIN, round 15: 0.30 -> 0.20. MEASURED across the change on a
    // stashed rebuild of the pre-round tree, same 48x30 grid, same pose:
    //   open       0.0%  -> 0.0%
    //   glazing   34.0%  -> 42.7%
    //   structure 66.0%  -> 57.3%
    //   topHalf   34.6%  -> 22.5%
    // Same shape as round 11's adaptation and for the same reason: every point
    // this number lost went to GLASS, and open stayed at exactly zero. The
    // user ordered two more panes ("one left and one right") precisely so the
    // forward quarter is not liner, and the liner it replaced was in the top
    // half of the frame.
    //
    // The failure this assertion was really built against is round 6b's dash
    // floating in open air, which measured topHalf 0.163 WITH 64% of the frame
    // open. So the top half's own zero-escape is now asserted directly rather
    // than inferred from an opacity share — a frame that opened up instead of
    // glazing over fails here on the first line, whatever the second says.
    const top = samples.filter((s) => s.ndcY > 0)
    expect(`top-half open: ${top.filter((s) => s.hit === 'open').length}`).toBe('top-half open: 0')
    expect(c.structureTopHalf).toBeGreaterThan(0.2)
  })

  it('glazing is a real fraction of the forward frame, not a token pane', () => {
    const c = coverage(sampleFrame(targets, 48, 30, 0, 0))
    expect(c.glazing).toBeGreaterThan(0.06)
  })

  it('turning the head to either side finds cabin, symmetrically', () => {
    const port = coverage(sampleFrame(targets, 32, 20, -60, 0))
    const starboard = coverage(sampleFrame(targets, 32, 20, 60, 0))
    // ADAPTED, round 11, and disclosed: this asserted structure > 0.75 on
    // both flanks. MEASURED across the change on a stashed rebuild of the
    // pre-round tree, same 32x20 grid, same two poses:
    //   yaw -60  structure 0.941 -> 0.580   glazing 0.059 -> 0.420
    //   yaw +60  structure 0.783 -> 0.561   glazing 0.217 -> 0.439
    // The frame did not open, it GLAZED: every point the assertion lost to
    // structure went to glass, and open stayed at zero. The B6 user ruling
    // put a large flat pane in each upper flank precisely so that a sideways
    // glance is not wall.
    //
    // What the original was really guarding is intact and is asserted
    // harder below: turning the head must find CABIN — structure or glass,
    // never sky — which is the zero-escape suite above restated per flank,
    // and opaque structure must still hold a real share so the pane reads
    // as a framed window rather than a missing flank.
    for (const side of [port, starboard]) {
      expect(side.structure + side.glazing).toBeGreaterThan(0.99)
      expect(side.structure).toBeGreaterThan(0.45)
    }
    expect(Math.abs(port.structure - starboard.structure)).toBeLessThan(0.05)
  })
})

describe("the three holes the round-6 critic found by sampling pixels", () => {
  // Screen coordinates as reported, at the 1600x1000 capture size.
  const named: ReadonlyArray<readonly [string, number, number]> = [
    ['the slot between panel top and coaming', 935, 765],
    ['the lower-left gap past the dash', 55, 900],
    ['dead level forward, where the horizon is', 800, 500],
  ]
  for (const [label, px, py] of named) {
    it(`${label} is closed`, () => {
      const ndcX = (px / 1600) * 2 - 1
      const ndcY = 1 - (py / 1000) * 2
      expect(castGaze(targets, gazeDirection(ndcX, ndcY)).hit).not.toBe('open')
    })
  }

  it('the level sightline leaves through GLASS, not through a gap and not through metal', () => {
    expect(castGaze(targets, gazeDirection(0, 0)).hit).toBe('glazing')
  })
})
