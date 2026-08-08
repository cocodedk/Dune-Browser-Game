// character-shop/duncan/src/model/face.test.ts
// R2's proportion guards. Everything here is measured off BUILT VERTICES
// (faceMeasure.ts) — no test reads a station table or a landmark constant to
// prove that the same constant landed, which is the failure mode this shop
// has already paid for once: pass 4 reported an upper-back curve that was a
// 16mm wobble, and only a vertex table caught it.
//
// The face's divisions are taken at four heights the geometry can actually
// be asked for: the menton (the skull's own lowest point), the frontmost
// point of the brow ridge, the frontmost point of the whole face (the nose
// tip), and the trichion — which is not authored anywhere but is where the
// hair cap crosses in front of the skull (hair.ts).
//
// The upper-third band is deliberately wide at the bottom, and
// faceLandmarks.ts records why: spec's eyeLineFraction of 0.937 puts the eye
// line 17mm above the artist canon's head midpoint, so the forehead is
// compressed and this face's upper third measures near 0.22 where a canon
// face is 0.33. Spec is the law; the band is honest about what obeying it
// costs rather than being drawn to flatter the result.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createDuncan } from './Duncan'
import { PROPORTIONS } from '../spec'
import { bounds, halfWidthInBand, part } from './testSupport'
import { backZ, crossingHeight, frontZ, frontZHeight, topClearance } from './faceMeasure'

function freshRoot(): Object3D {
  const figure = createDuncan()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  return root
}

/** The four measured divisions, in stature metres. */
function divisions(root: Object3D): {
  menton: number; noseTip: number; brow: number; trichion: number; headH: number
} {
  const skull = part(root, 'skull')
  const box = bounds(skull)
  return {
    menton: box.min.y,
    headH: box.size.y,
    noseTip: frontZHeight(skull, { yMin: 1.735, yMax: 1.790, xMin: -0.006, xMax: 0.006 }),
    // Measured off the ridge itself, in a column clear of the nose.
    brow: frontZHeight(skull, { yMin: 1.800, yMax: 1.870, xMin: 0.020, xMax: 0.048 }),
    trichion: crossingHeight(part(root, 'hairCap'), skull, 1.840, 1.910, 0.002, 0.008),
  }
}

describe('face: the measured divisions fall in human bands', () => {
  it('forehead, mid-face and lower face split the face plausibly', () => {
    const root = freshRoot()
    const d = divisions(root)
    expect(Number.isFinite(d.trichion)).toBe(true)
    expect(Number.isFinite(d.noseTip)).toBe(true)

    const face = d.trichion - d.menton
    const upper = d.trichion - d.brow
    const middle = d.brow - d.noseTip
    const lower = d.noseTip - d.menton

    expect(face / d.headH).toBeGreaterThan(0.74)
    expect(face / d.headH).toBeLessThan(0.92)
    expect(upper / face).toBeGreaterThan(0.16)
    expect(upper / face).toBeLessThan(0.30)
    expect(middle / face).toBeGreaterThan(0.22)
    expect(middle / face).toBeLessThan(0.36)
    expect(lower / face).toBeGreaterThan(0.38)
    expect(lower / face).toBeLessThan(0.55)
  })

  it('the brow sits above the eye line and the nose tip below it', () => {
    const root = freshRoot()
    const d = divisions(root)
    const eyeLine = PROPORTIONS.eyeLineFraction * PROPORTIONS.heightM
    expect(d.brow).toBeGreaterThan(eyeLine + 0.008)
    expect(d.brow).toBeLessThan(eyeLine + 0.035)
    expect(d.noseTip).toBeLessThan(eyeLine - 0.030)
  })
})

