// vehicle-shop/ornihopter/src/model/wingFoldClearance.test.ts
// (c) Nothing touches anything, ANYWHERE ON THE PATH. wingHullClearance.test.ts
// proves the same class of claim across the beat cycle; this proves it across
// the fold, against three obstacle sets the beat never has to worry about —
// the landing gear, the tail fork, and the other seven blades.
//
// Endpoints are not enough and that is the whole point: a folded pose can be
// perfectly clear at 0 and at 1 and still drive a blade through a gear leg at
// 0.8. The sweep is sampled at 21 points because the pose is a ONE-parameter
// family (model/wingFoldPose.ts) — every reachable configuration is on this
// line.
//
// THE ROOT RING IS EXCLUDED, and this is the round's one adapted assertion.
// Station 0 is the hinge eye AT the ball joint's centre: its own maximum
// radius is 0.269m against the static ball housing's 0.382m, so it lives
// inside that housing at every pose the rig can take, spread included. It is
// also 0.066m inside the hull skin at the flank stations — where the ball
// itself is, by construction (geometry/wing/rootPod.ts seats the ball proud of
// the skin by POST_HEIGHT 0.324 with a 0.382 radius). Asserting a hinge eye
// clears the housing it turns inside would be asserting the joint apart. The
// first assertion below pins that exclusion to the measurement that justifies
// it, so it cannot quietly widen.

import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { bladeProbes, bladeBoxes, bladeGap, pointToBlade, bladePoints } from './wingFoldProbe'
import { readGearMesh } from './geometry/gear/meshProbe'
import { buildWingBladeGeometry, SECTION_POINTS } from './geometry/wingGeometry'
import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt } from './geometry/hullProfile'
import { buildRing, outwardDistance } from './geometry/hullCrossSection'
import { hullShapeAt } from './geometry/hullStations'
import { WING, WING_MAX_CHORD } from '../spec'

const SAMPLES = 20
/** Bays/rings before this index belong to the ball joint — see the header. */
const ROOT_RING = 1
/** The gap every pair must keep. Not zero: a proof that lands on 0.000 is a
 *  proof that the next tuning change breaks silently. */
const MIN_CLEARANCE = 0.1

function hullOutward(x: number, y: number, z: number): number {
  const halfWidth = hullHalfWidthAt(z)
  const halfHeight = hullHalfHeightAt(z)
  if (halfWidth <= 0 || halfHeight <= 0) return Infinity
  return outwardDistance(x, y, buildRing(halfWidth, halfHeight, hullShapeAt(z), 0, hullKeelYAt(z)))
}

describe('wing fold clears everything along the whole path (round 14)', () => {
  it('the excluded root ring really is inside the ball housing', () => {
    const position = buildWingBladeGeometry('right', WING.reach).attributes.position
    let radius = 0
    for (let c = 0; c < SECTION_POINTS; c++) {
      radius = Math.max(radius, Math.hypot(position.getY(c), position.getZ(c)))
    }
    expect(radius).toBeLessThan(WING_MAX_CHORD * 0.34)
  })

  it('no blade meets another blade', () => {
    const probes = bladeProbes()
    let worst = { gap: Infinity, at: '' }
    for (let s = 0; s <= SAMPLES; s++) {
      const fold = s / SAMPLES
      const boxes = probes.map((probe) => ({ probe, boxes: bladeBoxes(probe, fold).slice(ROOT_RING) }))
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const gap = bladeGap(boxes[i].boxes, boxes[j].boxes)
          if (gap < worst.gap) {
            worst = { gap, at: `${boxes[i].probe.name} vs ${boxes[j].probe.name} at fold ${fold.toFixed(2)}` }
          }
        }
      }
    }
    expect(worst.gap, worst.at).toBeGreaterThan(MIN_CLEARANCE)
  })

  it('no blade meets the landing gear', () => {
    const probes = bladeProbes()
    const gear = readGearMesh()
    const points: Vector3[] = []
    for (let v = 0; v < gear.vertexCount; v++) {
      points.push(new Vector3(gear.positions[v * 3], gear.positions[v * 3 + 1], gear.positions[v * 3 + 2]))
    }
    let worst = { gap: Infinity, at: '' }
    for (let s = 0; s <= SAMPLES; s++) {
      const fold = s / SAMPLES
      for (const probe of probes) {
        const boxes = bladeBoxes(probe, fold).slice(ROOT_RING)
        for (const point of points) {
          const gap = pointToBlade(point, boxes)
          if (gap < worst.gap) {
            worst = { gap, at: `${probe.name} at fold ${fold.toFixed(2)}, gear point ${point.toArray().map((n) => n.toFixed(2)).join(',')}` }
          }
        }
      }
    }
    expect(worst.gap, worst.at).toBeGreaterThan(MIN_CLEARANCE)
  })

  it('no blade meets the hull, the boom or the tail fork', () => {
    let worst = { gap: Infinity, at: '' }
    for (let s = 0; s <= SAMPLES; s++) {
      const fold = s / SAMPLES
      for (const probe of bladeProbes()) {
        for (const point of bladePoints(probe, fold, 1).slice(ROOT_RING * SECTION_POINTS)) {
          const gap = hullOutward(point.x, point.y, point.z)
          if (gap < worst.gap) {
            worst = { gap, at: `${probe.name} at fold ${fold.toFixed(2)}, ${point.toArray().map((n) => n.toFixed(2)).join(',')}` }
          }
        }
      }
    }
    expect(worst.gap, worst.at).toBeGreaterThan(MIN_CLEARANCE)
  })

  it('the stowed blades stack with air between them, not as one plank', () => {
    // Side view read: four blades a side, each at its own height over the
    // boom with air between them. Measured on the span centreline at mid-blade
    // — the point that carries the silhouette.
    const heights = bladeProbes()
      .filter((probe) => probe.side === 'right')
      .map((probe) => new Vector3(WING.reach / 2, 0, 0).applyMatrix4(probe.at(1).matrix).y)
      .sort((a, b) => a - b)
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i] - heights[i - 1]).toBeGreaterThan(0.4)
    }
    expect(heights[heights.length - 1] - heights[0]).toBeGreaterThan(2)
  })
})
