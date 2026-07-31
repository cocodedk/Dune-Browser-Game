// src/game-render/core/orthoFit.test.ts

import { describe, it, expect } from 'vitest'
import { fitOrtho, canvasToFrame } from './orthoFit'

const W = 1600
const H = 1000

describe('fitOrtho', () => {
  it('holds the authored height and follows the window width', () => {
    const fit = fitOrtho(W, H, 2560, 1080)
    expect(fit.viewHeight).toBe(H)
    expect(fit.viewWidth / fit.viewHeight).toBeCloseTo(2560 / 1080, 6)
  })

  it('is exactly the frame when the window matches it', () => {
    const fit = fitOrtho(W, H, 1600, 1000)
    expect(fit.viewWidth).toBeCloseTo(W, 6)
    expect(fit.coverScale).toBeCloseTo(1, 6)
  })

  it('covers rather than letterboxes, at every shape', () => {
    // A backdrop must never resolve into bars.
    for (const [cw, ch] of [[2560, 1080], [1920, 1080], [1280, 1024], [900, 1600]]) {
      const fit = fitOrtho(W, H, cw, ch)
      expect(W * fit.coverScale).toBeGreaterThanOrEqual(fit.viewWidth - 1e-6)
      expect(H * fit.coverScale).toBeGreaterThanOrEqual(fit.viewHeight - 1e-6)
    }
  })

  it('survives a zero-sized canvas', () => {
    // Happens for a frame or two on mount and on a hidden tab; NaN bounds
    // would blank the screen.
    const fit = fitOrtho(W, H, 0, 0)
    expect(Number.isFinite(fit.viewWidth)).toBe(true)
    expect(Number.isFinite(fit.coverScale)).toBe(true)
    expect(fit.coverScale).toBeGreaterThan(0)
  })
})

describe('canvasToFrame', () => {
  it('maps the centre to the centre at any window shape', () => {
    for (const [cw, ch] of [[1600, 1000], [2560, 1080], [900, 1600]]) {
      const fit = fitOrtho(W, H, cw, ch)
      const p = canvasToFrame(fit, W, H, 0.5, 0.5)
      expect(p.fx).toBeCloseTo(0.5, 6)
      expect(p.fy).toBeCloseTo(0.5, 6)
    }
  })

  it('flips y so callers get bottom-origin frame coordinates', () => {
    const fit = fitOrtho(W, H, 1600, 1000)
    // Pointer near the top of the canvas is near the top of the frame, which
    // is a *high* y in hotspot terms.
    expect(canvasToFrame(fit, W, H, 0.5, 0.1).fy).toBeGreaterThan(0.5)
    expect(canvasToFrame(fit, W, H, 0.5, 0.9).fy).toBeLessThan(0.5)
  })

  it('is the exact inverse of where a hotspot is drawn', () => {
    // The property that keeps labels and their hit targets together.
    for (const [cw, ch] of [[1600, 1000], [2560, 1080], [1920, 1080], [900, 1600]]) {
      const fit = fitOrtho(W, H, cw, ch)
      for (const [fx, fy] of [[0.5, 0.42], [0.5, 0.12], [0.74, 0.36]]) {
        // Forward: where the authored point lands on the canvas.
        const spanX = (W * fit.coverScale) / fit.viewWidth
        const spanY = (H * fit.coverScale) / fit.viewHeight
        const nx = 0.5 + (fx - 0.5) * spanX
        const ny = 0.5 - (fy - 0.5) * spanY
        const back = canvasToFrame(fit, W, H, nx, ny)
        expect(back.fx).toBeCloseTo(fx, 6)
        expect(back.fy).toBeCloseTo(fy, 6)
      }
    }
  })
})
