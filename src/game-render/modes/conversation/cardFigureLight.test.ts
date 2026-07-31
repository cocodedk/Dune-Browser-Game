// src/game-render/modes/conversation/cardFigureLight.test.ts
// Regression test for the critic's Major 5: "the rim gradient is brightest
// at upper-LEFT, the same side as the key... Flip it, and stroke only the
// shadow-side arc rather than the full ellipse." Canvas ellipse angle 0 is
// due right and grows clockwise (y is down), so upper-left is the range
// (1.05π, 2π) this arc must exclude.

import { describe, it, expect } from 'vitest'
import { RIM_ARC_START, RIM_ARC_END } from './cardFigureLight'

function angleIsCovered(angle: number): boolean {
  return angle >= RIM_ARC_START && angle <= RIM_ARC_END
}

describe('rim arc range', () => {
  it('is a partial arc, not the full ellipse', () => {
    expect(RIM_ARC_END - RIM_ARC_START).toBeLessThan(Math.PI * 2)
  })

  it('covers the shadow side (down, left) opposite the upper-left key light', () => {
    expect(angleIsCovered(Math.PI * 0.5)).toBe(true) // straight down
    expect(angleIsCovered(Math.PI * 1.0)).toBe(true) // due left
  })

  it('excludes the upper-left key-lit quadrant', () => {
    expect(angleIsCovered(Math.PI * 1.25)).toBe(false) // up-left
    expect(angleIsCovered(Math.PI * 1.5)).toBe(false) // straight up
  })
})
