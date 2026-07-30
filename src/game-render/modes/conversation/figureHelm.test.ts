// src/game-render/modes/conversation/figureHelm.test.ts
// Regression test for the critic's Major 6: "every metal value is mixed
// 35-60% from def.figure, every transition is a soft gradient, and there is
// no specular." A specular has to be a harder jump than anything already on
// the dome, or it just reads as one more soft gradient.

import { describe, it, expect } from 'vitest'
import { HELM_SPECULAR_MIX, HELM_BRIM_MIX } from './figureHelm'

// The dome/crest/cheek-guard mixes in figureHelm.ts top out at 0.6 (the
// crest's lit face) — the critic's "35-60%" range.
const OLD_MAX_METAL_MIX = 0.6

describe('helm specular and brim', () => {
  it('mixes the specular harder toward white than any existing metal value', () => {
    expect(HELM_SPECULAR_MIX).toBeGreaterThan(OLD_MAX_METAL_MIX)
  })

  it('mixes the brim line harder toward black than any existing metal value', () => {
    expect(HELM_BRIM_MIX).toBeGreaterThan(OLD_MAX_METAL_MIX)
  })
})
