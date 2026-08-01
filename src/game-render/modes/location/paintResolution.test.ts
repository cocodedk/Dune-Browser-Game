// src/game-render/modes/location/paintResolution.test.ts
// Pure sizing rule — no DOM, no GL.

import { describe, it, expect } from 'vitest'
import {
  paintHeightFor, paintWidthFor,
  MIN_PAINT_HEIGHT, MAX_PAINT_HEIGHT, MAX_PAINT_WIDTH,
} from './paintResolution'

describe('paintHeightFor', () => {
  // The defect: the art was painted at a fixed 1000px tall whatever the window
  // was, then stretched to fill it. A 1440p display upscaled it ~1.4x and a 4K
  // display ~2.2x, so a bigger screen produced a softer picture.
  it('paints more pixels on a taller display, which the fixed size never did', () => {
    expect(paintHeightFor(1440, 1)).toBeGreaterThan(1000)
    expect(paintHeightFor(2160, 1)).toBeGreaterThan(paintHeightFor(1440, 1))
  })

  it('follows the device pixel ratio on a HiDPI screen', () => {
    expect(paintHeightFor(900, 2)).toBeGreaterThan(paintHeightFor(900, 1))
  })

  it('never drops below what it used to paint', () => {
    for (const h of [0, 200, 600, 900, 1000]) {
      expect(paintHeightFor(h, 1)).toBeGreaterThanOrEqual(MIN_PAINT_HEIGHT)
    }
  })

  it('stays inside a texture size every GL2 device is guaranteed to allow', () => {
    for (const [h, r] of [[2160, 2], [4320, 3], [1440, 4]] as const) {
      expect(paintHeightFor(h, r)).toBeLessThanOrEqual(MAX_PAINT_HEIGHT)
    }
  })

  it('ignores nonsense ratios rather than producing a nonsense canvas', () => {
    expect(paintHeightFor(900, 0)).toBeGreaterThanOrEqual(MIN_PAINT_HEIGHT)
    expect(paintHeightFor(900, -3)).toBeGreaterThanOrEqual(MIN_PAINT_HEIGHT)
    expect(Number.isFinite(paintHeightFor(900, 0))).toBe(true)
  })
})

describe('paintWidthFor', () => {
  it('matches the view aspect', () => {
    expect(paintWidthFor(1000, 16 / 9)).toBe(1778)
    expect(paintWidthFor(1000, 1)).toBe(1000)
  })

  it('caps an ultrawide rather than asking for a canvas no GPU promises', () => {
    expect(paintWidthFor(2048, 21 / 9)).toBeLessThanOrEqual(MAX_PAINT_WIDTH)
    expect(paintWidthFor(2048, 32 / 9)).toBe(MAX_PAINT_WIDTH)
  })

  it('survives a degenerate aspect', () => {
    for (const a of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const w = paintWidthFor(1000, a)
      expect(Number.isFinite(w)).toBe(true)
      expect(w).toBeGreaterThan(0)
    }
  })
})
