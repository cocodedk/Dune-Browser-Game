// landscape-shop/cliff/src/bakeSeam.test.ts
// Bake-drift protection. model/massifBake.json is generated offline by
// tools/bakeMassif.mjs from feedstock that is NOT in the repository, so
// nothing in CI can regenerate it. That makes the committed file the only
// copy of the primary massing — and makes a hand-edited, half-regenerated or
// stale bake a silent way to ship a different mountain than the one the round
// was judged on. These guards read the file as data and check it still
// describes the mesh the model actually builds, and still agrees with
// spec.ts.

import { describe, it, expect } from 'vitest'
import type { Object3D, Mesh } from 'three'
import { createCliff } from './model/Cliff'
import { MASSIF_BAKE } from './model/massif'
import { FOOTPRINT } from './spec'
import { triangleCountOf } from './testHelpers'

describe('seam: the committed bake and the built massif are the same object', () => {
  it('the bake is present and self-consistent', () => {
    expect(MASSIF_BAKE.positions.length % 3).toBe(0)
    expect(MASSIF_BAKE.index.length % 3).toBe(0)
    expect(MASSIF_BAKE.vertices).toBe(MASSIF_BAKE.positions.length / 3)
    expect(MASSIF_BAKE.triangles).toBe(MASSIF_BAKE.index.length / 3)
    expect(MASSIF_BAKE.masses).toBeGreaterThanOrEqual(3)
    // Every index must address a real vertex, or toNonIndexed() emits NaN.
    expect(Math.max(...MASSIF_BAKE.index)).toBeLessThan(MASSIF_BAKE.vertices)
  })

  it('the built massif mesh has exactly the bake triangle count', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massif = root.getObjectByName('massif') as Mesh | null
    if (!massif) throw new Error('massif mesh missing')
    expect(triangleCountOf(massif)).toBe(MASSIF_BAKE.triangles)
    set.dispose()
  })

  it('the bake was normalized to the footprint spec.ts still declares', () => {
    // tools/ is plain node and cannot import spec.ts, so the bake carries the
    // targets it was normalized to. This is the check that keeps that copy
    // honest.
    expect(MASSIF_BAKE.footprint.widthM).toBe(FOOTPRINT.widthM)
    expect(MASSIF_BAKE.footprint.heightM).toBe(FOOTPRINT.heightM)
    expect(MASSIF_BAKE.bounds.max[0] - MASSIF_BAKE.bounds.min[0]).toBeCloseTo(FOOTPRINT.widthM, 1)
    expect(MASSIF_BAKE.bounds.max[1]).toBeCloseTo(FOOTPRINT.heightM, 1)
    // The rock stops short of the depth bound on purpose: the procedural gate
    // prow occupies the remainder (model/gateWall.ts).
    expect(MASSIF_BAKE.footprint.frontZ).toBeGreaterThan(-FOOTPRINT.depthM)
  })

  it('the bake carries the fields the procedural parts are derived from', () => {
    expect(MASSIF_BAKE.outline.xs.length).toBe(MASSIF_BAKE.outline.zs.length)
    expect(MASSIF_BAKE.outline.xs.length).toBeGreaterThan(20)
    expect(MASSIF_BAKE.gateField.z.length).toBe(MASSIF_BAKE.gateField.nx * MASSIF_BAKE.gateField.ny)
  })
})

// R1.4 findings. The critic read the R1.3 formation as "a row of
// similarly-sized boxy chunks with the same horizontal shelf-terrace rhythm
// repeated across every tower", and the prow-to-rock join as "a mesh seam
// where two different rock kits meet". Both are properties of the
// COMPOSITION, so both are guarded off the composition the bake measured.
describe('seam: the formation has one hero mass and no repeated rhythm', () => {
  const primaries = (): typeof MASSIF_BAKE.hierarchy => MASSIF_BAKE.hierarchy.slice(0, 8)
  const heightOf = (mass: { min: number[]; max: number[] }): number => mass.max[1] - mass.min[1]

  it('one mass dominates: at least twice the solid volume of any other', () => {
    const [hero, second] = MASSIF_BAKE.hierarchy
    expect(hero.volumeM3 / second.volumeM3).toBeGreaterThanOrEqual(2)
    // And it is the mass the gate is cut into, not some flanker: it spans
    // x = 0 and reaches the formation's own frontmost plane.
    expect(hero.min[0]).toBeLessThan(0)
    expect(hero.max[0]).toBeGreaterThan(0)
    expect(hero.min[2]).toBeCloseTo(MASSIF_BAKE.bounds.min[2], 1)
    // It owns the crest too.
    expect(hero.max[1]).toBeCloseTo(FOOTPRINT.heightM, 0)
  })

  it('no two masses band alike: the primaries step down by 8% or more', () => {
    // One feedstock form is scaled into every mass, so a mass's own y-scale
    // IS its course spacing. Distinct heights therefore mean no two towers
    // can show the same shelf rhythm at the same height.
    const heights = primaries().map(heightOf).sort((a, b) => b - a)
    expect(heights.length).toBe(8)
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i] / heights[i - 1]).toBeLessThanOrEqual(0.92)
    }
  })

  it('the prow-to-rock joint carries intermediate-scale rock', () => {
    // The prow's rim sinks into the baked rock at roughly |x| = 90. Nothing
    // used to live there between a 200 m smooth panel and a 40 m plate, and
    // the join read as two kits meeting. tools/bake/scatter.mjs seats wedges
    // across it; this is the count that keeps them there.
    const inBand = MASSIF_BAKE.hierarchy.filter((mass) => {
      const height = heightOf(mass)
      if (height < 15 || height > 70) return false
      return overlaps(mass.min[0], mass.max[0], 60, 145)
        || overlaps(mass.min[0], mass.max[0], -145, -60)
    })
    expect(inBand.length).toBeGreaterThanOrEqual(6)
  })
})

