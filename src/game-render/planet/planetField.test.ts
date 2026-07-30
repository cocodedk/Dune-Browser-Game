// src/game-render/planet/planetField.test.ts

import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { createNoiseField } from '../terrain/noise'
import { surfaceHeight, biomeFor } from './planetField'
import { latLonToVec3 } from './sphere'
import type { BiomeId } from './biomes'

const SEEDS = [20250727, 4242, 99]

function unitAt(lat: number, lon: number): Vector3 {
  const v = latLonToVec3({ lat, lon }, 1)
  return new Vector3(v.x, v.y, v.z)
}

describe('surfaceHeight', () => {
  it('is finite everywhere on the sphere', () => {
    const field = createNoiseField(SEEDS[0])
    for (let lat = -90; lat <= 90; lat += 15) {
      for (let lon = -180; lon < 180; lon += 20) {
        const u = unitAt(lat, lon)
        expect(Number.isFinite(surfaceHeight(field, u.x, u.y, u.z))).toBe(true)
      }
    }
  })

  it('carries detail finer than the original dune/ridge terms alone produce', () => {
    // Two samples 1.4 degrees apart — about one vertex width at the globe's
    // 256-segment tier. The threshold is set from measurement, not intuition:
    // reconstructing the pre-wave-2 surfaceHeight and running these same
    // sample points yields 0.070, so the 0.02 this test originally used
    // passed comfortably on the OLD field and certified nothing — delete the
    // micro and chains layers and it would still have gone green. The new
    // field reaches 0.176, so 0.1 sits clear of the old behaviour and below
    // the new, which is what makes it a real guard.
    const field = createNoiseField(SEEDS[0])
    let maxFineDelta = 0
    for (let lat = -60; lat <= 60; lat += 10) {
      for (let lon = -170; lon < 180; lon += 15) {
        const a = unitAt(lat, lon)
        const b = unitAt(lat, lon + 1.4)
        const ha = surfaceHeight(field, a.x, a.y, a.z)
        const hb = surfaceHeight(field, b.x, b.y, b.z)
        maxFineDelta = Math.max(maxFineDelta, Math.abs(ha - hb))
      }
    }
    expect(maxFineDelta).toBeGreaterThan(0.1)
  })

  it('roughens the rock provinces more than the open erg', () => {
    // Mountain chains are masked onto continental highs; if that mask is
    // doing anything, nearby-point height deltas should average higher on
    // rock than on sand.
    const field = createNoiseField(SEEDS[0])
    const rockDeltas: number[] = []
    const ergDeltas: number[] = []
    for (let lat = -80; lat <= 80; lat += 4) {
      for (let lon = -180; lon < 180; lon += 6) {
        const a = unitAt(lat, lon)
        const b = unitAt(lat, lon + 2)
        const biome = biomeFor(field, a, [])
        const delta = Math.abs(
          surfaceHeight(field, a.x, a.y, a.z) - surfaceHeight(field, b.x, b.y, b.z),
        )
        if (biome.id === 'rock') rockDeltas.push(delta)
        else if (biome.id === 'erg') ergDeltas.push(delta)
      }
    }
    const mean = (xs: number[]): number => xs.reduce((sum, x) => sum + x, 0) / xs.length
    expect(rockDeltas.length).toBeGreaterThan(5)
    expect(ergDeltas.length).toBeGreaterThan(5)
    expect(mean(rockDeltas)).toBeGreaterThan(mean(ergDeltas))
  })
})

describe('biomeFor: every biome is reachable from the real noise field', () => {
  it('produces polar, erg, rock and pan when sampled across the whole sphere', () => {
    // The regression this guards against: fBm clusters near its mean, so a
    // threshold chosen against an assumed uniform distribution can end up
    // never firing against continentalAt's *actual* output. Sampling
    // synthetic continental values (biomes.test.ts) cannot catch that — only
    // driving biomeFor from the real field, as PlanetMesh does, can.
    for (const seed of SEEDS) {
      const field = createNoiseField(seed)
      const seen = new Set<BiomeId>()
      for (let lat = -85; lat <= 85; lat += 3) {
        for (let lon = -180; lon < 180; lon += 4) {
          seen.add(biomeFor(field, unitAt(lat, lon), []).id)
        }
      }
      const missing = (['polar', 'erg', 'rock', 'pan'] as BiomeId[]).filter(id => !seen.has(id))
      expect(missing).toEqual([])
    }
  })
})
