// src/game-render/env/Lighting.test.ts
// Pure math only — sunIntensityFor/fillIntensityFor/directShare take a plain
// number and return a plain number, no three.js involved.

import { describe, it, expect } from 'vitest'
import {
  sunIntensityFor,
  fillIntensityFor,
  directShare,
  SUN_NIGHT_FLOOR,
  FILL_NIGHT_FLOOR,
  SUN_GOLDEN_PEAK_ELEVATION,
} from './Lighting'

describe('directShare', () => {
  it('clears an 85% direct share across the useful sun-angle range', () => {
    // The regression guard for the whole task: a shadow can only remove the
    // direct term, so this is the ceiling on how deep any shadow can read.
    // 0.15 (~10 degrees of sun altitude) is where the measured baseline
    // table in Lighting.ts starts; below that the sun has barely cleared
    // the horizon and is not the "useful" relief-casting range this guards.
    for (let e = 0.15; e <= 1; e += 0.05) {
      expect(directShare(e)).toBeGreaterThanOrEqual(0.85)
    }
  })

  it('stays under 100% and does not blow past a sane ceiling', () => {
    for (let e = 0; e <= 1; e += 0.1) {
      expect(directShare(e)).toBeLessThan(0.95)
    }
  })

  it('rises as elevation climbs from the horizon toward the golden peak', () => {
    expect(directShare(0.15)).toBeLessThan(directShare(SUN_GOLDEN_PEAK_ELEVATION))
  })

  it('is flat beyond the golden peak — noon does not outshine golden hour', () => {
    expect(directShare(SUN_GOLDEN_PEAK_ELEVATION)).toBeCloseTo(directShare(1), 10)
    expect(directShare(0.6)).toBeCloseTo(directShare(1), 10)
  })
})

describe('sunIntensityFor / fillIntensityFor', () => {
  it('floors both at night (elevation <= 0), regardless of how negative', () => {
    expect(sunIntensityFor(0)).toBeCloseTo(SUN_NIGHT_FLOOR, 10)
    expect(sunIntensityFor(-0.25)).toBeCloseTo(SUN_NIGHT_FLOOR, 10)
    expect(sunIntensityFor(-1)).toBeCloseTo(SUN_NIGHT_FLOOR, 10)
    expect(fillIntensityFor(-0.6)).toBeCloseTo(FILL_NIGHT_FLOOR, 10)
  })

  it('keeps night as bright as what actually shipped before (0.36)', () => {
    // Regression guard for "keep night legible", and the baseline matters more
    // than the assertion. The obvious floor to compare against is the old
    // code's `max(0.08, ...)` and `max(0.14, ...)`, summing to 0.22 — but the
    // inner max(0, elevation) already floored those expressions at 0.20 and
    // 0.16, so 0.08 and 0.14 never once executed. Guarding 0.22 would license
    // any future edit to darken night by 39% and still pass, which is exactly
    // how this rewrite first went out. 0.36 is what a player has actually seen.
    for (const elevation of [0, -0.25, -1]) {
      expect(sunIntensityFor(elevation) + fillIntensityFor(elevation))
        .toBeGreaterThanOrEqual(0.36)
    }
  })

  it('caps out at the golden-peak elevation rather than climbing to noon', () => {
    expect(sunIntensityFor(SUN_GOLDEN_PEAK_ELEVATION)).toBeCloseTo(sunIntensityFor(1), 10)
    expect(fillIntensityFor(SUN_GOLDEN_PEAK_ELEVATION)).toBeCloseTo(fillIntensityFor(1), 10)
  })

  it('is monotonically non-decreasing from night to the golden peak', () => {
    let prevSun = sunIntensityFor(0)
    let prevFill = fillIntensityFor(0)
    for (let e = 0.05; e <= SUN_GOLDEN_PEAK_ELEVATION; e += 0.05) {
      const sun = sunIntensityFor(e)
      const fill = fillIntensityFor(e)
      expect(sun).toBeGreaterThanOrEqual(prevSun)
      expect(fill).toBeGreaterThanOrEqual(prevFill)
      prevSun = sun
      prevFill = fill
    }
  })

  it('never returns a negative or non-finite value', () => {
    for (let e = -1; e <= 1; e += 0.1) {
      expect(sunIntensityFor(e)).toBeGreaterThan(0)
      expect(fillIntensityFor(e)).toBeGreaterThan(0)
      expect(Number.isFinite(sunIntensityFor(e))).toBe(true)
      expect(Number.isFinite(fillIntensityFor(e))).toBe(true)
    }
  })
})
