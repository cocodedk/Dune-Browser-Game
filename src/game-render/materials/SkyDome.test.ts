// src/game-render/materials/SkyDome.test.ts
// Pure math only — sunDiskBoostFor takes a plain number and returns a plain
// number. The shader it feeds cannot be exercised without a WebGL context,
// so this is the whole testable surface of that change.

import { describe, it, expect } from 'vitest'
import { sunDiskBoostFor } from './SkyDome'

describe('sunDiskBoostFor', () => {
  it('peaks right at the horizon crossing', () => {
    const atHorizon = sunDiskBoostFor(0)
    expect(atHorizon).toBeGreaterThan(sunDiskBoostFor(0.3))
    expect(atHorizon).toBeGreaterThan(sunDiskBoostFor(-0.3))
  })

  it('decays to a bare 1x by full elevation, either rising or setting', () => {
    expect(sunDiskBoostFor(1)).toBeCloseTo(1, 10)
    expect(sunDiskBoostFor(-1)).toBeCloseTo(1, 10)
  })

  it('is symmetric around the horizon — a sunrise reads the same as a sunset', () => {
    for (let e = 0; e <= 1; e += 0.1) {
      expect(sunDiskBoostFor(e)).toBeCloseTo(sunDiskBoostFor(-e), 10)
    }
  })

  it('never drops below 1x or produces a non-finite value', () => {
    for (let e = -1; e <= 1; e += 0.05) {
      const boost = sunDiskBoostFor(e)
      expect(boost).toBeGreaterThanOrEqual(1)
      expect(Number.isFinite(boost)).toBe(true)
    }
  })
})
