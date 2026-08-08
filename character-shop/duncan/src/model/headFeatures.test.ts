// character-shop/duncan/src/model/headFeatures.test.ts
// The named features R2 authored, guarded one at a time off built vertices:
// the SCAR through one brow, the topknot's cinch, and the neck sliver R1 won
// and this round had to keep. The orbit's own guards — globes, lids and the
// aperture between them — moved to eyeFeatures.test.ts when pass 2's lid
// guards took this file to the 200-line limit.
//
// THE SCAR TEST HARD-CODES ITS SIDE ON PURPOSE. It does not import
// SCAR_SIDE, because a guard that reads the constant it is guarding passes
// happily when that constant is flipped, and a mirrored scar is precisely
// the failure worth catching: Momoa's is over his own LEFT brow, the figure
// faces -Z, and this shop's arm.ts already fixes the figure's left as -X.
// faceLandmarks.ts carries the full derivation and the note that the R2
// brief said the opposite. To move the scar deliberately, BOTH the constant
// there and the expectation here have to be changed — which is the point.

import { describe, it, expect } from 'vitest'
import { Box3, MathUtils, Vector3 } from 'three'
import type { Object3D } from 'three'
import { createDuncan } from './Duncan'
import { PROPORTIONS } from '../spec'
import { bounds, named, part } from './testSupport'
import { backZ, forEachVertex, frontZ, mirroredRecess } from './faceMeasure'
import { KNOT_AXIS } from './topknot'

const SCAR_IS_ON = -1 // the figure's own left; see the header before changing

function freshRoot(): Object3D {
  const figure = createDuncan()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  return root
}

describe('scar: a notch through the LEFT brow, and only the left', () => {
  it('the brow ridge carries a local recess on -X that -X alone has', () => {
    const root = freshRoot()
    const skull = part(root, 'skull')
    // RE-BANDED TWICE NOW, and the reason has changed both times. Pass 2
    // dropped a 60 x 15 x 11mm trench to a 34 x 5 x 7mm groove and the band
    // went 5mm -> 3.5mm. PASS 3 makes the mark a raised CORD (scar.ts) with
    // the trough demoted to one flank of it, so the trough is 4.2mm deep
    // where it was 6.8 and this sweep reads 3.36mm where it read 5.3. The
    // number below moved because the geometry it measures deliberately did,
    // and the guard that matters for "is there a mark" is now the NEXT one:
    // a recess alone was what three critics kept reading as breakage.
    const notch = mirroredRecess(skull, 0.026, 0.058, 1.818, 1.842, 0.004)
    expect(notch.deepest).toBeGreaterThan(0.0026)

    // ...and the rest of the brow line is symmetric, so the notch is a notch
    // and not one side of the face being built differently from the other.
    const inner = mirroredRecess(skull, 0.006, 0.020, 1.818, 1.842, 0.004)
    expect(inner.worstAbs).toBeLessThan(0.002)
  })

  it('there is RAISED TISSUE on -X, crossing the gap and passing both edges', () => {
    const root = freshRoot()
    const cords = named(root, 'scarCord')
    expect(cords.length).toBe(1)
    const box = new Box3().setFromObject(cords[0])
    expect(box.getCenter(new Vector3()).x * SCAR_IS_ON).toBeGreaterThan(0)

    // The cord has to reach PAST the brow band at both ends, or it reads as
    // one more chip sitting in the gap rather than as a mark crossing it.
    // Measured LOCALLY, over the 12mm of x the cord actually occupies: a
    // bounding box of the whole brow is the wrong ruler, because the lateral
    // piece's tail drops 3mm lower out at the temple than the brow ever is
    // beside the mark, and comparing against that measures the tail.
    let low = Infinity
    let high = -Infinity
    for (const piece of named(root, 'browHair')) {
      forEachVertex(piece, (v) => {
        const x = Math.abs(v.x)
        if (v.x * SCAR_IS_ON <= 0 || x < 0.037 || x > 0.049) return
        low = Math.min(low, v.y)
        high = Math.max(high, v.y)
      })
    }
    expect(Number.isFinite(low)).toBe(true)
    expect(box.max.y).toBeGreaterThan(high + 0.002)
    expect(box.min.y).toBeLessThan(low - 0.002)

    // And it STANDS PROUD of the unmarked skin. This is the whole of pass 3's
    // change and the one thing a recess could never say: measured against the
    // +X mirror over the mark's own 4 x 4mm centre, the crest wins by 1.30mm.
    // The window is tight on purpose — widen it and the brow ridge's own peak
    // at |x| = 40 enters and takes the minimum, which measures the ridge.
    const window = { yMin: 1.827, yMax: 1.831, xMin: -0.045, xMax: -0.041 }
    const crest = frontZ(cords[0], window)
    const mirror = frontZ(part(root, 'skull'), { ...window, xMin: 0.041, xMax: 0.045 })
    expect(mirror - crest).toBeGreaterThan(0.0007)
  })

  it('the dark brow is broken in two on -X and whole on +X', () => {
    const root = freshRoot()
    const boxes = named(root, 'browHair').map((brow) => new Box3().setFromObject(brow))
    expect(boxes.length).toBe(3)
    const onScarSide = boxes.filter((box) => box.getCenter(new Vector3()).x * SCAR_IS_ON > 0)
    expect(onScarSide.length).toBe(2)
    expect(boxes.length - onScarSide.length).toBe(1)

    // The two pieces leave a real gap, and it is OUT ON THE BROW where a
    // scar crosses one — not a seam at the nose. Measured as distance from
    // the centreline, since the scarred side's x is negative and min/max
    // swap their meaning there.
    const reach = onScarSide
      .map((box) => ({
        inner: Math.min(Math.abs(box.min.x), Math.abs(box.max.x)),
        outer: Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
      }))
      .sort((a, b) => a.outer - b.outer)
    const gap = reach[1].inner - reach[0].outer
    expect(gap).toBeGreaterThan(0.003)
    const middle = (reach[1].inner + reach[0].outer) / 2
    expect(middle).toBeGreaterThan(0.030)
    expect(middle).toBeLessThan(0.055)
  })
})

