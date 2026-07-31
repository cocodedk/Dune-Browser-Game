// src/game-render/planet/reliefShading.test.ts

import { describe, it, expect } from 'vitest'
import { createNoiseField } from '../terrain/noise'
import { clampedRelief, slopeAt, terrainShade, SILHOUETTE_CAP } from './reliefShading'
import { surfaceHeight } from './planetField'
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

describe('terrainShade over the real field', () => {
  // The properties the constants were actually tuned against. Every other test
  // here is qualitative — crest brighter than trough, output inside the clamp
  // band — and all of them pass just as happily on a distribution so narrow the
  // planet paints one flat colour, which is the state this replaced.
  //
  // Sampled, terrainShade previously ran p10 0.733 / p50 0.834 / p90 0.928: a
  // span of 0.195 inside a permitted 0.55..1.3, so neither clamp ever bound.
  // On the rendered disc that showed as fine-scale contrast of 1.3% of mean at
  // noon, when the sun sits behind the camera and only albedo can carry the
  // picture.
  const shades: number[] = (() => {
    const field = createNoiseField(20250727)
    const out: number[] = []
    for (let iy = 0; iy < 40; iy++) {
      for (let ix = 0; ix < 80; ix++) {
        const lat = ((iy + 0.5) / 40) * Math.PI - Math.PI / 2
        const lon = ((ix + 0.5) / 80) * Math.PI * 2
        const x = Math.cos(lat) * Math.cos(lon)
        const y = Math.sin(lat)
        const z = Math.cos(lat) * Math.sin(lon)
        out.push(terrainShade(surfaceHeight(field, x, y, z), slopeAt(field, x, y, z)))
      }
    }
    return out.sort((a, b) => a - b)
  })()

  const at = (p: number) => shades[Math.min(shades.length - 1, Math.floor((p / 100) * shades.length))]

  it('spreads widely enough for the erg to read at full phase', () => {
    expect(at(90) - at(10)).toBeGreaterThan(0.28)
  })

  it('keeps the planet as bright as it was while spreading', () => {
    // The trap the first attempt fell into: raising the gains alone widened the
    // span but dragged the median from 0.834 to 0.718 and pushed p10 onto the
    // floor, dimming Arrakis instead of giving it contrast.
    expect(at(50)).toBeGreaterThan(0.78)
    expect(at(50)).toBeLessThan(0.92)
  })

  it('rarely saturates either clamp, so the range is spent on detail', () => {
    const pinned = shades.filter(s => s <= 0.5501 || s >= 1.2999).length
    expect(pinned / shades.length).toBeLessThan(0.05)
  })
})
