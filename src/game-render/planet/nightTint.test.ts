// src/game-render/planet/nightTint.test.ts
// Split from biomes.test.ts to keep that file under the 200-line cap.

import { describe, it, expect } from 'vitest'
import { biomeAt, nightTint } from './biomes'

/** Sand is the middle of the continental range. */
const SAND = 0.5

describe('nightTint', () => {
  const day = biomeAt(0, SAND).tint

  it('leaves a fully lit tint untouched', () => {
    expect(nightTint(day, 0)).toEqual([...day])
  })

  it('is cooler than day: blue rises relative to red as night deepens', () => {
    const ratio = (t: readonly number[]): number => t[2] / t[0]
    expect(ratio(nightTint(day, 1))).toBeGreaterThan(ratio(day))
    expect(ratio(nightTint(day, 1))).toBeGreaterThan(ratio(nightTint(day, 0.3)))
  })

  it('is monotonic in amount', () => {
    const ratio = (t: readonly number[]): number => t[2] / t[0]
    let previous = -Infinity
    for (let a = 0; a <= 1; a += 0.1) {
      const r = ratio(nightTint(day, a))
      expect(r).toBeGreaterThanOrEqual(previous - 1e-9)
      previous = r
    }
  })

  it('clamps amount outside 0..1', () => {
    expect(nightTint(day, -5)).toEqual([...day])
    expect(nightTint(day, 5)).toEqual(nightTint(day, 1))
  })

  it('never returns a negative channel, on any biome', () => {
    for (const c of [0.05, 0.5, 0.95]) {
      for (const lat of [0, 40, 80]) {
        for (const ch of nightTint(biomeAt(lat, c).tint, 1)) {
          expect(ch).toBeGreaterThan(0)
        }
      }
    }
  })
})
