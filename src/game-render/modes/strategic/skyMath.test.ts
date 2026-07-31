// src/game-render/modes/strategic/skyMath.test.ts

import { describe, it, expect } from 'vitest'
import { heightFogFactor, yawToFaceAzimuth, SURFACE_SUN_AZIMUTH } from './skyMath'

describe('heightFogFactor', () => {
  it('is 1 at ground level', () => {
    expect(heightFogFactor(0, 124)).toBeCloseTo(1, 10)
  })

  it('decays to ~37% a full heightScale up — the exp(-1) point cited in the comment', () => {
    expect(heightFogFactor(124, 124)).toBeCloseTo(Math.exp(-1), 10)
  })

  it('is monotonically decreasing with height', () => {
    let previous = heightFogFactor(0, 124)
    for (let y = 20; y <= 300; y += 20) {
      const current = heightFogFactor(y, 124)
      expect(current).toBeLessThan(previous)
      previous = current
    }
  })

  it('clamps negative world height to the ground-level factor — a below-zero ground plane must not un-fog', () => {
    expect(heightFogFactor(-50, 124)).toBeCloseTo(1, 10)
  })

  it('stays in (0, 1] for any sane input', () => {
    for (const y of [0, 1, 50, 124, 500, 5000]) {
      const f = heightFogFactor(y, 124)
      expect(f).toBeGreaterThan(0)
      expect(f).toBeLessThanOrEqual(1)
    }
  })
})

describe('yawToFaceAzimuth', () => {
  /** Mirrors CameraRig.apply()'s own horizontal forward-vector formula. */
  function forwardXZ(yaw: number): [number, number] {
    return [-Math.sin(yaw), -Math.cos(yaw)]
  }

  it('points the camera forward vector at the requested azimuth', () => {
    for (const azimuth of [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI, -Math.PI * 0.6]) {
      const yaw = yawToFaceAzimuth(azimuth)
      const [fx, fz] = forwardXZ(yaw)
      expect(fx).toBeCloseTo(Math.cos(azimuth), 10)
      expect(fz).toBeCloseTo(Math.sin(azimuth), 10)
    }
  })

  it('aligns the surface view default with SURFACE_SUN_AZIMUTH', () => {
    const yaw = yawToFaceAzimuth(SURFACE_SUN_AZIMUTH)
    const [fx, fz] = forwardXZ(yaw)
    // Dot product of the (unit) forward vector with the (unit) sun-bearing
    // vector must be ~1: parallel, not just "somewhere in the hemisphere".
    const dot = fx * Math.cos(SURFACE_SUN_AZIMUTH) + fz * Math.sin(SURFACE_SUN_AZIMUTH)
    expect(dot).toBeCloseTo(1, 10)
  })
})