describe('hair: the cap covers the skull everywhere above the hairline', () => {
  it('no bare scalp — the skull never breaks through the top of the cap', () => {
    const root = freshRoot()
    // 1.900 is clear of the highest point the hairline reaches (measured at
    // 1.890 over the temple recessions), so anything the skull wins up here
    // is a hole in the hair and not a forehead. faceMeasure.ts records why
    // this is a vertical comparison and what a radial one missed.
    const clearance = topClearance(part(root, 'hairCap'), part(root, 'skull'), 1.900, 0.004)
    expect(clearance).toBeGreaterThan(0.002)
  })

  it('no bare scalp at the BACK either — the occiput carries no face forms', () => {
    const root = freshRoot()
    const skull = part(root, 'skull')
    const cap = part(root, 'hairCap')
    // THE CROWN GUARD ABOVE COULD NOT SEE THIS ONE. Every form in
    // faceSculpt.ts and its neighbours is a function of (x, y) alone and a
    // skull is a closed loop in x, so the socket bowl (+12.5mm "into the head"
    // at the eye line) and the cheekbone were also being applied to the BACK
    // of the head. Measured: a 17mm outward bulge at |x| 36-56, y 1.800-1.812
    // that pushed through the cap; raycast against the back camera found 226
    // pixels of skull, x[-57.6, 57.6], y[1800.6, 1811.6]. Two symmetric
    // patches of bare scalp, and no test in this shop was looking at the
    // occiput. faceSculpt.ts's rear weight is the fix.
    for (const side of [-1, 1] as const) {
      for (const from of [0.030, 0.040, 0.050]) {
        for (const yMin of [1.794, 1.806]) {
          const w = {
            yMin,
            yMax: yMin + 0.012,
            xMin: side < 0 ? -(from + 0.010) : from,
            xMax: side < 0 ? -from : from + 0.010,
          }
          expect(backZ(cap, w) - backZ(skull, w)).toBeGreaterThan(0.008)
        }
      }
    }
    // ...and the rear profile itself is smooth, which is the CAUSE rather than
    // the symptom: down this column it read 104.4 / 121.6 / 107.8mm before and
    // 98.7 / 99.5 / 99.4 after. A local bulge here is a face form that escaped.
    const column = { xMin: 0.040, xMax: 0.048 }
    const at = (y: number): number => backZ(skull, { yMin: y - 0.004, yMax: y + 0.004, ...column })
    const rise = at(1.808) - at(1.792)
    expect(Math.abs(rise)).toBeLessThan(0.004)
  })
})

describe('face: bizygomatic width against head height, and the wedge below it', () => {
  it('the cheekbones are the widest part of the face, in band', () => {
    const root = freshRoot()
    const skull = part(root, 'skull')
    const headH = bounds(skull).size.y
    const zygomatic = halfWidthInBand(skull, 1.790, 1.801) * 2
    const jaw = halfWidthInBand(skull, 1.714, 1.724) * 2
    const temple = halfWidthInBand(skull, 1.826, 1.836) * 2

    // A male bizygomatic breadth runs about 0.58-0.70 of head height; this
    // face is deliberately near the top of it (a broad face is the point).
    expect(zygomatic / headH).toBeGreaterThan(0.58)
    expect(zygomatic / headH).toBeLessThan(0.70)
    // Wider than both the jaw below and the temple above: a face is a wedge
    // between two narrower things, never a slab.
    expect(zygomatic).toBeGreaterThan(jaw + 0.004)
    expect(zygomatic).toBeGreaterThan(temple + 0.004)
    // ...but a SQUARE jaw, so the taper is shallow.
    expect(jaw / zygomatic).toBeGreaterThan(0.80)
  })
})

describe('face: the profile has a nose, a nasion and lips that clear the beard', () => {
  it('the nose tip leads the face and the nasion dips behind the brow', () => {
    const root = freshRoot()
    const skull = part(root, 'skull')
    const column = { xMin: -0.005, xMax: 0.005 }
    const tip = frontZ(skull, { yMin: 1.760, yMax: 1.770, ...column })
    const nasion = frontZ(skull, { yMin: 1.821, yMax: 1.824, ...column })
    const brow = frontZ(skull, { yMin: 1.822, yMax: 1.834, xMin: 0.020, xMax: 0.048 })
    // Frontmost geometry on the whole head, by a clear margin over the brow.
    expect(tip).toBeLessThan(brow - 0.012)
    // The dip pass 5 won and R2 had to keep: the bridge root sits BACK.
    expect(nasion).toBeGreaterThan(brow + 0.006)
    // The nose base is where faceLandmarks says: behind the tip, ahead of
    // the upper lip.
    const base = frontZ(skull, { yMin: 1.754, yMax: 1.757, ...column })
    const upperLip = frontZ(skull, { yMin: 1.743, yMax: 1.745, ...column })
    expect(base).toBeGreaterThan(tip)
    expect(base).toBeLessThan(upperLip)
  })

  it('the lips stand clear of the beard, so there is a mouth', () => {
    const root = freshRoot()
    // The window is the LIPS ONLY. Widen it upward past 1.740 and it starts
    // measuring the moustache instead, which is 17mm proud on purpose and
    // makes this read backwards.
    const window = { yMin: 1.7255, yMax: 1.7395, xMin: -0.015, xMax: 0.015 }
    const lips = frontZ(part(root, 'skull'), window)
    const beard = frontZ(part(root, 'beard'), window)
    expect(lips).toBeLessThan(beard - 0.004)
    // And the two lips are separated by a real notch, not one pad.
    const column = { xMin: -0.005, xMax: 0.005 }
    const stomion = frontZ(part(root, 'skull'), { yMin: 1.736, yMax: 1.738, ...column })
    const lower = frontZ(part(root, 'skull'), { yMin: 1.727, yMax: 1.730, ...column })
    expect(stomion).toBeGreaterThan(lower + 0.004)
  })
})
