// src/game-render/terrain/heightfield.test.ts

import { describe, it, expect } from 'vitest'
import { generateHeightfield } from './heightfield'
import type { HeightfieldOptions } from './heightfield'

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
// Shape and bounds
// ---------------------------------------------------------------------------

describe('generateHeightfield: shape', () => {
  it('produces resolution^2 samples', () => {
    const hf = generateHeightfield(opts({ resolution: 16 }))
    expect(hf.data.length).toBe(16 * 16)
  })

  it('reports the requested resolution and world size', () => {
    const hf = generateHeightfield(opts({ resolution: 24, worldSize: 250 }))
    expect(hf.resolution).toBe(24)
    expect(hf.worldSize).toBe(250)
  })

  it('rejects a degenerate resolution', () => {
    expect(() => generateHeightfield(opts({ resolution: 1 }))).toThrow()
  })

  it('rejects a non-positive world size', () => {
    expect(() => generateHeightfield(opts({ worldSize: 0 }))).toThrow()
  })
})

describe('generateHeightfield: bounds', () => {
  it('keeps every sample within [0, amplitude] and finite', () => {
    const hf = generateHeightfield(opts({ amplitude: 20 }))
    for (const h of hf.data) {
      expect(Number.isFinite(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(20)
    }
  })

  it('reports min and max consistent with the data', () => {
    const hf = generateHeightfield(opts())
    expect(hf.min).toBe(Math.min(...hf.data))
    expect(hf.max).toBe(Math.max(...hf.data))
  })

  it('scales with amplitude', () => {
    const small = generateHeightfield(opts({ amplitude: 10 }))
    const large = generateHeightfield(opts({ amplitude: 40 }))
    expect(large.max).toBeGreaterThan(small.max)
  })

  it('produces actual relief, not a flat plane', () => {
    const hf = generateHeightfield(opts())
    expect(hf.max - hf.min).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('generateHeightfield: determinism', () => {
  it('is identical for the same seed', () => {
    const a = generateHeightfield(opts({ seed: 99 }))
    const b = generateHeightfield(opts({ seed: 99 }))
    expect(Array.from(a.data)).toEqual(Array.from(b.data))
  })

  it('differs for a different seed', () => {
    const a = generateHeightfield(opts({ seed: 1 }))
    const b = generateHeightfield(opts({ seed: 2 }))
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data))
  })
})

// ---------------------------------------------------------------------------
// heightAt — world-space sampling
// ---------------------------------------------------------------------------

describe('heightAt', () => {
  const hf = generateHeightfield(opts({ resolution: 33, worldSize: 320 }))

  it('matches the raw corner samples at the field corners', () => {
    const half = 160
    expect(hf.heightAt(-half, -half)).toBeCloseTo(hf.data[0], 5)
    const lastIndex = hf.resolution * hf.resolution - 1
    expect(hf.heightAt(half, half)).toBeCloseTo(hf.data[lastIndex], 5)
  })

  it('clamps outside the field rather than returning NaN', () => {
    for (const [x, z] of [[-9999, 0], [9999, 0], [0, -9999], [0, 9999]]) {
      const h = hf.heightAt(x, z)
      expect(Number.isFinite(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
    }
  })

  it('interpolates smoothly between samples', () => {
    // A jump between adjacent world positions would be a visible terrain seam.
    let maxDelta = 0
    for (let x = -150; x < 150; x += 1) {
      const d = Math.abs(hf.heightAt(x, 12) - hf.heightAt(x + 0.5, 12))
      maxDelta = Math.max(maxDelta, d)
    }
    expect(maxDelta).toBeLessThan(3)
  })

  it('returns a value between the neighbouring grid samples', () => {
    const cell = 320 / 32
    const h0 = hf.heightAt(-160, -160)
    const h1 = hf.heightAt(-160 + cell, -160)
    const mid = hf.heightAt(-160 + cell / 2, -160)
    expect(mid).toBeGreaterThanOrEqual(Math.min(h0, h1) - 1e-6)
    expect(mid).toBeLessThanOrEqual(Math.max(h0, h1) + 1e-6)
  })
})

// ---------------------------------------------------------------------------
// ridgeMix — the dune-crest control
// ---------------------------------------------------------------------------

describe('ridgeMix', () => {
  it('changes the surface between rolling and ridged', () => {
    const rolling = generateHeightfield(opts({ ridgeMix: 0 }))
    const ridged = generateHeightfield(opts({ ridgeMix: 1 }))
    expect(Array.from(rolling.data)).not.toEqual(Array.from(ridged.data))
  })

  it('stays in bounds at both extremes', () => {
    for (const ridgeMix of [0, 1]) {
      const hf = generateHeightfield(opts({ ridgeMix, amplitude: 15 }))
      for (const h of hf.data) {
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(15)
      }
    }
  })
})
