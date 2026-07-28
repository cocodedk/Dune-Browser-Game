// src/game-render/materials/Atmosphere.test.ts

import { describe, it, expect } from 'vitest'
import { DAY_START_FRACTION, dayFraction, paletteAt, paletteForTime } from './Atmosphere'
import type { Rgb } from './Atmosphere'

function channelsInRange(c: Rgb): boolean {
  return c.every(v => Number.isFinite(v) && v >= 0 && v <= 1)
}

// ---------------------------------------------------------------------------
// dayFraction
// ---------------------------------------------------------------------------

describe('dayFraction', () => {
  it('maps the start of a day to 0', () => {
    expect(dayFraction(0, 60)).toBe(0)
    expect(dayFraction(60, 60)).toBe(0)
  })

  it('maps midday to 0.5', () => {
    expect(dayFraction(30, 60)).toBeCloseTo(0.5, 6)
  })

  it('wraps across many days', () => {
    expect(dayFraction(60 * 17 + 15, 60)).toBeCloseTo(0.25, 6)
  })

  it('returns a positive fraction for negative time', () => {
    const f = dayFraction(-15, 60)
    expect(f).toBeGreaterThanOrEqual(0)
    expect(f).toBeLessThan(1)
    expect(f).toBeCloseTo(0.75, 6)
  })

  it('guards against a zero-length day', () => {
    expect(dayFraction(123, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// paletteAt — validity across the whole day
// ---------------------------------------------------------------------------

describe('paletteAt: validity', () => {
  it('returns in-range channels at every point in the day', () => {
    for (let f = 0; f < 1; f += 0.01) {
      const p = paletteAt(f)
      expect(channelsInRange(p.horizon)).toBe(true)
      expect(channelsInRange(p.zenith)).toBe(true)
      expect(channelsInRange(p.sun)).toBe(true)
      expect(channelsInRange(p.ambient)).toBe(true)
      expect(channelsInRange(p.fog)).toBe(true)
      expect(p.exposure).toBeGreaterThan(0)
    }
  })

  it('normalises out-of-range and negative fractions', () => {
    expect(paletteAt(1.25)).toEqual(paletteAt(0.25))
    expect(paletteAt(-0.25)).toEqual(paletteAt(0.75))
  })

  it('matches fog to the horizon so distance haze reads correctly', () => {
    for (let f = 0; f < 1; f += 0.05) {
      const p = paletteAt(f)
      expect(p.fog).toEqual(p.horizon)
    }
  })
})

// ---------------------------------------------------------------------------
// paletteAt — continuity
// ---------------------------------------------------------------------------

describe('paletteAt: continuity', () => {
  it('never pops between adjacent samples, including across midnight', () => {
    // A discontinuity would show as the sky snapping colour mid-run.
    let maxDelta = 0
    for (let f = 0; f < 1; f += 0.005) {
      const a = paletteAt(f)
      const b = paletteAt(f + 0.005)
      for (let c = 0; c < 3; c++) {
        maxDelta = Math.max(maxDelta, Math.abs(a.horizon[c] - b.horizon[c]))
        maxDelta = Math.max(maxDelta, Math.abs(a.zenith[c] - b.zenith[c]))
      }
    }
    expect(maxDelta).toBeLessThan(0.05)
  })

  it('wraps continuously from just before midnight to just after', () => {
    const before = paletteAt(0.999)
    const after = paletteAt(0.001)
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(before.horizon[c] - after.horizon[c])).toBeLessThan(0.05)
    }
  })
})

// ---------------------------------------------------------------------------
// sunElevation
// ---------------------------------------------------------------------------

describe('paletteAt: sun elevation', () => {
  it('peaks at noon and bottoms at midnight', () => {
    expect(paletteAt(0.5).sunElevation).toBeCloseTo(1, 5)
    expect(paletteAt(0).sunElevation).toBeCloseTo(-1, 5)
  })

  it('crosses the horizon at dawn and dusk', () => {
    expect(paletteAt(0.25).sunElevation).toBeCloseTo(0, 5)
    expect(paletteAt(0.75).sunElevation).toBeCloseTo(0, 5)
  })

  it('stays within [-1, 1]', () => {
    for (let f = 0; f < 1; f += 0.02) {
      expect(paletteAt(f).sunElevation).toBeGreaterThanOrEqual(-1)
      expect(paletteAt(f).sunElevation).toBeLessThanOrEqual(1)
    }
  })
})

// ---------------------------------------------------------------------------
// Art-direction invariants
// ---------------------------------------------------------------------------

describe('paletteAt: art direction', () => {
  it('is brighter at noon than at midnight', () => {
    const noon = paletteAt(0.5)
    const midnight = paletteAt(0)
    const lum = (c: Rgb) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
    expect(lum(noon.horizon)).toBeGreaterThan(lum(midnight.horizon))
    expect(noon.exposure).toBeGreaterThan(midnight.exposure)
  })

  it('keeps night shadows chromatic rather than neutral grey', () => {
    // Neutral grey shadows are the classic tell of untreated 3D.
    const night = paletteAt(0).ambient
    expect(night[2]).toBeGreaterThan(night[0])
  })

  it('warms the horizon at dawn and dusk relative to noon', () => {
    const warmth = (c: Rgb) => c[0] - c[2]
    expect(warmth(paletteAt(0.25).horizon)).toBeGreaterThan(warmth(paletteAt(0.5).horizon))
    expect(warmth(paletteAt(0.75).horizon)).toBeGreaterThan(warmth(paletteAt(0.5).horizon))
  })
})

// ---------------------------------------------------------------------------
// paletteForTime
// ---------------------------------------------------------------------------

describe('paletteForTime', () => {
  it('agrees with paletteAt on the equivalent fraction, offset by the start hour', () => {
    // DAY_SECONDS is 60 in the engine.
    expect(paletteForTime(30, 60)).toEqual(paletteAt(0.5 + DAY_START_FRACTION))
    expect(paletteForTime(60 * 5 + 15, 60)).toEqual(paletteAt(0.25 + DAY_START_FRACTION))
  })

  it('opens the game in daylight rather than at midnight', () => {
    // The opening frame is what sells the game. A black planet does not.
    // sunElevation runs -1 at midnight to +1 at noon.
    expect(paletteForTime(0, 60).sunElevation).toBeGreaterThan(0.3)
  })

  it('still completes a full cycle over one day', () => {
    const start = paletteForTime(0, 60)
    expect(paletteForTime(60, 60)).toEqual(start)
    // Half a day later the sun must be on the other side of the sky.
    expect(paletteForTime(30, 60).sunElevation).toBeLessThan(-0.3)
  })
})
