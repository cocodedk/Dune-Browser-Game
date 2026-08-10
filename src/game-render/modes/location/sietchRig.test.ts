// src/game-render/modes/location/sietchRig.test.ts
import { describe, it, expect } from 'vitest'
import { frustumSizeAt, driftOffset } from './sietchRig'

describe('frustumSizeAt', () => {
  it('computes height from vertical fov and depth', () => {
    // 90deg fov, depth 1 => height = 2 * 1 * tan(45deg) = 2
    const { height } = frustumSizeAt(90, 1, 1)
    expect(height).toBeCloseTo(2, 5)
  })

  it('scales width by aspect', () => {
    const { width, height } = frustumSizeAt(90, 1.6, 1)
    expect(width).toBeCloseTo(height * 1.6, 5)
  })

  it('scales linearly with depth', () => {
    const near = frustumSizeAt(50, 1.6, 5)
    const far = frustumSizeAt(50, 1.6, 10)
    expect(far.height).toBeCloseTo(near.height * 2, 5)
    expect(far.width).toBeCloseTo(near.width * 2, 5)
  })
})

describe('driftOffset', () => {
  const driftM = { x: 3, y: 1.2 }

  it('starts at x = 0, y = driftM.y (cos(0) = 1)', () => {
    const { x, y } = driftOffset(0, driftM)
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(driftM.y, 9)
  })

  it('never exceeds the authored envelope', () => {
    for (let t = 0; t < 200_000; t += 137) {
      const { x, y } = driftOffset(t, driftM)
      expect(Math.abs(x)).toBeLessThanOrEqual(driftM.x + 1e-9)
      expect(Math.abs(y)).toBeLessThanOrEqual(driftM.y + 1e-9)
    }
  })
})