function overlaps(lowA: number, highA: number, lowB: number, highB: number): boolean {
  return Math.max(lowA, lowB) <= Math.min(highA, highB)
}

// R1.5 finding: the hero's own volume ratio was already >2 (bakeSeam's
// "one mass dominates" above), but the approach rig read the formation as
// "two separate masses side by side... joined by a low gap" anyway — a
// SADDLE between the hero and the next mass over sank low enough that its
// gap showed open sky down to the horizon. Volume and per-mass height don't
// catch that; only the crest LINE does.
describe('seam: the formation reads as one silhouette, no saddle drops to open sky', () => {
  // The formation's CORE, not its full width: westSpur and eastTail
  // (tools/bake/instances.mjs) are authored as receding tails that taper
  // into sand on purpose, so a real dip out there is not the "two objects"
  // failure this guards — BAND stops short of both, fixed rather than
  // derived off the current composition, so it can't silently widen or
  // narrow if a future round moves a mass's own bounds.
  const BAND_MIN_X = -190
  const BAND_MAX_X = 260
  const BIN_M = 5
  // How far a flanking peak may sit from a candidate saddle and still count
  // as what it is a saddle BETWEEN — roughly one mass's own footprint, not
  // "the tallest thing anywhere in the formation".
  const WINDOW_M = 60

  it('no saddle drops below 35% of its lower flanking peak', () => {
    const crest = crestByColumn(MASSIF_BAKE.positions, BAND_MIN_X, BAND_MAX_X, BIN_M)
    const worst = worstSaddleRatio(crest, WINDOW_M / BIN_M)
    // R1.4 state (pre-fix) measured 27.6% here, the hero/westBastion saddle
    // reading as sky. R1.5's westBastion reshape (instances.mjs) measures
    // 56.5%; 35% leaves real margin on both sides of that swing.
    expect(worst).toBeGreaterThanOrEqual(0.35)
  })
})

/** Max world Y per BIN_M-wide column of x, off the raw bake positions —
 *  the same "real built geometry" rule as every other massing guard. */
function crestByColumn(positions: number[], minX: number, maxX: number, binM: number): number[] {
  const bins = new Map<number, number>()
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    if (x < minX || x > maxX) continue
    const bin = Math.floor(x / binM)
    bins.set(bin, Math.max(bins.get(bin) ?? -Infinity, positions[i + 1]))
  }
  const keys = Array.from(bins.keys()).sort((a, b) => a - b)
  return keys.map((key) => bins.get(key) as number)
}

/** The worst (lowest) ratio of a local minimum's crest to the SMALLER of its
 *  two flanking peaks, each searched within +-windowBins — local on
 *  purpose, so a moderate dip near the hero's own peak isn't compared
 *  against a summit 150 m away it was never reading as one mass with. */
function worstSaddleRatio(crest: number[], windowBins: number): number {
  let worst = Infinity
  for (let i = 0; i < crest.length; i++) {
    let leftPeak = -Infinity
    for (let j = Math.max(0, i - windowBins); j < i; j++) leftPeak = Math.max(leftPeak, crest[j])
    let rightPeak = -Infinity
    for (let j = i + 1; j <= Math.min(crest.length - 1, i + windowBins); j++) rightPeak = Math.max(rightPeak, crest[j])
    if (leftPeak === -Infinity || rightPeak === -Infinity) continue
    const lowerFlank = Math.min(leftPeak, rightPeak)
    if (crest[i] >= lowerFlank) continue
    worst = Math.min(worst, crest[i] / lowerFlank)
  }
  return worst
}
