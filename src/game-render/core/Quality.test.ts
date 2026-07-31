// src/game-render/core/Quality.test.ts

import { describe, it, expect } from 'vitest'
import { selectTier, resolveQuality } from './Quality'

// ---------------------------------------------------------------------------
// selectTier — core-count boundaries
// ---------------------------------------------------------------------------

describe('selectTier: core boundaries', () => {
  it('picks low at or below 2 cores', () => {
    expect(selectTier({ cores: 1, devicePixelRatio: 1 })).toBe('low')
    expect(selectTier({ cores: 2, devicePixelRatio: 1 })).toBe('low')
  })

  it('picks medium from 3 to 6 cores', () => {
    expect(selectTier({ cores: 3, devicePixelRatio: 1 })).toBe('medium')
    expect(selectTier({ cores: 6, devicePixelRatio: 1 })).toBe('medium')
  })

  it('picks high above 6 cores', () => {
    expect(selectTier({ cores: 7, devicePixelRatio: 1 })).toBe('high')
    expect(selectTier({ cores: 16, devicePixelRatio: 2 })).toBe('high')
  })

  it('treats unknown core count as mid-range rather than worst case', () => {
    expect(selectTier({ cores: 0, devicePixelRatio: 1 })).toBe('medium')
  })
})

// ---------------------------------------------------------------------------
// selectTier — measured performance overrides spec
// ---------------------------------------------------------------------------

describe('selectTier: first-frame measurement', () => {
  it('demotes to low on a slow first frame despite many cores', () => {
    expect(selectTier({ cores: 16, devicePixelRatio: 1, firstFrameMs: 51 })).toBe('low')
  })

  it('does not demote on a fast first frame', () => {
    expect(selectTier({ cores: 16, devicePixelRatio: 1, firstFrameMs: 8 })).toBe('high')
  })

  it('treats exactly 50ms as acceptable', () => {
    expect(selectTier({ cores: 16, devicePixelRatio: 1, firstFrameMs: 50 })).toBe('high')
  })
})

// ---------------------------------------------------------------------------
// selectTier — high-DPR fill-rate guard
// ---------------------------------------------------------------------------

describe('selectTier: high-DPR guard', () => {
  it('demotes a very high DPR screen to medium', () => {
    expect(selectTier({ cores: 16, devicePixelRatio: 3 })).toBe('medium')
  })

  it('leaves DPR 2 alone', () => {
    expect(selectTier({ cores: 16, devicePixelRatio: 2 })).toBe('high')
  })
})

// ---------------------------------------------------------------------------
// resolveQuality
// ---------------------------------------------------------------------------

describe('resolveQuality', () => {
  it('caps pixel ratio per tier', () => {
    expect(resolveQuality({ cores: 1, devicePixelRatio: 3 }).pixelRatio).toBe(1)
    expect(resolveQuality({ cores: 4, devicePixelRatio: 3 }).pixelRatio).toBe(1.5)
    expect(resolveQuality({ cores: 16, devicePixelRatio: 2 }).pixelRatio).toBe(2)
  })

  it('never raises pixel ratio above the device value', () => {
    expect(resolveQuality({ cores: 16, devicePixelRatio: 1 }).pixelRatio).toBe(1)
  })

  it('drops bloom and grain only on low', () => {
    expect(resolveQuality({ cores: 1, devicePixelRatio: 1 }).bloom).toBe(false)
    expect(resolveQuality({ cores: 1, devicePixelRatio: 1 }).grain).toBe(false)
    expect(resolveQuality({ cores: 4, devicePixelRatio: 1 }).bloom).toBe(true)
  })

  it('keeps the colour grade on every tier — it carries the art direction', () => {
    for (const cores of [1, 4, 16]) {
      expect(resolveQuality({ cores, devicePixelRatio: 1 }).colorGrade).toBe(true)
    }
  })

  it('scales terrain resolution with tier', () => {
    // Asserted as an ordering rather than three magic numbers: the absolute
    // values track WORLD_SIZE and get retuned whenever the terrain is resized,
    // but "a better machine never gets coarser terrain" must always hold.
    const low = resolveQuality({ cores: 1, devicePixelRatio: 1 }).terrainResolution
    const medium = resolveQuality({ cores: 4, devicePixelRatio: 1 }).terrainResolution
    const high = resolveQuality({ cores: 16, devicePixelRatio: 1 }).terrainResolution

    expect(low).toBeLessThan(medium)
    expect(medium).toBeLessThan(high)
    // Below about 128 samples a side the dunes stop reading as dunes at all.
    expect(low).toBeGreaterThanOrEqual(128)
  })
})
