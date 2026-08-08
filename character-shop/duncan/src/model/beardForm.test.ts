// character-shop/duncan/src/model/beardForm.test.ts
// PASS 3's beard guards, and they exist because the same note came back twice
// from the scorer: the face reads as a small skin window in one dark mass. Two
// separable causes, measured off built vertices rather than argued:
//
//   1. THE BEARD HAD NO CORNER. Its outer half-width fell from 88.2mm at the
//      gonion to 73.3mm at the chin at a near-constant 0.37mm per mm — five
//      samples, one slope. A constant slope is an arc, and an arc is a bag. A
//      square jaw has a leg, a corner and a second leg, which is three slopes.
//   2. THE BEARD AND THE HAIR WERE THE SAME OBJECT. Beard 84.1mm and fall
//      81.6mm at y = 1.780, beard 83.94 and cap 83.91 at 1.795 — three masses
//      within two millimetres, in one colour, crossing tangentially. Nothing
//      in the frame could say where one ended.
//
// Neither is a taste question and neither needs a critic to notice it, which
// is why both are numbers here now.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createDuncan } from './Duncan'
import { halfWidthInBand, part } from './testSupport'

function freshRoot(): Object3D {
  const figure = createDuncan()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  return root
}

/** Width per unit height between two 4mm bands — the silhouette's own slope. */
function slope(object: Object3D, from: number, to: number): number {
  const lo = halfWidthInBand(object, from - 0.002, from + 0.002)
  const hi = halfWidthInBand(object, to - 0.002, to + 0.002)
  return (hi - lo) / (to - from)
}

describe('beard: a squared jaw, not a bag', () => {
  it('the outer silhouette has a corner — three slopes, not one', () => {
    const beard = part(freshRoot(), 'beard')
    // The chin leg, the vertical run past the jaw's angle, and the gonial
    // rise above it. Measured: 0.620, 0.058, 0.229.
    const leg = slope(beard, 1.6700, 1.6820)
    const run = slope(beard, 1.6860, 1.7020)
    const rise = slope(beard, 1.7020, 1.7160)

    // A leg that climbs a full order faster than the run beside it IS the
    // corner. Pass 2's same three measurements were 0.37, 0.37 and 0.37.
    expect(leg).toBeGreaterThan(0.35)
    expect(run).toBeLessThan(leg / 3)
    // ...and the shoulder above the run turns back out, so the jaw's angle is
    // a corner in both directions rather than the top of a ramp.
    expect(rise).toBeGreaterThan(run + 0.10)
  })

  it('the widest point is the jaw angle, and the chin is well inside it', () => {
    const beard = part(freshRoot(), 'beard')
    const angle = halfWidthInBand(beard, 1.7140, 1.7180)
    const chin = halfWidthInBand(beard, 1.6660, 1.6700)
    expect(angle).toBeGreaterThan(0.084)
    expect(angle).toBeLessThan(0.094)
    // Measured 13.96mm — the jaw's angle stands that much outside the beard
    // at the chin's own corner, which is what a wedge under a beard looks like.
    expect(angle - chin).toBeGreaterThan(0.012)
  })
})

describe('beard and hair: two silhouettes, not one mass', () => {
  it('the fall hangs OUTSIDE the sideburn, so the boundary is a real step', () => {
    const root = freshRoot()
    // Through the sideburn's own band. Measured: fall 88.69, beard 84.00.
    const band = [1.775, 1.800] as const
    const fall = halfWidthInBand(part(root, 'hairFall'), band[0], band[1])
    const beard = halfWidthInBand(part(root, 'beard'), band[0], band[1])
    expect(fall - beard).toBeGreaterThan(0.003)
  })

  it('the combined outline has a WAIST between the jaw and the temple', () => {
    const root = freshRoot()
    const beard = part(root, 'beard')
    const fall = part(root, 'hairFall')
    const widest = (a: number, b: number): number =>
      Math.max(halfWidthInBand(beard, a, b), halfWidthInBand(fall, a, b))
    const jaw = widest(1.7140, 1.7180)
    const waist = widest(1.7400, 1.7480)
    const temple = widest(1.7800, 1.7900)
    // Both lobes stand clear of the pinch between them. Without this the two
    // masses merge into the single outline the scorer kept naming.
    expect(jaw - waist).toBeGreaterThan(0.003)
    expect(temple - waist).toBeGreaterThan(0.003)
  })
})
