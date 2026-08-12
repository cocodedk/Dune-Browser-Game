// src/game-engine/rng/rng.distribution.test.ts
// int()/pick() bounds and coverage, plus a chi-square-ish distribution
// sanity check over 10k draws / 10 buckets for both next() and int().
// See rng.test.ts for determinism, snapshot/restore, and step accounting.

import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

/** Pearson chi-square statistic against a uniform expectation. */
function chiSquare(counts: number[], expectedPerBucket: number): number {
  return counts.reduce((sum, c) => sum + (c - expectedPerBucket) ** 2 / expectedPerBucket, 0)
}

// 9 degrees of freedom (10 buckets); the p=0.001 critical value is ~27.9.
// A healthy generator lands near 9 (the expected value of chi2 with 9 dof);
// 40 gives ample margin while still catching real bias (a broken generator
// typically scores in the hundreds).
const CHI_SQUARE_SANITY_LIMIT = 40

describe('int() bounds', () => {
  it('stays within [0, maxExclusive) across many draws and bounds', () => {
    const rng = createRng({ seed: 314, step: 0 })
    for (const max of [1, 2, 3, 7, 100, 1000]) {
      for (let i = 0; i < 200; i++) {
        const v = rng.int(max)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(max)
        expect(Number.isInteger(v)).toBe(true)
      }
    }
  })

  it('int(1) always returns 0', () => {
    const rng = createRng({ seed: 9, step: 0 })
    for (let i = 0; i < 20; i++) {
      expect(rng.int(1)).toBe(0)
    }
  })

  it('rejects a non-positive bound', () => {
    const rng = createRng({ seed: 1, step: 0 })
    expect(() => rng.int(0)).toThrow()
    expect(() => rng.int(-5)).toThrow()
  })
})

describe('pick() coverage', () => {
  it('returns only items from the array and reaches every item given enough draws', () => {
    const items = ['spice', 'water', 'melange', 'plastic'] as const
    const rng = createRng({ seed: 271, step: 0 })
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const picked = rng.pick(items)
      expect(items).toContain(picked)
      seen.add(picked)
    }
    expect(seen.size).toBe(items.length)
  })

  it('rejects an empty array', () => {
    const rng = createRng({ seed: 1, step: 0 })
    expect(() => rng.pick([])).toThrow()
  })
})

describe('distribution sanity', () => {
  it('next() spreads roughly evenly across 10 buckets over 10k draws', () => {
    const rng = createRng({ seed: 4242, step: 0 })
    const buckets = new Array(10).fill(0)
    const draws = 10_000
    for (let i = 0; i < draws; i++) {
      const v = rng.next()
      const bucket = Math.min(9, Math.floor(v * 10))
      buckets[bucket]++
    }
    expect(chiSquare(buckets, draws / 10)).toBeLessThan(CHI_SQUARE_SANITY_LIMIT)
  })

  it('int(10) spreads roughly evenly across its 10 outcomes over 10k draws', () => {
    // A different seed than the next() case above: hashToInt and
    // hashToUnitFloat both read the hash's top bits, so reusing seed 4242
    // here would replay the exact same bucket assignment instead of an
    // independent sample.
    const rng = createRng({ seed: 8080, step: 0 })
    const buckets = new Array(10).fill(0)
    const draws = 10_000
    for (let i = 0; i < draws; i++) {
      buckets[rng.int(10)]++
    }
    expect(chiSquare(buckets, draws / 10)).toBeLessThan(CHI_SQUARE_SANITY_LIMIT)
  })
})
