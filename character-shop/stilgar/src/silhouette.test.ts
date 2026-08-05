// character-shop/stilgar/src/silhouette.test.ts
// R1 "body and silhouette" correctness gates: shoulder/hip half-width
// within +-10% of spec, bilateral symmetry (armL/armR, legL/legR mirror
// within 5mm in X), and every mesh inside [0, heightM*1.02] in Y. Measured
// off the real geometry, never asserted from spec.ts alone — same
// discipline as seam.test.ts, which this file leaves untouched and keeps
// green (character-shop/docs/gauntlet-loop.md's R1 bar: "Correctness: face
// -Z, symmetry").

import { describe, it, expect } from 'vitest'
import { Box3 } from 'three'
import type { Object3D } from 'three'
import { createStilgar } from './model/Stilgar'
import { PROPORTIONS } from './spec'
import { namedOrThrow as named, directMeshBBox, halfWidthX } from './model/measure'

/** Max mismatch, in metres, between box A and box B's X extent mirrored
 *  across X=0 — 0 for a perfect bilateral mirror. */
function mirrorDeltaX(a: Box3, b: Box3): number {
  return Math.max(Math.abs(b.min.x - -a.max.x), Math.abs(b.max.x - -a.min.x))
}

describe('silhouette: shoulder/hip half-width match spec within 10%', () => {
  it('chest torso mass half-width is within 10% of shoulderHalfWidth', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const width = halfWidthX(directMeshBBox(named(root, 'chest')))
    const spec = PROPORTIONS.shoulderHalfWidth
    expect(width).toBeGreaterThan(spec * 0.9)
    expect(width).toBeLessThan(spec * 1.1)
    figure.dispose()
  })

  it('pelvis torso mass half-width is within 10% of hipHalfWidth', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const width = halfWidthX(directMeshBBox(named(root, 'pelvis')))
    const spec = PROPORTIONS.hipHalfWidth
    expect(width).toBeGreaterThan(spec * 0.9)
    expect(width).toBeLessThan(spec * 1.1)
    figure.dispose()
  })
})

describe('silhouette: bilateral symmetry', () => {
  it('armL and armR mirror within 5mm in X', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const boxL = new Box3().setFromObject(named(root, 'armL'))
    const boxR = new Box3().setFromObject(named(root, 'armR'))
    expect(mirrorDeltaX(boxL, boxR)).toBeLessThan(0.005)
    figure.dispose()
  })

  it('legL and legR mirror within 5mm in X', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const boxL = new Box3().setFromObject(named(root, 'legL'))
    const boxR = new Box3().setFromObject(named(root, 'legR'))
    expect(mirrorDeltaX(boxL, boxR)).toBeLessThan(0.005)
    figure.dispose()
  })
})

describe('silhouette: every mesh stays within the legal Y band', () => {
  it('the whole figure fits inside [0, heightM*1.02] in Y', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-6)
    expect(box.max.y).toBeLessThanOrEqual(PROPORTIONS.heightM * 1.02)
    figure.dispose()
  })
})
