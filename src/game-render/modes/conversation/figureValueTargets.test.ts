// src/game-render/modes/conversation/figureValueTargets.test.ts
// Regression test for the critic's Critical 3: "Stilgar's backdrop is
// L83-85 next to a lit cheek of L90 — near-zero separation, with the
// brightest field in the frame being empty backdrop rather than the face."
// This asserts the inversion is gone using the exact constants the drawing
// code exports, not a second copy of them.

import { describe, it, expect } from 'vitest'
import { backdropEdgeLightness, faceLitLightness } from './figureValueTargets'
import { DEFAULT } from '../../../data/portraits'
import type { PortraitDef } from '../../../data/portraits'

// Shadir's actual portraits.fremen.ts def — the card the critic reviewed.
const shadirLike: PortraitDef = {
  ...DEFAULT,
  backTop: '#b07038', backBottom: '#3d2413', figure: '#2a1809',
  skinTone: 'weathered', keyHardness: 0.9,
}

// Varn (Rabban)'s actual portraits.cast.ts def — the helm card the critic
// also called out ("helm crown sits against backdrop L56, the silhouette
// dissolves").
const varnLike: PortraitDef = {
  ...DEFAULT,
  backTop: '#7a3a32', backBottom: '#2a1310', figure: '#1f0d0a',
  skinTone: 'ashen', keyHardness: 0.95,
}

describe('value hierarchy (critic Critical 3)', () => {
  it('keeps the backdrop at or below L45 beside the head', () => {
    expect(backdropEdgeLightness(shadirLike)).toBeLessThanOrEqual(45)
    expect(backdropEdgeLightness(varnLike)).toBeLessThanOrEqual(45)
  })

  it("puts the face's own lit value above the backdrop beside it", () => {
    expect(faceLitLightness(shadirLike)).toBeGreaterThan(backdropEdgeLightness(shadirLike))
    expect(faceLitLightness(varnLike)).toBeGreaterThan(backdropEdgeLightness(varnLike))
  })

  it('holds for the default portrait too, not just the two tuned cases', () => {
    expect(faceLitLightness(DEFAULT)).toBeGreaterThan(backdropEdgeLightness(DEFAULT))
  })
})
