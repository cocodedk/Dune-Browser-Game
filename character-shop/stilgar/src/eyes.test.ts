// character-shop/stilgar/src/eyes.test.ts
// R2's correctness gates for the eye masses and the brow hair — placement,
// symmetry, depth under the ridge, and outward winding on the four new
// closed forms.
//
// The winding check is not ceremony. Every material in this shop is
// FrontSide (materials.ts), so a closed surface built inside-out does not
// vanish, it renders as an interior wall — a shape that looks almost right
// from one angle and hollow from another. eyes.ts and brows.ts both mirror a
// surface through X to make the left-hand copy, and mirroring alone flips
// handedness; the u-reversal that undoes it is a one-character mistake away
// from being wrong, so the mesh is measured rather than trusted.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createStilgar } from './model/Stilgar'
import {
  centroid, frontmost, frontmostWhere, headLocalVertices, signedVolume, type P3,
} from './model/faceMetrics'
import { eyeLineLocal } from './model/proportions'
import { EYE_X } from './model/geometry/orbit'

const EY = eyeLineLocal

function head(): { root: Object3D; dispose(): void } {
  const figure = createStilgar()
  return { root: figure.root as unknown as Object3D, dispose: () => figure.dispose() }
}

describe('eyes: placement', () => {
  it('both eye masses sit on the spec eye line, within 3mm', () => {
    const { root, dispose } = head()
    for (const name of ['eyeR', 'eyeL']) {
      const c = centroid(headLocalVertices(root, name))
      expect(Math.abs(c[1] - EY)).toBeLessThan(0.003)
    }
    dispose()
  })

  it('the eyes are the figure\'s own left and right, at the authored spacing', () => {
    const { root, dispose } = head()
    const right = centroid(headLocalVertices(root, 'eyeR'))
    const left = centroid(headLocalVertices(root, 'eyeL'))
    expect(right[0]).toBeGreaterThan(0)
    expect(left[0]).toBeLessThan(0)
    expect(Math.abs(Math.abs(right[0]) - EYE_X)).toBeLessThan(0.002)
    dispose()
  })

  it('interpupillary distance is 0.36-0.50 of facial breadth', () => {
    const { root, dispose } = head()
    const right = centroid(headLocalVertices(root, 'eyeR'))
    const skin = headLocalVertices(root, 'headSculpt')
    let breadth = 0
    for (const p of skin) {
      if (p[1] < EY - 0.020 || p[1] > EY + 0.010) continue
      breadth = Math.max(breadth, Math.abs(p[0]) * 2)
    }
    // Measured 2026-08-05: IPD 0.0644 against breadth 0.1600 = 0.403.
    const ratio = (Math.abs(right[0]) * 2) / breadth
    expect(ratio).toBeGreaterThan(0.36)
    expect(ratio).toBeLessThan(0.50)
    dispose()
  })
})

describe('eyes: symmetry', () => {
  it('the two eye masses mirror EXACTLY — they are built from one surface', () => {
    const { root, dispose } = head()
    const right = headLocalVertices(root, 'eyeR')
    const left = headLocalVertices(root, 'eyeL')
    expect(left.length).toBe(right.length)
    const key = new Set(left.map((p) => `${p[0].toFixed(9)}|${p[1].toFixed(9)}|${p[2].toFixed(9)}`))
    let missing = 0
    for (const p of right) {
      if (!key.has(`${(-p[0]).toFixed(9)}|${p[1].toFixed(9)}|${p[2].toFixed(9)}`)) missing += 1
    }
    expect(missing).toBe(0)
    dispose()
  })

  it('the two brows mirror exactly too', () => {
    const { root, dispose } = head()
    const right = headLocalVertices(root, 'browR')
    const left = headLocalVertices(root, 'browL')
    const key = new Set(left.map((p) => `${p[0].toFixed(9)}|${p[1].toFixed(9)}|${p[2].toFixed(9)}`))
    let missing = 0
    for (const p of right) {
      if (!key.has(`${(-p[0]).toFixed(9)}|${p[1].toFixed(9)}|${p[2].toFixed(9)}`)) missing += 1
    }
    expect(missing).toBe(0)
    dispose()
  })
})

describe('eyes: set deep under the ridge, and wound the right way out', () => {
  it('the brow crest stands 10-30mm forward of the eye apex', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')
    const crest = frontmostWhere(skin, 0.020, 0.032, EY + 0.012, EY + 0.026)
    const apex = frontmost(headLocalVertices(root, 'eyeR'))
    expect(crest).not.toBeNull()
    // Measured 2026-08-05: 0.0219 — the BONY CREST to the corneal apex, not
    // the lid line, which is about 9 mm further forward. Glabella-to-cornea
    // runs roughly 15-25 mm on a heavy brow, so the band is 10-30. Under
    // 10 mm the eye sits on the face rather than in it; over 30 mm the ridge
    // is a helmet.
    const setBack = apex[2] - (crest as P3)[2]
    expect(setBack).toBeGreaterThan(0.010)
    expect(setBack).toBeLessThan(0.030)
    dispose()
  })

  it('the eye masses stand proud of nothing and behind the nose', () => {
    const { root, dispose } = head()
    const nose = frontmost(headLocalVertices(root, 'headSculpt'))
    for (const name of ['eyeR', 'eyeL']) {
      expect(frontmost(headLocalVertices(root, name))[2]).toBeGreaterThan(nose[2] + 0.010)
    }
    dispose()
  })

  it('every new closed form has positive signed volume (outward winding)', () => {
    const { root, dispose } = head()
    for (const name of ['eyeR', 'eyeL', 'browR', 'browL']) {
      expect(signedVolume(root, name)).toBeGreaterThan(0)
    }
    dispose()
  })
})
