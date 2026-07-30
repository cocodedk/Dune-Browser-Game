// src/game-render/planet/NightLights.test.ts
//
// Only the pure decision functions — nightAmount and isNightSide — are
// tested here. createNightLights builds ShaderMaterial/Mesh/SphereGeometry,
// which construct fine without a GL context but render nothing meaningful
// without one, so there is nothing a headless assertion could check on them.

import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { nightAmount, isNightSide } from './NightLights'

describe('nightAmount', () => {
  it('is 0 at full daylight and 1 at full night', () => {
    expect(nightAmount(1)).toBe(0)
    expect(nightAmount(-1)).toBe(1)
  })

  it('sits at the edges of its own band', () => {
    expect(nightAmount(0.22)).toBe(0)
    expect(nightAmount(-0.12)).toBeCloseTo(1, 9)
  })

  it('is monotonically non-increasing as the surface faces the sun more', () => {
    let previous = 2
    for (let lit = -1; lit <= 1; lit += 0.1) {
      const n = nightAmount(lit)
      expect(n).toBeLessThanOrEqual(previous + 1e-9)
      previous = n
    }
  })

  it('never leaves 0..1', () => {
    for (let lit = -3; lit <= 3; lit += 0.25) {
      const n = nightAmount(lit)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
    }
  })
})

describe('isNightSide', () => {
  it('is true directly opposite the sun', () => {
    const outward = new Vector3(0, 0, -1)
    const sun = new Vector3(0, 0, 1)
    expect(isNightSide(outward, sun)).toBe(true)
  })

  it('is false facing the sun', () => {
    const outward = new Vector3(0, 0, 1)
    const sun = new Vector3(0, 0, 1)
    expect(isNightSide(outward, sun)).toBe(false)
  })

  it('respects a custom threshold at the terminator', () => {
    // Perpendicular to the sun: dot is 0, right at the terminator.
    const outward = new Vector3(1, 0, 0)
    const sun = new Vector3(0, 0, 1)
    expect(isNightSide(outward, sun, -0.5)).toBe(false)
    expect(isNightSide(outward, sun, 0.5)).toBe(true)
  })
})
