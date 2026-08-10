// character-shop/duncan/src/model/proportions.test.ts
// R1 additions to the gauntlet contract's correctness bar
// (character-shop/docs/gauntlet-loop.md): shoulder/hip half-widths within
// +/-10% of spec, head height inside spec's own band, bilateral symmetry
// within 5mm, and the whole figure staying inside its Y envelope.
// seam.test.ts (lead-owned) keeps guarding height/eye-line/face-forward/
// dispose; this file only adds to that, never replaces it.
//
// Pass 4 (progress.md) re-anchored the two width measurements without
// touching what they assert. They used to read the bounding box of a mesh
// called 'chestMass' and one called 'pelvisMass'; the figure is now one
// continuous torso surface from crotch to collar, so a bounding box would
// answer "widest point anywhere" instead of "width at the shoulder line".
// Both now measure vertices inside an anatomical HEIGHT BAND
// (bodyPlan.ts MEASURE) — the deltoid band for the shoulder, since a
// shoulder is measured across the deltoids, and the trochanter band on the
// torso alone for the hip, since the thighs must not be allowed to flatter
// it. Same spec numbers, same tolerance, honest anchor.
//
// Every test calls root.updateMatrixWorld(true) BEFORE measuring a nested
// part directly — bounds() only refreshes the subtree it is handed
// (testSupport.ts).

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createDuncan } from './Duncan'
import { PROPORTIONS } from '../spec'
import { MEASURE } from './bodyPlan'
import { bounds, halfWidthInBand, part } from './testSupport'

function freshRoot(): Object3D {
  const figure = createDuncan()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  return root
}

describe('proportions: shoulder and hip half-widths hold to spec within 10%', () => {
  it('the deltoid band is within 10% of PROPORTIONS.shoulderHalfWidth', () => {
    const root = freshRoot()
    const [low, high] = MEASURE.shoulderBand
    const halfWidth = halfWidthInBand(root, low, high)
    const spec = PROPORTIONS.shoulderHalfWidth
    expect(halfWidth).toBeGreaterThan(spec * 0.9)
    expect(halfWidth).toBeLessThan(spec * 1.1)
  })

  it('the torso at the hip band is within 10% of PROPORTIONS.hipHalfWidth', () => {
    const root = freshRoot()
    const [low, high] = MEASURE.hipBand
    const halfWidth = halfWidthInBand(part(root, 'torsoMass'), low, high)
    const spec = PROPORTIONS.hipHalfWidth
    expect(halfWidth).toBeGreaterThan(spec * 0.9)
    expect(halfWidth).toBeLessThan(spec * 1.1)
  })
})

describe('proportions: bilateral symmetry within 5mm in X', () => {
  it('armL and armR bounding boxes mirror across the centreline', () => {
    const root = freshRoot()
    const left = bounds(part(root, 'armL'))
    const right = bounds(part(root, 'armR'))
    expect(Math.abs(left.min.x + right.max.x)).toBeLessThan(0.005)
    expect(Math.abs(left.max.x + right.min.x)).toBeLessThan(0.005)
  })

  it('legL and legR bounding boxes mirror across the centreline', () => {
    const root = freshRoot()
    const left = bounds(part(root, 'legL'))
    const right = bounds(part(root, 'legR'))
    expect(Math.abs(left.min.x + right.max.x)).toBeLessThan(0.005)
    expect(Math.abs(left.max.x + right.min.x)).toBeLessThan(0.005)
  })
})

describe('proportions: the figure fills its Y envelope with a head to spec', () => {
  it('nothing sits below the ground, and the skull is spec head-height', () => {
    const root = freshRoot()
    const box = bounds(root)
    expect(box.min.y).toBeGreaterThanOrEqual(-0.001)
    expect(box.max.y).toBeLessThanOrEqual(PROPORTIONS.heightM * 1.02)
    // Crown to chin, measured off the skull mesh alone — hair sits above the
    // crown and must not be counted as skull. The old figure measured 0.086
    // of stature here (11.6 head-units) and no test caught it.
    const skull = bounds(part(root, 'skull')).size.y
    const { min, max } = PROPORTIONS.headHeightFraction
    expect(skull / PROPORTIONS.heightM).toBeGreaterThanOrEqual(min)
    expect(skull / PROPORTIONS.heightM).toBeLessThanOrEqual(max)
  })
})

describe('proportions: dispose releases every part this round added', () => {
  it('does not throw and clears the armature tree', () => {
    const figure = createDuncan()
    const root = figure.root as unknown as Object3D
    expect(() => figure.dispose()).not.toThrow()
    expect(root.children.length).toBe(0)
  })
})
