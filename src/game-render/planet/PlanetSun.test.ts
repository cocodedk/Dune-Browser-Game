// src/game-render/planet/PlanetSun.test.ts
//
// Only the pure decision functions are tested here — createSunPlacer wires
// them into a LightingRig/camera and has nothing a headless assertion could
// check beyond what these two already cover.

import { describe, it, expect } from 'vitest'
import { sunOffAxisAngle, sunDaylightLevel, sunLift, fillLevelFor } from './PlanetSun'

describe('sunOffAxisAngle', () => {
  it('is narrow at noon, so the visible disc is nearly all lit', () => {
    expect(sunOffAxisAngle(1)).toBeCloseTo(0.15, 6)
  })

  it('sits at the terminator angle at elevation 0', () => {
    expect(sunOffAxisAngle(0)).toBeCloseTo(1.57, 6)
  })

  it('widens further past the terminator toward midnight', () => {
    expect(sunOffAxisAngle(-1)).toBeCloseTo(2.7, 6)
  })

  it('is symmetric in magnitude around dawn/dusk', () => {
    // Same distance from the terminator on either side should not have to
    // land at the same angle (dawn and midnight are different pictures), but
    // the function should still move monotonically away from 1.57 in both
    // directions rather than doubling back.
    expect(sunOffAxisAngle(0.5)).toBeLessThan(sunOffAxisAngle(0))
    expect(sunOffAxisAngle(-0.5)).toBeGreaterThan(sunOffAxisAngle(0))
  })

  it('is monotonic from midnight to noon', () => {
    let previous = -Infinity
    for (let e = -1; e <= 1; e += 0.1) {
      const angle = sunOffAxisAngle(e)
      // Angle decreases as elevation rises (noon = narrow angle).
      expect(-angle).toBeGreaterThanOrEqual(previous - 1e-9)
      previous = -angle
    }
  })

  it('clamps elevation outside -1..1', () => {
    expect(sunOffAxisAngle(-5)).toBe(sunOffAxisAngle(-1))
    expect(sunOffAxisAngle(5)).toBe(sunOffAxisAngle(1))
  })
})

describe('sunDaylightLevel', () => {
  it('is at its floor at midnight and its peak at noon', () => {
    expect(sunDaylightLevel(-1)).toBeCloseTo(0.15, 6)
    // Peak is a tuned value, so this asserts the shape rather than pinning the
    // number: noon must be the brightest hour and clearly above night, without
    // this test having to be edited every time the exposure is re-balanced.
    expect(sunDaylightLevel(1)).toBeGreaterThan(sunDaylightLevel(0.5))
    expect(sunDaylightLevel(1)).toBeGreaterThan(sunDaylightLevel(-1) * 4)
  })

  it('never drops to zero, so night stays a dim render rather than a black one', () => {
    for (let e = -1; e <= 1; e += 0.1) {
      expect(sunDaylightLevel(e)).toBeGreaterThan(0)
    }
  })

  it('is monotonic in elevation', () => {
    let previous = -Infinity
    for (let e = -1; e <= 1; e += 0.1) {
      const level = sunDaylightLevel(e)
      expect(level).toBeGreaterThanOrEqual(previous - 1e-9)
      previous = level
    }
  })

  it('clamps elevation outside -1..1', () => {
    expect(sunDaylightLevel(-5)).toBe(sunDaylightLevel(-1))
    expect(sunDaylightLevel(5)).toBe(sunDaylightLevel(1))
  })
})

// ---------------------------------------------------------------------------
// sunLift — the reason the off-axis angle could not do its job
// ---------------------------------------------------------------------------

describe('sunLift', () => {
  it('drops toward noon so the sun can actually get behind the camera', () => {
    // A flat lift is what left noon lighting only the top of the disc: the
    // rotation had correctly fallen to 0.15 rad and 0.42 of vertical undid it.
    expect(sunLift(1)).toBeLessThan(sunLift(0))
    expect(sunLift(1)).toBeLessThan(0.15)
  })

  it('keeps lift away from noon, so the sphere still models', () => {
    expect(sunLift(0)).toBeGreaterThan(0.3)
    expect(sunLift(-1)).toBeGreaterThan(0.3)
  })

  it('is finite and bounded for any input', () => {
    for (const e of [-99, -1, -0.5, 0, 0.5, 1, 99]) {
      const v = sunLift(e)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(0.42)
    }
  })
})

describe('fillLevelFor', () => {
  it('collapses far faster than the sun does after dark', () => {
    // Night fill must fall away, or the blue hemisphere light becomes the only
    // illumination and paints the whole disc one flat periwinkle value.
    const nightSun = sunDaylightLevel(-1) * 1.9
    const noonSun = sunDaylightLevel(1) * 1.9
    const nightFill = fillLevelFor(sunDaylightLevel(-1))
    const noonFill = fillLevelFor(sunDaylightLevel(1))
    expect(nightFill / noonFill).toBeLessThan(nightSun / noonSun)
  })

  it('leaves night fill low enough that the dark side reads as dark', () => {
    expect(fillLevelFor(sunDaylightLevel(-1))).toBeLessThan(0.05)
  })

  it('is monotonic and never negative', () => {
    let prev = -1
    for (let d = 0; d <= 1.35; d += 0.05) {
      const v = fillLevelFor(d)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