describe('topknot: a tie, not a bun — the cinch is measurable', () => {
  it('the knot narrows at the tie and blooms again past it', () => {
    const root = freshRoot()
    const tilt = MathUtils.degToRad(KNOT_AXIS.tiltDeg)
    const axis = { y: Math.cos(tilt), z: Math.sin(tilt) }
    // Widest half-width in 6mm bands along the knot's OWN axis.
    const bands = new Map<number, number>()
    forEachVertex(part(root, 'topknotBun'), (v) => {
      const s = (v.y - KNOT_AXIS.y) * axis.y + (v.z - KNOT_AXIS.z) * axis.z
      const key = Math.round(s / 0.006)
      bands.set(key, Math.max(bands.get(key) ?? 0, Math.abs(v.x)))
    })
    const at = (s: number): number => bands.get(Math.round(s / 0.006)) ?? 0
    const gather = Math.max(at(0.006), at(0.012))
    const tie = Math.min(at(0.024), at(0.030))
    const bloom = Math.max(at(0.048), at(0.054))
    expect(tie).toBeGreaterThan(0.010)
    expect(gather - tie).toBeGreaterThan(0.006)
    expect(bloom - tie).toBeGreaterThan(0.006)
  })

  it('the knot is the tallest thing on the figure, at stature', () => {
    const root = freshRoot()
    const knot = bounds(part(root, 'topknotBun'))
    const whole = bounds(root)
    expect(knot.max.y).toBeCloseTo(whole.max.y, 4)
    expect(whole.max.y).toBeGreaterThan(PROPORTIONS.heightM * 0.99)
  })
})

describe('neck: the sliver behind the beard survives R2', () => {
  it('the neck stands well back of the beard, so profile shows skin', () => {
    const root = freshRoot()
    const window = { yMin: 1.645, yMax: 1.670 }
    const neck = backZ(part(root, 'neck'), window)
    const beard = backZ(part(root, 'beard'), window)
    expect(neck - beard).toBeGreaterThan(0.035)
  })
})
