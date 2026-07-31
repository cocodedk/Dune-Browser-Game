// src/game-render/modes/conversation/figureDetails.test.ts
// Regression test for the critic's Critical 1 beard note: "lower the beard
// alpha — it currently reads as a hard black mouth-slot." Guards against
// the alpha creeping back toward the old 0.78/0.4.

import { describe, it, expect } from 'vitest'
import { BEARD_ALPHA_FULL, BEARD_ALPHA_STUBBLE, mix, withAlpha } from './figureDetails'

describe('beard alpha', () => {
  it('sits well under the old 0.78 (full) and 0.4 (stubble) values', () => {
    expect(BEARD_ALPHA_FULL).toBeLessThan(0.65)
    expect(BEARD_ALPHA_STUBBLE).toBeLessThan(0.3)
  })

  it('keeps full beard darker than stubble', () => {
    expect(BEARD_ALPHA_FULL).toBeGreaterThan(BEARD_ALPHA_STUBBLE)
  })
})

describe('mix / withAlpha', () => {
  it('mix(a, b, 0) returns a and mix(a, b, 1) returns b', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('rgb(0, 0, 0)')
    expect(mix('#000000', '#ffffff', 1)).toBe('rgb(255, 255, 255)')
  })

  it('withAlpha carries the requested alpha through', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
  })
})
