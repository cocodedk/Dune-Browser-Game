// src/game-render/planet/biomes.test.ts

import { describe, it, expect } from 'vitest'
import { biomeAt } from './biomes'
import type { BiomeId } from './biomes'

/** Sand is the middle of the continental range. */
const SAND = 0.5

describe('biomeAt: which biome wins where', () => {
  it('puts ice at both poles', () => {
    expect(biomeAt(88, SAND).id).toBe('polar')
    expect(biomeAt(-88, SAND).id).toBe('polar')
  })

  it('puts sand across the tropics and mid latitudes', () => {
    for (const lat of [0, 15, -20, 35, -40]) {
      expect(biomeAt(lat, SAND).id).toBe('erg')
    }
  })

  it('puts rock on the continental highs and pans on the lows', () => {
    expect(biomeAt(10, 0.95).id).toBe('rock')
    expect(biomeAt(10, 0.05).id).toBe('pan')
  })

  it('lets latitude beat the continental field at the caps', () => {
    // An upland at the pole is still under ice.
    expect(biomeAt(85, 0.95).id).toBe('polar')
  })
})

describe('biomeAt: relief', () => {
  it('gives rock the most relief and pans the least', () => {
    const rock = biomeAt(10, 0.95).relief
    const erg = biomeAt(10, SAND).relief
    const pan = biomeAt(10, 0.05).relief
    const polar = biomeAt(88, SAND).relief

    expect(rock).toBeGreaterThan(erg)
    expect(erg).toBeGreaterThan(polar)
    expect(polar).toBeGreaterThan(pan)
  })

  it('never returns zero or negative relief', () => {
    // A flat-shaded patch with no relief at all reads as a hole in the mesh.
    for (let lat = -90; lat <= 90; lat += 3) {
      for (let c = 0; c <= 1; c += 0.05) {
        expect(biomeAt(lat, c).relief).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the erg at exactly the tuned baseline', () => {
    // The dune amplitude was tuned against 1.0; if sand drifts off it, every
    // previous terrain judgement silently becomes wrong.
    expect(biomeAt(0, SAND).relief).toBeCloseTo(1, 6)
  })
})

describe('biomeAt: continuity', () => {
  it('never steps hard across latitude', () => {
    // A discontinuity draws a visible ring around the planet.
    let maxJump = 0
    for (let lat = -90; lat < 90; lat += 0.5) {
      const a = biomeAt(lat, SAND)
      const b = biomeAt(lat + 0.5, SAND)
      maxJump = Math.max(maxJump, Math.abs(a.relief - b.relief))
      for (let ch = 0; ch < 3; ch++) {
        maxJump = Math.max(maxJump, Math.abs(a.tint[ch] - b.tint[ch]))
      }
    }
    expect(maxJump).toBeLessThan(0.1)
  })

  it('never steps hard across the continental field', () => {
    let maxJump = 0
    for (let c = 0; c < 1; c += 0.005) {
      const a = biomeAt(12, c)
      const b = biomeAt(12, c + 0.005)
      maxJump = Math.max(maxJump, Math.abs(a.relief - b.relief))
    }
    expect(maxJump).toBeLessThan(0.1)
  })

  it('is symmetric about the equator', () => {
    for (const lat of [12, 45, 70, 89]) {
      expect(biomeAt(lat, SAND)).toEqual(biomeAt(-lat, SAND))
    }
  })
})

describe('biomeAt: tint', () => {
  it('keeps sand untinted so the palette reaches it unchanged', () => {
    const tint = biomeAt(0, SAND).tint
    expect(tint[0]).toBeCloseTo(1, 6)
    expect(tint[1]).toBeCloseTo(1, 6)
    expect(tint[2]).toBeCloseTo(1, 6)
  })

  it('makes ice cool and rock dark', () => {
    const ice = biomeAt(88, SAND).tint
    // Blue lifted well above red is what reads as ice against orange sand.
    expect(ice[2]).toBeGreaterThan(ice[0] * 1.5)

    const rock = biomeAt(10, 0.95).tint
    expect(Math.max(...rock)).toBeLessThan(1)
  })

  it('never returns a negative channel', () => {
    for (let lat = -90; lat <= 90; lat += 5) {
      for (let c = 0; c <= 1; c += 0.1) {
        for (const ch of biomeAt(lat, c).tint) expect(ch).toBeGreaterThan(0)
      }
    }
  })
})

describe('biomeAt: totality', () => {
  it('always names one of the four biomes', () => {
    const valid: BiomeId[] = ['polar', 'erg', 'rock', 'pan']
    for (let lat = -90; lat <= 90; lat += 7) {
      for (let c = 0; c <= 1; c += 0.07) {
        expect(valid).toContain(biomeAt(lat, c).id)
      }
    }
  })

  it('clamps a continental sample that arrives out of range', () => {
    expect(biomeAt(0, -3).id).toBe('pan')
    expect(biomeAt(0, 9).id).toBe('rock')
  })
})
