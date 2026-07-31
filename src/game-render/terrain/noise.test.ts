// src/game-render/terrain/noise.test.ts

import { describe, it, expect } from 'vitest'
import { mulberry32, createNoiseField } from './noise'

// ---------------------------------------------------------------------------
// mulberry32
// ---------------------------------------------------------------------------

describe('mulberry32', () => {
  it('produces the same stream for the same seed', () => {
    const a = mulberry32(1234)
    const b = mulberry32(1234)
    for (let i = 0; i < 20; i++) expect(a()).toBe(b())
  })

  it('produces different streams for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const aVals = Array.from({ length: 10 }, () => a())
    const bVals = Array.from({ length: 10 }, () => b())
    expect(aVals).not.toEqual(bVals)
  })

  it('stays within [0, 1)', () => {
    const rand = mulberry32(99)
    for (let i = 0; i < 2000; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

// ---------------------------------------------------------------------------
// noise2D
// ---------------------------------------------------------------------------

describe('noise2D', () => {
  const field = createNoiseField(42)

  it('is deterministic for the same seed and coordinates', () => {
    const other = createNoiseField(42)
    for (let i = 0; i < 50; i++) {
      const x = i * 0.37
      const y = i * 0.91
      expect(field.noise2D(x, y)).toBe(other.noise2D(x, y))
    }
  })

  it('differs between seeds', () => {
    const other = createNoiseField(43)
    const same = Array.from({ length: 30 }, (_, i) =>
      field.noise2D(i * 0.3, i * 0.7) === other.noise2D(i * 0.3, i * 0.7),
    )
    expect(same.every(Boolean)).toBe(false)
  })

  it('stays within [-1, 1] and never returns NaN', () => {
    for (let x = -50; x < 50; x += 0.83) {
      for (let y = -20; y < 20; y += 1.7) {
        const v = field.noise2D(x, y)
        expect(Number.isNaN(v)).toBe(false)
        expect(v).toBeGreaterThanOrEqual(-1)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('is continuous — nearby samples do not jump', () => {
    // A discontinuity here would show up as a visible crease in the terrain.
    let maxDelta = 0
    for (let i = 0; i < 500; i++) {
      const x = i * 0.05
      const d = Math.abs(field.noise2D(x, 3.5) - field.noise2D(x + 0.01, 3.5))
      maxDelta = Math.max(maxDelta, d)
    }
    expect(maxDelta).toBeLessThan(0.2)
  })

  it('returns 0 at integer lattice points', () => {
    // Gradient noise is zero at lattice corners by construction; a non-zero
    // value here means the gradient lookup is misaligned.
    for (let i = 0; i < 10; i++) {
      expect(Math.abs(field.noise2D(i, i * 2))).toBeLessThan(1e-6)
    }
  })
})

// ---------------------------------------------------------------------------
// fbm / warpedFbm
// ---------------------------------------------------------------------------

describe('fbm', () => {
  const field = createNoiseField(7)

  it('stays within [-1, 1] and is never NaN', () => {
    for (let x = -30; x < 30; x += 1.1) {
      for (let y = -30; y < 30; y += 2.3) {
        const v = field.fbm(x, y)
        expect(Number.isNaN(v)).toBe(false)
        expect(v).toBeGreaterThanOrEqual(-1)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('is deterministic', () => {
    const other = createNoiseField(7)
    expect(field.fbm(3.3, 9.1)).toBe(other.fbm(3.3, 9.1))
  })

  it('handles zero octaves without dividing by zero', () => {
    expect(field.fbm(1, 1, 0)).toBe(0)
  })

  it('adds detail with more octaves', () => {
    const coarse = field.fbm(2.5, 2.5, 1)
    const fine = field.fbm(2.5, 2.5, 6)
    expect(coarse).not.toBe(fine)
  })
})

describe('warpedFbm', () => {
  const field = createNoiseField(11)

  it('stays bounded and finite', () => {
    for (let x = -20; x < 20; x += 1.3) {
      const v = field.warpedFbm(x, x * 0.5)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('differs from plain fbm — the domain is actually warped', () => {
    expect(field.warpedFbm(4.2, 1.8)).not.toBe(field.fbm(4.2, 1.8))
  })

  it('collapses to plain fbm at zero warp strength', () => {
    expect(field.warpedFbm(4.2, 1.8, 5, 0)).toBe(field.fbm(4.2, 1.8, 5))
  })

  it('is deterministic', () => {
    const other = createNoiseField(11)
    expect(field.warpedFbm(1.1, 2.2)).toBe(other.warpedFbm(1.1, 2.2))
  })
})
