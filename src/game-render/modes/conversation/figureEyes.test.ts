// src/game-render/modes/conversation/figureEyes.test.ts
// Regression test for the critic's Critical 1: "the Ibad eye glow has
// radius rx*3.4 at 0.55 alpha, so the two cyan glows overlap and flood the
// entire midface." The fix's whole point is that each eye's glow stays
// inside its own half of the face.

import { describe, it, expect } from 'vitest'
import { EYE_DX_RATIO, EYE_RX_RATIO, EYE_GLOW_RADIUS_RATIO, EYE_GLOW_ALPHA } from './figureEyes'

describe('Ibad eye glow', () => {
  it("keeps each eye's glow inside the half-gap to the other eye", () => {
    // dx is the half-distance between the two eye centres; if the glow's
    // own radius reaches past that, the two glows' edges cross the
    // midline and overlap, which is exactly what flooded the midface.
    expect(EYE_GLOW_RADIUS_RATIO).toBeLessThan(EYE_DX_RATIO)
  })

  it('is well under the old rx*3.4 radius and 0.55 alpha', () => {
    expect(EYE_GLOW_RADIUS_RATIO).toBeLessThan(EYE_RX_RATIO * 2)
    expect(EYE_GLOW_ALPHA).toBeLessThan(0.4)
  })
})
