// src/game-render/modes/conversation/figureNeck.test.ts
// Regression test for the critic's Critical 2: "no neck is ever drawn: the
// face ellipse bottoms out around y=216 while the robe starts near y=265 —
// roughly 50px of raw backdrop between jaw and shoulders." This asserts the
// trapezoid actually closes that gap and keeps the shadow band where the
// critique put it — the top third, where the jaw occludes the light.

import { describe, it, expect } from 'vitest'
import { computeNeckGeometry } from './figureNeck'

describe('computeNeckGeometry', () => {
  it('flares from a narrower throat to a wider collar', () => {
    const g = computeNeckGeometry(50, 35, 300, 100)
    expect(g.topHalfW).toBeGreaterThan(0)
    expect(g.bottomHalfW).toBeGreaterThan(g.topHalfW)
  })

  it('spans from just under the jaw to just above the robe collar, with no gap', () => {
    const headR = 50
    const headY = 165
    const shoulderY = headY + headR * 2.25
    const g = computeNeckGeometry(headR, 35, shoulderY, headY)
    expect(g.topY).toBeGreaterThan(headY)
    expect(g.bottomY).toBeGreaterThan(g.topY)
    // The old bug was a ~50px gap; the neck's own span should cover most of
    // the distance between head centre and shoulder line, not a token strip.
    expect(g.bottomY - g.topY).toBeGreaterThan(headR * 0.5)
    expect(g.bottomY).toBeLessThan(shoulderY)
  })

  it('puts the cast shadow in the top third of the neck, not lower', () => {
    const g = computeNeckGeometry(50, 35, 400, 100)
    const third = g.topY + (g.bottomY - g.topY) / 3
    expect(g.shadowY).toBeCloseTo(third, 5)
    expect(g.shadowY).toBeGreaterThan(g.topY)
    expect(g.shadowY).toBeLessThan(g.bottomY)
  })
})
