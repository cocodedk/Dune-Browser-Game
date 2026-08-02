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
  it('opaque structure fills most of the top half of the forward frame', () => {
    const c = coverage(sampleFrame(targets, 48, 30, 0, 0))
    // Was 16.3%. The reference (.shots/reference/thopter-03.jpg) is a cave
    // with one glazed aperture, so most of the upper frame has to be brow,
    // roof liner and rails.
    expect(c.structureTopHalf).toBeGreaterThan(0.55)
  })

  it('glazing is a real fraction of the forward frame, not a token pane', () => {
    const c = coverage(sampleFrame(targets, 48, 30, 0, 0))
    expect(c.glazing).toBeGreaterThan(0.06)
  })

  it('turning the head to either side finds cabin, symmetrically', () => {
    const port = coverage(sampleFrame(targets, 32, 20, -60, 0))
    const starboard = coverage(sampleFrame(targets, 32, 20, 60, 0))
    expect(port.structure).toBeGreaterThan(0.75)
    expect(starboard.structure).toBeGreaterThan(0.75)
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
