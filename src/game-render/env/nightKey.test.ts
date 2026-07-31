// src/game-render/env/nightKey.test.ts
// Pure math — every export takes plain numbers and returns plain numbers.

import { describe, it, expect } from 'vitest'
import {
  moonShare,
  keyAltitude,
  keyAzimuth,
  keyColor,
  keyIntensity,
  MOON_ALTITUDE,
  MOON_AZIMUTH_OFFSET,
  MOON_COLOR,
  MOON_FULL_DEPTH,
  MOON_INTENSITY,
} from './nightKey'
import { sunIntensityFor } from './Lighting'

describe('moonShare', () => {
  it('is zero whenever the sun is up', () => {
    for (let e = 0; e <= 1; e += 0.1) expect(moonShare(e)).toBe(0)
  })

  it('is fully moonlit once the sun is MOON_FULL_DEPTH under', () => {
    expect(moonShare(-MOON_FULL_DEPTH)).toBe(1)
    expect(moonShare(-1)).toBe(1)
  })

  it('ramps rather than steps, so the key does not teleport at sunset', () => {
    const mid = moonShare(-MOON_FULL_DEPTH / 2)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })
})

describe('keyAltitude', () => {
  // The actual bug this module exists for. applyPalette used
  // `max(elevation, -0.25)`, putting the key light a quarter of the way under
  // the sand at night: N dot L is negative for every up-facing grain, so the
  // direct term was exactly zero and the measured desert foreground came out at
  // mean luma 3.4 with 41% of its pixels at pure black.
  // Stepped finely on purpose. At 0.05 this passed over the one window where
  // the first version of keyAltitude actually failed — the first degree after
  // sunset, where it returned -0.005 — and reported the fix as working.
  it('never puts the key light below the horizon, at any hour', () => {
    for (let e = -1; e <= 1; e += 0.002) {
      expect(keyAltitude(e)).toBeGreaterThanOrEqual(0)
    }
  })

  it('leaves the daytime sun exactly where it was', () => {
    for (let e = 0; e <= 1; e += 0.1) expect(keyAltitude(e)).toBeCloseTo(e, 10)
  })

  it('rides at the moons’ altitude through full night', () => {
    expect(keyAltitude(-MOON_FULL_DEPTH)).toBeCloseTo(MOON_ALTITUDE, 10)
    expect(keyAltitude(-1)).toBeCloseTo(MOON_ALTITUDE, 10)
  })

  it('climbs monotonically as the sun sinks past the horizon', () => {
    let prev = keyAltitude(0)
    for (let e = -0.01; e >= -MOON_FULL_DEPTH; e -= 0.01) {
      const now = keyAltitude(e)
      expect(now).toBeGreaterThanOrEqual(prev)
      prev = now
    }
  })
})

describe('keyIntensity', () => {
  it('leaves daylight untouched', () => {
    for (let e = 0; e <= 1; e += 0.1) {
      expect(keyIntensity(sunIntensityFor(e), e)).toBeCloseTo(sunIntensityFor(e), 10)
    }
  })

  it('settles at the moon level through full night', () => {
    expect(keyIntensity(sunIntensityFor(-1), -1)).toBeCloseTo(MOON_INTENSITY, 10)
  })

  // Night stays a night: the moons never approach the sun once it is properly
  // up. Deliberately NOT asserted against SUN_NIGHT_FLOOR — an earlier version
  // of this test did exactly that, on the reasoning that a lifted key would
  // outshine dusk, and the rendered frames disagreed. Dusk's key stands at
  // altitude 0.01, so dusk is almost entirely ambient and there was no headroom
  // to defend; a moon under that floor left the desert at mean luma 5.0.
  it('stays far below daylight', () => {
    expect(MOON_INTENSITY).toBeLessThan(sunIntensityFor(0.1))
    expect(keyIntensity(sunIntensityFor(-1), -1))
      .toBeLessThan(keyIntensity(sunIntensityFor(0.4), 0.4))
  })

  it('never returns a negative or non-finite value', () => {
    for (let e = -1; e <= 1; e += 0.1) {
      const v = keyIntensity(sunIntensityFor(e), e)
      expect(v).toBeGreaterThan(0)
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('keyColor', () => {
  const DAY_SUN: [number, number, number] = [1, 0.93, 0.78]

  it('leaves the daytime sun colour alone', () => {
    expect(keyColor(DAY_SUN, 0.5)).toEqual(DAY_SUN)
  })

  // The other half of the measured failure: the captured midnight foreground
  // was (4, 3, 4), a neutral grey rather than a night. A dim cool fill times
  // warm sand albedo cancels to no hue, so the key itself has to carry the blue.
  it('is decisively blue at night, not merely dim', () => {
    const night = keyColor([0.28, 0.32, 0.55], -1)
    expect(night).toEqual([...MOON_COLOR])
    expect(night[2]).toBeGreaterThan(night[0] * 2)
  })
})

describe('keyAzimuth', () => {
  it('leaves the daytime bearing alone', () => {
    expect(keyAzimuth(1.2, 0.5)).toBeCloseTo(1.2, 10)
  })

  it('swings to the moons’ bearing after dark, so night is not a dimmer', () => {
    expect(keyAzimuth(1.2, -1)).toBeCloseTo(1.2 + MOON_AZIMUTH_OFFSET, 10)
  })
})
