// character-shop/stilgar/src/face.test.ts
// R2's correctness gates for the head: facial thirds, facial breadth, the
// brow's actual relief, and the nose's frontmost margin. Every number is
// read off the BUILT MESH through model/faceMetrics.ts — never asserted from
// a table in geometry/.
//
// That distinction is the reason this file exists. R1 reported a brow that
// measured 12.2 mm and rendered as a smudge, and a beard that cleared the
// nose while actually reaching 1.6 mm past it; both numbers came from the
// authored profile rather than from the vertices it produced. A guard on an
// intention guards nothing.
//
// Bands are HUMAN bands, deliberately wider than the current sculpt: they
// exist to catch a later round breaking the face, not to pin these exact
// values. The measured value at the time of writing is given beside each.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createStilgar } from './model/Stilgar'
import { PROPORTIONS } from './spec'
import {
  breadthInBand, centroid, frontmost, frontmostWhere, headLocalVertices, maxY, mentonY,
  midlineNotch, minYNearMidline, type P3,
} from './model/faceMetrics'
import { eyeLineLocal } from './model/proportions'

const EY = eyeLineLocal

function head(): { root: Object3D; dispose(): void } {
  const figure = createStilgar()
  return { root: figure.root as unknown as Object3D, dispose: () => figure.dispose() }
}

describe('face: the thirds sit in human proportion', () => {
  it('middle third (brow to subnasale) and lower third (subnasale to menton) are within 22% of each other', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')

    // Browline: the brow HAIR's own centroid, not the bony crest above it.
    // Artists' thirds are measured at the eyebrow, and the crest of a heavy
    // ridge sits 5 mm higher than the hair that grows on its lower slope.
    const brow = centroid(headLocalVertices(root, 'browR'))[1]
    // Subnasale: the least-forward midline vertex under the nose.
    const sub = midlineNotch(skin, 0.005, EY - 0.050, EY - 0.030)
    expect(sub).not.toBeNull()
    const menton = mentonY(skin)

    const middle = brow - (sub as P3)[1]
    const lower = (sub as P3)[1] - menton
    expect(middle).toBeGreaterThan(0)
    expect(lower).toBeGreaterThan(0)
    // Measured 2026-08-05: browline 0.14080, subnasale 0.08078, menton
    // 0.02746 -> middle 0.0600, lower 0.0533, ratio 1.126. Adult middle-to-
    // lower runs about 0.85 to 1.20; a slightly short lower third is normal
    // and is buried in beard here anyway.
    const ratio = middle / lower
    expect(ratio).toBeGreaterThan(0.82)
    expect(ratio).toBeLessThan(1.28)
    dispose()
  })

  it('the eye line halves the visible head mass, within 12% of its height', () => {
    const { root, dispose } = head()
    const hood = headLocalVertices(root, 'hood')
    const beard = headLocalVertices(root, 'beard')
    const top = maxY(hood)
    const bottom = minYNearMidline(beard, 0.010)
    const mass = top - bottom
    // EY should land near the middle of what a viewer actually sees.
    expect(Math.abs(EY - (top + bottom) / 2) / mass).toBeLessThan(0.12)
    dispose()
  })
})

describe('face: breadth against the head a viewer actually sees', () => {
  it('facial breadth at the eye line is 0.58-0.74 of the visible head height', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')
    const hood = headLocalVertices(root, 'hood')
    const beard = headLocalVertices(root, 'beard')
    // Visible head mass is the settled R1 definition: hood peak to the
    // beard's front-centre bottom, NOT the beard's bounding box, which
    // includes an inner shell nobody can see (see progress.md).
    const mass = maxY(hood) - minYNearMidline(beard, 0.010)
    const breadth = breadthInBand(skin, EY - 0.020, EY + 0.010)
    // Measured 2026-08-05: breadth 0.1600, mass 0.2469, ratio 0.648.
    // Human bizygomatic-to-head-height runs ~0.58 (narrow) to ~0.72 (broad);
    // this face is meant to sit at the broad end and does.
    const ratio = breadth / mass
    expect(ratio).toBeGreaterThan(0.58)
    expect(ratio).toBeLessThan(0.74)
    dispose()
  })

  it('every face form is bilaterally symmetric to within a micron', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')
    // Mirror each vertex and require a partner. The loft samples u
    // symmetrically, so a vertex without a mirror means some field lost its
    // |x| — the classic way a sculpted face ends up subtly lopsided.
    //
    // Quantised with Math.round, not toFixed: the ring at the BACK of the
    // skull lands on sin(PI) = 1.22e-16 rather than on zero, and toFixed
    // renders that as "-0.000000" on one side and "0.000000" on the other,
    // so 66 perfectly symmetric vertices reported as asymmetric. `|| 0`
    // folds negative zero onto zero.
    const key = (p: P3, flip: number): string =>
      [p[0] * flip, p[1], p[2]].map((v) => Math.round(v * 1e6) || 0).join('|')
    const present = new Set(skin.map((p) => key(p, 1)))
    let missing = 0
    for (const p of skin) if (!present.has(key(p, -1))) missing += 1
    expect(missing).toBe(0)
    dispose()
  })
})

