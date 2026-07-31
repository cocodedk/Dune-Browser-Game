// src/game-render/modes/conversation/figureSilhouette.test.ts
// The rim-light bug this geometry fixes was a fixed hood-shaped ellipse used
// for every headgear, so a bare head or a helm got a ring floating outside
// its own silhouette. This asserts each headgear gets its own positive,
// head-scaled radius rather than one shared shape.

import { describe, it, expect } from 'vitest'
import { headSilhouette } from './figureSilhouette'
import { DEFAULT } from '../../../data/portraits'
import type { Headgear, PortraitDef } from '../../../data/portraits'

const HEADGEARS: Headgear[] = ['hood', 'scarf', 'bare', 'cap', 'helm']

function def(headgear: Headgear, overrides: Partial<PortraitDef> = {}): PortraitDef {
  return { ...DEFAULT, headgear, ...overrides }
}

describe('headSilhouette', () => {
  it('gives every headgear a strictly positive radius scaled to the head', () => {
    const headR = 50
    for (const headgear of HEADGEARS) {
      const { rx, ry } = headSilhouette(def(headgear), headR)
      expect(rx).toBeGreaterThan(headR * 0.5)
      expect(ry).toBeGreaterThan(headR * 0.5)
    }
  })

  it('gives every headgear its own shape, not just two of them', () => {
    const headR = 50
    const radii = HEADGEARS.map((headgear) => headSilhouette(def(headgear), headR))
    // Keyed on the whole shape: uniqueRx > 1 passed with four of five headgears
    // sharing a silhouette, which is most of the bug it was meant to catch.
    const shapes = new Set(
      radii.map((r) => `${r.rx.toFixed(3)}/${r.ry.toFixed(3)}/${r.offsetY.toFixed(3)}`),
    )
    expect(shapes.size).toBe(HEADGEARS.length)
  })

  // The whole point of this module is that the rim light traces what is
  // actually painted. These are the crown heights the drawing code reaches,
  // measured off the paths in figureHeadgear.ts and figureHelm.ts and
  // expressed as multiples of headR above the head centre. If a headgear's
  // artwork is retuned, this test is meant to fail until the silhouette that
  // lights it is retuned with it.
  const DRAWN_CROWN_ABOVE_CENTRE: Record<Headgear, number> = {
    hood: 1.28,   // drawHood outer ellipse, ry 1.28 at offset -0.06
    scarf: 1.15,
    bare: 0.98,
    cap: 0.96,    // crown ellipse cy -0.50, ry 0.46
    helm: 1.24,   // crest top, figureHelm `const top = headY - headR * 1.24`
  }

  it('never floats the rim above the headgear that is actually drawn', () => {
    const headR = 50
    for (const headgear of HEADGEARS) {
      const { ry, offsetY } = headSilhouette(def(headgear), headR)
      // Canvas y grows downward, so the top of the rim ellipse is the most
      // negative point it reaches.
      const rimTop = offsetY - ry
      const drawnTop = -DRAWN_CROWN_ABOVE_CENTRE[headgear] * headR
      // A rim that stops slightly inside the silhouette reads as light dying
      // at the edge. One that overshoots reads as a hoop hanging in the air,
      // which is the defect: helm overshot by 0.52 * headR and cap by 0.18.
      expect(rimTop).toBeGreaterThanOrEqual(drawnTop - headR * 0.06)
    }
  })

  it('widens with jaw for the headgears that leave the jaw visible', () => {
    const headR = 50
    for (const headgear of ['bare', 'cap', 'scarf'] as Headgear[]) {
      const narrow = headSilhouette(def(headgear, { jaw: 0.75 }), headR)
      const wide = headSilhouette(def(headgear, { jaw: 1.3 }), headR)
      expect(wide.rx).toBeGreaterThan(narrow.rx)
    }
  })
})
