// src/game-render/terrain/heightfield.escarpment.test.ts
// The skyline landform, split out of heightfield.test.ts at the 200-line cap.
//
// A dune field with nothing on its horizon reads as small: an art-director
// review of six captured frames found "no skyline shape, no rock, no landmark,
// no scale cue" in every one of them. The escarpment is the answer, so these
// assert it rises where asked, dies where asked, and never breaks the
// determinism the rest of the terrain depends on.

import { describe, it, expect } from 'vitest'
import { generateHeightfield, escarpmentWeight } from './heightfield'
import type { EscarpmentOptions, HeightfieldOptions } from './heightfield'

function opts(overrides: Partial<HeightfieldOptions> = {}): HeightfieldOptions {
  return {
    resolution: 32,
    worldSize: 100,
    seed: 1234,
    amplitude: 20,
    frequency: 4,
    ...overrides,
  }
}
// ---------------------------------------------------------------------------
// ridgeMix — the dune-crest control
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// escarpment — the skyline landform (Finding 3)
// ---------------------------------------------------------------------------

/**
 * The wall these tests exercise, matching DesertTerrain's own configuration so
 * the assertions below describe the escarpment the game actually generates
 * rather than a shape invented for the test.
 */
function escarpmentOpts(overrides: Partial<EscarpmentOptions> = {}): EscarpmentOptions {
  return {
    edgeDistance: 0.08,
    falloffWidth: 0.05,
    amplitudeMultiplier: 3,
    frequencyScale: 0.5,
    edgeTaper: 0.04,
    ...overrides,
  }
}

describe('escarpmentWeight', () => {
  it('peaks at 1 exactly at the requested edge distance', () => {
    expect(escarpmentWeight(1 - 0.08, 0.08, 0.05)).toBeCloseTo(1, 10)
  })

  it('falls off away from the peak on both sides', () => {
    const peak = escarpmentWeight(0.92, 0.08, 0.05)
    expect(escarpmentWeight(0.80, 0.08, 0.05)).toBeLessThan(peak)
    expect(escarpmentWeight(1.0, 0.08, 0.05)).toBeLessThan(peak)
  })

  it('stays within [0, 1] and finite', () => {
    for (let v = 0; v <= 1; v += 0.05) {
      const w = escarpmentWeight(v, 0.08, 0.05)
      expect(Number.isFinite(w)).toBe(true)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
  })
})

describe('generateHeightfield: escarpment', () => {
  it('is a no-op when omitted — unaffected fields stay identical', () => {
    const withField: HeightfieldOptions = opts({ resolution: 48 })
    const a = generateHeightfield(withField)
    const b = generateHeightfield({ ...withField, escarpment: undefined })
    expect(Array.from(a.data)).toEqual(Array.from(b.data))
  })

  it('raises the field well past the plain dune amplitude near the wall', () => {
    const hf = generateHeightfield(opts({ resolution: 48, escarpment: escarpmentOpts() }))
    const n = hf.resolution
    const wallRow = Math.round((1 - 0.08) * (n - 1))
    const midCol = Math.floor(n / 2)
    expect(hf.data[wallRow * n + midCol]).toBeGreaterThan(20) // opts() amplitude is 20
  })

  it('leaves the field near the opposite edge close to plain dune height', () => {
    const plain = generateHeightfield(opts({ resolution: 48 }))
    const withWall = generateHeightfield(opts({ resolution: 48, escarpment: escarpmentOpts() }))
    const n = plain.resolution
    const farRow = 2 // deep in v=0, far from the v=1 wall
    for (let col = 4; col < n - 4; col++) {
      expect(withWall.data[farRow * n + col]).toBeCloseTo(plain.data[farRow * n + col], 3)
    }
  })

  it('still meets zero at the true v=1 border once edgeFalloff tapers the dune term too', () => {
    const hf = generateHeightfield(
      opts({ resolution: 48, edgeFalloff: 0.1, escarpment: escarpmentOpts() }),
    )
    const n = hf.resolution
    for (let col = 0; col < n; col++) expect(hf.data[(n - 1) * n + col]).toBeCloseTo(0, 4)
  })

  it('is deterministic for the same seed', () => {
    const o = opts({ resolution: 32, escarpment: escarpmentOpts() })
    const a = generateHeightfield(o)
    const b = generateHeightfield(o)
    expect(Array.from(a.data)).toEqual(Array.from(b.data))
  })
})
