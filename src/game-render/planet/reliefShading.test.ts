// src/game-render/planet/reliefShading.test.ts

import { describe, it, expect } from 'vitest'
import { createNoiseField } from '../terrain/noise'
import { clampedRelief, slopeAt, terrainShade, SILHOUETTE_CAP } from './reliefShading'
import type { NoiseField } from '../terrain/noise'

describe('clampedRelief', () => {
  it('passes small displacement through unchanged', () => {
    expect(clampedRelief(0.5, 0.015, 1)).toBeCloseTo(0.0075, 9)
  })

  it('clamps to the silhouette cap on the high side', () => {
    expect(clampedRelief(1.2, 0.015, 2.05)).toBe(SILHOUETTE_CAP)
  })

  it('clamps symmetrically on the low side', () => {
    expect(clampedRelief(-1.2, 0.015, 2.05)).toBe(-SILHOUETTE_CAP)
  })

  it('never exceeds the cap across a wide sweep of inputs', () => {
    for (let h = -2; h <= 2; h += 0.2) {
      for (const biomeRelief of [0.16, 0.2, 1, 2.05]) {
        const disp = clampedRelief(h, 0.015, biomeRelief)
        expect(Math.abs(disp)).toBeLessThanOrEqual(SILHOUETTE_CAP + 1e-12)
      }
    }
  })
})

describe('slopeAt', () => {
  // A field whose warpedFbm/fbm always answer 0 makes surfaceHeight a fixed
  // constant regardless of position — the one input where "no slope
  // anywhere" is known analytically rather than eyeballed off a real field.
  const flatField: NoiseField = {
    noise2D: () => 0,
    fbm: () => 0,
    warpedFbm: () => 0,
  }

  it('is exactly zero on a perfectly flat height field', () => {
    expect(slopeAt(flatField, 1, 0, 0)).toBe(0)
    expect(slopeAt(flatField, 0, 1, 0)).toBe(0)
    expect(slopeAt(flatField, 0.3, 0.5, 0.8)).toBe(0)
  })

  it('is finite and non-negative on the real seeded field', () => {
    const field = createNoiseField(20250727)
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lon = -180; lon < 180; lon += 15) {
        const rad = (deg: number): number => (deg * Math.PI) / 180
        const cl = Math.cos(rad(lat))
        const x = cl * Math.cos(rad(lon))
        const y = Math.sin(rad(lat))
        const z = cl * Math.sin(rad(lon))
        const slope = slopeAt(field, x, y, z)
        expect(Number.isFinite(slope)).toBe(true)
        expect(slope).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('terrainShade', () => {
  it('brightens crests and darkens troughs at zero slope', () => {
    const trough = terrainShade(0.3, 0)
    const crest = terrainShade(1.2, 0)
    expect(crest).toBeGreaterThan(1)
    expect(trough).toBeLessThan(1)
    expect(crest).toBeGreaterThan(trough)
  })

  it('darkens as slope steepens, holding height fixed', () => {
    const gentle = terrainShade(0.9, 0)
    const steep = terrainShade(0.9, 20)
    expect(steep).toBeLessThan(gentle)
  })

  it('never leaves its own clamp band', () => {
    for (let h = -1; h <= 2; h += 0.1) {
      for (let slope = 0; slope <= 30; slope += 2) {
        const shade = terrainShade(h, slope)
        expect(shade).toBeGreaterThanOrEqual(0.55)
        expect(shade).toBeLessThanOrEqual(1.3)
      }
    }
  })
})