describe('face: the nose is the frontmost thing on the figure', () => {
  it('the nose tip leads the beard, the hood and the brow by at least 5mm', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')
    const nose = frontmost(skin)
    const beard = frontmost(headLocalVertices(root, 'beard'))
    const hood = frontmost(headLocalVertices(root, 'hood'))
    const brow = frontmost(headLocalVertices(root, 'browR'))
    // R1's near-miss: at a 40 mm beard the chin mass sat 1.6 mm FORWARD of
    // the nose, inverting the face's own depth order.
    expect(nose[2]).toBeLessThan(beard[2] - 0.005)
    expect(nose[2]).toBeLessThan(hood[2] - 0.005)
    expect(nose[2]).toBeLessThan(brow[2] - 0.005)
    // And it is a NOSE tip: on the midline, below the eye line.
    expect(Math.abs(nose[0])).toBeLessThan(0.006)
    expect(nose[1]).toBeLessThan(EY)
    expect(nose[1]).toBeGreaterThan(EY - 0.040)
    dispose()
  })

  it('the brow bar stands at least 12mm proud of the open forehead above it', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')
    const crest = frontmostWhere(skin, 0.020, 0.032, EY + 0.012, EY + 0.026)
    // R2 pass 3 MOVED THIS WINDOW, and the reason is a shape change rather
    // than a failing number talked into passing. Pass 2 had one form above the
    // eye, so EY+40..52 sampled open forehead. Pass 3 puts a second one there
    // — the frontal shelf that overhangs the new sulcus and gives the bar its
    // top edge — and that shelf crests at EY+42.8 with 14.2 mm of projection,
    // so the old window measured the shelf against the crest and returned
    // 11.4 mm. "The forehead above it" now has to mean above BOTH forms.
    // The relief the old window used to cover is not lost: the sulcus
    // assertion below guards it directly, and more tightly than this ever did.
    const forehead = frontmostWhere(skin, 0.020, 0.032, EY + 0.056, EY + 0.068)
    expect(crest).not.toBeNull()
    expect(forehead).not.toBeNull()
    // Measured 2026-08-05 (pass 3): 0.0270. R1 shipped 12.2 mm and it rendered
    // as a smudge, so 12 mm is the floor, not the target.
    const relief = (forehead as P3)[2] - (crest as P3)[2]
    expect(relief).toBeGreaterThan(0.012)
    dispose()
  })

  it('a sulcus separates the brow bar from the forehead base above it', () => {
    const { root, dispose } = head()
    const skin = headLocalVertices(root, 'headSculpt')
    // The form that makes a brow read as a BAR rather than as the bottom of a
    // forehead: bone, groove, bone. Without the groove the two masses average
    // into one lit plane, which is exactly what pass 2's render did — N.L ran
    // 0.87 to 0.98 unbroken from the crest to the hood.
    const crest = frontmostWhere(skin, 0.020, 0.032, EY + 0.012, EY + 0.026)
    const shelf = frontmostWhere(skin, 0.020, 0.032, EY + 0.038, EY + 0.046)
    expect(crest).not.toBeNull()
    expect(shelf).not.toBeNull()
    // The sulcus floor is the LEAST forward point between them.
    let floor: P3 | null = null
    for (const p of skin) {
      const ax = Math.abs(p[0])
      if (ax < 0.020 || ax > 0.032 || p[1] < EY + 0.028 || p[1] > EY + 0.034) continue
      if (p[2] > 0) continue
      if (!floor || p[2] > floor[2]) floor = p
    }
    expect(floor).not.toBeNull()
    // Measured 2026-08-05: sulcus 0.0221 behind the crest and 0.0082 behind
    // the shelf. Both floors are deliberately well under the measured values —
    // they exist to catch a later round flattening either side of the groove.
    expect((floor as P3)[2] - (crest as P3)[2]).toBeGreaterThan(0.010)
    expect((floor as P3)[2] - (shelf as P3)[2]).toBeGreaterThan(0.002)
    dispose()
  })
})

describe('face: the figure still stands to spec', () => {
  it('the visible head mass is inside the spec band as a fraction of height', () => {
    const { root, dispose } = head()
    const hood = headLocalVertices(root, 'hood')
    const beard = headLocalVertices(root, 'beard')
    const fraction = (maxY(hood) - minYNearMidline(beard, 0.010)) / PROPORTIONS.heightM
    // Measured 2026-08-05: 0.1364.
    expect(fraction).toBeGreaterThanOrEqual(PROPORTIONS.headHeightFraction.min)
    expect(fraction).toBeLessThanOrEqual(PROPORTIONS.headHeightFraction.max)
    dispose()
  })
})
