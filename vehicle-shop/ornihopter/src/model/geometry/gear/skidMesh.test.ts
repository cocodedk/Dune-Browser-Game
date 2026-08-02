// vehicle-shop/ornihopter/src/model/geometry/gear/skidMesh.test.ts
// The foot is a skid bar with a hole in it, lying fore and aft.
//
// docs/profiles/kit-dossier.md §a measured the kit's foot as "a hollow
// elongated rectangular loop, i.e. a flat bar lying along the ground... a
// horizontal skid bar, not a wheel or a point", and the assembled photograph
// (docs/dune_ornihopter_kit-2.png) adds the upturned toe. What shipped through
// round 6c was a solid spade pointing wherever the tibia happened to reach.
//
// Every case here is measured off the built buffer, and every one of them was
// run RED against that spade first; the numbers are recorded in each case.

import { describe, it, expect } from 'vitest'
import { GEAR_LEGS, GROUND_Y } from './stance'
import { SKID, SKID_LENGTH } from './skid'
import { coversInPlan, readGearMesh, trianglesUnder, verticesOf } from './meshProbe'

const mesh = readGearMesh()
/** Everything that is foot: the toe blade tops out 0.52m over the plane, the
 *  tibia's side faces reach the knee and drop out. */
const CEILING = GROUND_Y + 0.6
const STEP = 0.01

interface Foot {
  readonly triangles: number[][]
  readonly points: [number, number, number][]
  readonly minZ: number
  readonly maxZ: number
  readonly minX: number
  readonly maxX: number
}

function footOf(leg: number): Foot {
  const triangles = trianglesUnder(mesh, leg, CEILING)
  const points = verticesOf(mesh, triangles)
  const zs = points.map((p) => p[2])
  const xs = points.map((p) => p[0])
  return {
    triangles,
    points,
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
  }
}

const FEET = GEAR_LEGS.map((_, i) => footOf(i))

describe('the foot is a fore-and-aft skid, not a spade', () => {
  it('lies along the craft axis on every leg', () => {
    // FAIL-FIRST, round-6c gear: the pad followed the tibia's horizontal reach,
    // which for the middle pair is very nearly straight outboard. Measured
    // z/x extents were 0.51/0.71, 0.28/0.83 and 0.42/0.78 — the foot was WIDER
    // than it was long on all three stations, the middle one by 3:1 the wrong
    // way. The craft was standing on six paddles set across its own direction
    // of travel.
    for (let i = 0; i < FEET.length; i++) {
      const foot = FEET[i]
      const alongZ = foot.maxZ - foot.minZ
      const acrossX = foot.maxX - foot.minX
      expect(alongZ).toBeGreaterThan(2 * acrossX)
      // Not toBeCloseTo(SKID_LENGTH): the toe blade rises at 42 degrees, so
      // its own 0.11m thickness leans 0.035m past the nominal tip. Bounded
      // instead of pinned, and the bound is what the blade can actually add.
      expect(alongZ).toBeGreaterThanOrEqual(SKID_LENGTH)
      expect(alongZ).toBeLessThan(SKID_LENGTH + 0.08)
      const toeReach = GEAR_LEGS[i].foot.z - foot.minZ
      expect(toeReach).toBeGreaterThanOrEqual(SKID.toeAhead)
      expect(toeReach).toBeLessThan(SKID.toeAhead + 0.08)
    }
  })

  it('runs a genuine slot through the middle of the bar', () => {
    // FAIL-FIRST, round-6c gear: the pad is solid, so along the line x = foot.x
    // there was no open span with material on BOTH sides of it — the longest
    // bounded run measured 0.000m against the 0.30m asked for here. Anything
    // less than "bounded" would also pass for simply walking off the end of a
    // solid foot, which is why the run has to be fenced.
    for (let i = 0; i < FEET.length; i++) {
      const foot = FEET[i]
      const x = GEAR_LEGS[i].foot.x
      const samples: boolean[] = []
      for (let z = foot.minZ; z <= foot.maxZ; z += STEP) {
        samples.push(foot.triangles.some((tri) => coversInPlan(mesh, tri, x, z)))
      }
      const firstSolid = samples.indexOf(true)
      const lastSolid = samples.lastIndexOf(true)
      let longest = 0
      let run = 0
      for (let k = firstSolid; k <= lastSolid; k++) {
        run = samples[k] ? 0 : run + 1
        longest = Math.max(longest, run)
      }
      expect(longest * STEP).toBeGreaterThan(0.3)
    }
  })
})

describe('the skid stands on a flat sole and kicks its toe up', () => {
  it('keeps the sole flat over most of the bar', () => {
    for (let i = 0; i < FEET.length; i++) {
      const onPlane = FEET[i].points.filter(([, y]) => y <= GROUND_Y + 1e-3)
      expect(onPlane.length).toBeGreaterThan(0)
      const zs = onPlane.map((p) => p[2])
      const span = Math.max(...zs) - Math.min(...zs)
      expect(span / (FEET[i].maxZ - FEET[i].minZ)).toBeGreaterThan(0.55)
    }
  })

  it('lifts the forward fifth of the bar clear of the ground', () => {
    // FAIL-FIRST, round-6c gear: the spade's sole lay ON the plane right out to
    // its forward tip, so the lowest point of its forward fifth measured
    // exactly GROUND_Y, 0.000m of lift against the 0.15m asked for. A skid that
    // does not turn its toe up ploughs into the first dune it lands on.
    for (const foot of FEET) {
      const cut = foot.minZ + (foot.maxZ - foot.minZ) * 0.2
      const forward = foot.points.filter(([, , z]) => z <= cut)
      expect(forward.length).toBeGreaterThan(0)
      expect(Math.min(...forward.map(([, y]) => y))).toBeGreaterThan(GROUND_Y + 0.15)
    }
  })

  it('lands every sole on the SAME plane, all six legs', () => {
    // The stance's one-plane promise, re-asked of the mesh rather than of
    // stance.ts's own numbers, now that four separate parts make up a foot.
    const soles = FEET.flatMap((foot) => foot.points.filter(([, y]) => y <= GROUND_Y + 0.01))
    const ys = soles.map(([, y]) => y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1e-3)
    expect(Math.min(...ys)).toBeCloseTo(GROUND_Y, 6)
  })
})
