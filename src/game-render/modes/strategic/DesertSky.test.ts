// src/game-render/modes/strategic/DesertSky.test.ts
// Pure math only — fogColorFor and fogDensityFor take plain numbers/tuples
// and return plain numbers/tuples, no three.js or scene graph involved.

import { describe, it, expect } from 'vitest'
import { fogColorFor, fogDensityFor } from './DesertSky'
import type { Rgb } from '../../materials/Atmosphere'

const HORIZON: Rgb = [0.98, 0.42, 0.22] // dusk horizon, from Atmosphere.ts's keyframes
const ZENITH: Rgb = [0.3, 0.2, 0.42] // dusk zenith

describe('fogColorFor', () => {
  it('is the horizon colour untouched at skyLean 0', () => {
    expect(fogColorFor(HORIZON, ZENITH, 0)).toEqual(HORIZON)
  })

  it('is the zenith colour outright at skyLean 1', () => {
    const c = fogColorFor(HORIZON, ZENITH, 1)
    for (let i = 0; i < 3; i++) expect(c[i]).toBeCloseTo(ZENITH[i], 10)
  })

  it('never equals the horizon colour at the default lean — the Finding 3 regression guard', () => {
    // Finding 3: fog and the sky dome's horizon band were the exact same
    // triple, so ground and sky blended into one flat wash with no visible
    // horizon line. This must no longer be true.
    const c = fogColorFor(HORIZON, ZENITH)
    expect(c).not.toEqual(HORIZON)
  })

  it('sits strictly between horizon and zenith for a lean in (0, 1)', () => {
    const c = fogColorFor(HORIZON, ZENITH, 0.4)
    for (let i = 0; i < 3; i++) {
      const lo = Math.min(HORIZON[i], ZENITH[i])
      const hi = Math.max(HORIZON[i], ZENITH[i])
      expect(c[i]).toBeGreaterThanOrEqual(lo)
      expect(c[i]).toBeLessThanOrEqual(hi)
    }
  })
})

describe('fogDensityFor', () => {
  it('hits the requested transmittance at the given distance', () => {
    const distance = 968 // WORLD_SIZE * 0.22 at WORLD_SIZE = 4400
    const target = 0.75
    const density = fogDensityFor(distance, target)
    expect(Math.exp(-density * distance)).toBeCloseTo(target, 6)
  })

  it('needs less density for the same transmittance at a longer distance', () => {
    expect(fogDensityFor(2000)).toBeLessThan(fogDensityFor(1000))
  })

  it('is always positive for a sane target below full transmittance', () => {
    expect(fogDensityFor(1000, 0.75)).toBeGreaterThan(0)
    expect(fogDensityFor(500, 0.5)).toBeGreaterThan(0)
  })
})
