// src/game-render/materials/sandTextures.test.ts

import { describe, it, expect } from 'vitest'
import {
  clamp01,
  encodeNormal,
  getSandTextures,
  heightToNormal,
  periodicNoise,
  rippleAO,
  rippleHeight,
  rippleRoughness,
  rippleWave,
  windWavevector,
  RIPPLE_DEFAULTS,
} from './sandTextures'

describe('clamp01', () => {
  it('holds within [0,1] and clamps outside it', () => {
    expect(clamp01(0.4)).toBeCloseTo(0.4, 6)
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
  })
})

describe('heightToNormal', () => {
  it('returns the neutral up normal for a flat field', () => {
    const [nx, ny, nz] = heightToNormal(1, 1, 1, 1, 2)
    expect(nx).toBeCloseTo(0, 6)
    expect(ny).toBeCloseTo(0, 6)
    expect(nz).toBeCloseTo(1, 6)
  })

  it('tilts away from a rise along x', () => {
    const [nx, ny, nz] = heightToNormal(0, 2, 1, 1, 1)
    expect(nx).toBeLessThan(0)
    expect(ny).toBeCloseTo(0, 6)
    expect(nz).toBeGreaterThan(0)
  })

  it('tilts away from a rise along y', () => {
    const [nx, ny, nz] = heightToNormal(1, 1, 0, 2, 1)
    expect(nx).toBeCloseTo(0, 6)
    expect(ny).toBeLessThan(0)
    expect(nz).toBeGreaterThan(0)
  })

  it('always returns a unit vector', () => {
    const n = heightToNormal(0.2, 0.9, 0.1, 0.7, 3)
    const len = Math.hypot(n[0], n[1], n[2])
    expect(len).toBeCloseTo(1, 6)
  })
})

describe('encodeNormal', () => {
  it('maps straight up to mid-grey/mid-grey/full blue', () => {
    const [r, g, b] = encodeNormal([0, 0, 1])
    expect(r).toBeCloseTo(0.5, 6)
    expect(g).toBeCloseTo(0.5, 6)
    expect(b).toBeCloseTo(1, 6)
  })

  it('maps -1 on an axis to 0', () => {
    expect(encodeNormal([-1, 0, 0])[0]).toBeCloseTo(0, 6)
  })
})

describe('rippleRoughness', () => {
  it('stays within [0,1] across the height range', () => {
    for (let h = 0; h <= 1; h += 0.05) {
      const r = rippleRoughness(h, 0.85, 0.3)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
    }
  })

  it('makes crests smoother than troughs — the raking-light correlation', () => {
    const crest = rippleRoughness(1, 0.85, 0.3)
    const trough = rippleRoughness(0, 0.85, 0.3)
    expect(crest).toBeLessThan(trough)
  })
})

describe('rippleAO', () => {
  it('leaves crests full-bright and darkens troughs', () => {
    expect(rippleAO(1, 0.25)).toBeCloseTo(1, 6)
    expect(rippleAO(0, 0.25)).toBeCloseTo(0.75, 6)
  })

  it('stays within [0,1] for any strength in range', () => {
    expect(rippleAO(0, 1)).toBeGreaterThanOrEqual(0)
    expect(rippleAO(1, 1)).toBeLessThanOrEqual(1)
  })
})

describe('rippleWave', () => {
  it('starts at 0 and rises through the windward face', () => {
    expect(rippleWave(0, 0.3)).toBeCloseTo(0, 6)
    expect(rippleWave(0.2, 0.3)).toBeGreaterThan(0)
  })

  it('peaks near 1 at the crest, just before the lee face', () => {
    expect(rippleWave(0.7 - 1e-6, 0.3)).toBeGreaterThan(0.99)
  })

  it('stays within [0,1] and is periodic in whole cycles', () => {
    for (let p = -2; p < 3; p += 0.13) {
      const v = rippleWave(p, 0.3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    expect(rippleWave(0.4, 0.3)).toBeCloseTo(rippleWave(1.4, 0.3), 6)
  })
})

describe('windWavevector', () => {
  it('aligns to an axis-aligned wind', () => {
    expect(windWavevector([1, 0], 40)).toEqual([40, 0])
    expect(windWavevector([0, 1], 40)).toEqual([0, 40])
  })

  it('never returns the zero vector, even for a zero-length wind', () => {
    const [kx, ky] = windWavevector([0, 0], 40)
    expect(kx !== 0 || ky !== 0).toBe(true)
  })
})

describe('periodicNoise', () => {
  it('stays within [0,1]', () => {
    for (let x = 0; x < 3; x += 0.31) {
      for (let y = 0; y < 3; y += 0.37) {
        const n = periodicNoise(x, y, 4)
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(1)
      }
    }
  })

  it('tiles seamlessly: shifting by one period repeats the value', () => {
    expect(periodicNoise(1.7, 2.3, 5)).toBeCloseTo(periodicNoise(6.7, 7.3, 5), 6)
  })
})

describe('rippleHeight', () => {
  it('produces finite values across the unit tile', () => {
    for (let u = 0; u < 1; u += 0.1) {
      for (let v = 0; v < 1; v += 0.1) {
        expect(Number.isFinite(rippleHeight(u, v, RIPPLE_DEFAULTS))).toBe(true)
      }
    }
  })

  it('tiles seamlessly across a whole-tile shift', () => {
    const a = rippleHeight(0.42, 0.17, RIPPLE_DEFAULTS)
    const b = rippleHeight(1.42, 0.17, RIPPLE_DEFAULTS)
    expect(a).toBeCloseTo(b, 6)
  })
})

describe('getSandTextures', () => {
  it('degrades to null headlessly instead of throwing (no canvas in Vitest)', () => {
    expect(getSandTextures()).toBeNull()
    expect(getSandTextures({ size: 64, repeat: 10 })).toBeNull()
  })
})
