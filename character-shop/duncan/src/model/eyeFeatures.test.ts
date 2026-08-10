// character-shop/duncan/src/model/eyeFeatures.test.ts
// The orbit's guards: the globes, the lids pass 2 added, and the one
// measurement that says whether there is an EYE there or only a hole. Split
// out of headFeatures.test.ts when the lid guards took that file to the
// 200-line limit; nothing here changed meaning in the move.
//
// The last test is the important one and it is deliberately not a bounding
// box. Pass 1's aperture measured 28 x 10mm — correct against a man's ~30 x
// 11 — and still rendered as two dead slots, because a box cannot answer the
// question the camera asks: at this height, once the skin and both lids have
// had their say, is the EYEBALL the thing facing me? That is what `open`
// counts, millimetre by millimetre down the pupil, on built vertices.
//
// It counts on the -X side because testSupport.ts's part() returns the first
// match and the head builds side -1 first — so globe, upper lid and lower lid
// are all the same eye. The mirror guard above proves the other one matches.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import { createDuncan } from './Duncan'
import { PROPORTIONS } from '../spec'
import { named, part } from './testSupport'
import { frontZ } from './faceMeasure'

function freshRoot(): Object3D {
  const figure = createDuncan()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  return root
}

const EYE_LINE = PROPORTIONS.eyeLineFraction * PROPORTIONS.heightM

function mirrors(root: Object3D, name: string): void {
  const centres = named(root, name)
    .map((mesh) => new Box3().setFromObject(mesh).getCenter(new Vector3()))
  expect(centres.length).toBe(2)
  expect(Math.abs(centres[0].x + centres[1].x)).toBeLessThan(0.0005)
  expect(Math.abs(centres[0].y - centres[1].y)).toBeLessThan(0.0005)
  expect(Math.abs(centres[0].z - centres[1].z)).toBeLessThan(0.0005)
}

describe('eyes: placed on the spec eye line, mirrored, and deep-set', () => {
  it('two eye masses mirror across the centreline within half a millimetre', () => {
    mirrors(freshRoot(), 'eyeMass')
  })

  it('the pupils sit on spec eye line at a human interpupillary distance', () => {
    const root = freshRoot()
    const centres = named(root, 'eyeMass')
      .map((eye) => new Box3().setFromObject(eye).getCenter(new Vector3()))
    for (const centre of centres) expect(Math.abs(centre.y - EYE_LINE)).toBeLessThan(0.003)
    const ipd = Math.abs(centres[0].x - centres[1].x)
    expect(ipd).toBeGreaterThan(0.055)
    expect(ipd).toBeLessThan(0.072)
  })

  it('the globes sit well behind the brow — deep-set, not bulging', () => {
    const root = freshRoot()
    const eyeFront = Math.min(...named(root, 'eyeMass')
      .map((eye) => new Box3().setFromObject(eye).min.z))
    const brow = frontZ(part(root, 'skull'), {
      yMin: 1.822, yMax: 1.834, xMin: 0.020, xMax: 0.048,
    })
    expect(eyeFront).toBeGreaterThan(brow + 0.010)
  })
})

describe('lids: real geometry, framing an aperture that is not a slit', () => {
  it('four lids, two a side, mirrored across the centreline', () => {
    const root = freshRoot()
    mirrors(root, 'lidUpper')
    mirrors(root, 'lidLower')
  })

  it('the upper lid overhangs the globe, and the pair straddle the eye line', () => {
    const root = freshRoot()
    const globe = new Box3().setFromObject(part(root, 'eyeMass'))
    const upper = new Box3().setFromObject(part(root, 'lidUpper'))
    const lower = new Box3().setFromObject(part(root, 'lidLower'))
    // The overhang is the whole point: a lid level with the ball casts no
    // shadow line, and the shadow line is what reads as a hooded eye.
    expect(upper.min.z).toBeLessThan(globe.min.z)
    expect(upper.getCenter(new Vector3()).y).toBeGreaterThan(EYE_LINE)
    expect(lower.getCenter(new Vector3()).y).toBeLessThan(EYE_LINE)
  })

  it('the globe is the frontmost thing over a real band of the eye', () => {
    const root = freshRoot()
    const globe = part(root, 'eyeMass')
    const covers = ['skull', 'lidUpper', 'lidLower'].map((name) => part(root, name))
    const column = { xMin: -0.038, xMax: -0.028 }
    let open = 0
    for (let y = 1.796; y <= 1.8201; y += 0.001) {
      const band = { yMin: y - 0.0005, yMax: y + 0.0005, ...column }
      const eye = frontZ(globe, band)
      if (!Number.isFinite(eye)) continue
      if (eye < Math.min(...covers.map((cover) => frontZ(cover, band)))) open++
    }
    expect(open).toBeGreaterThanOrEqual(7)
  })
})
