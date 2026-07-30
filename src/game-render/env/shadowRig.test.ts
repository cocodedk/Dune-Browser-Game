// src/game-render/env/shadowRig.test.ts
// Pure math only. DirectionalLight and its shadow.camera (an
// OrthographicCamera) are plain three.js objects with no WebGL dependency,
// so they are safe to instantiate directly here — only WebGLRenderer needs a
// real GL context, and it is exercised via a duck-typed stand-in below.

import { describe, it, expect } from 'vitest'
import { DirectionalLight, PCFSoftShadowMap, type WebGLRenderer } from 'three'
import type { QualitySettings, QualityTier } from '../core/Quality'
import {
  shadowSettingsFor,
  shadowFrustumRadius,
  shadowCameraBounds,
  configureSunShadow,
  enableShadows,
  STRATEGIC_TERRAIN_AMPLITUDE,
} from './shadowRig'

function quality(tier: QualityTier): QualitySettings {
  return {
    tier,
    pixelRatio: 1,
    terrainResolution: 288,
    bloom: tier !== 'low',
    grain: tier !== 'low',
    colorGrade: true,
  }
}

describe('shadowSettingsFor', () => {
  it('is null on low — no shadow map at all', () => {
    expect(shadowSettingsFor(quality('low'))).toBeNull()
  })

  it('gives high tier a bigger map than medium', () => {
    const high = shadowSettingsFor(quality('high'))
    const medium = shadowSettingsFor(quality('medium'))
    expect(high?.mapSize).toBe(2048)
    expect(medium?.mapSize).toBe(1024)
    expect(high!.mapSize).toBeGreaterThan(medium!.mapSize)
  })

  it('scales normalBias with terrain amplitude', () => {
    const shallow = shadowSettingsFor(quality('high'), 70)
    const deep = shadowSettingsFor(quality('high'), 124)
    expect(deep!.normalBias).toBeGreaterThan(shallow!.normalBias)
    // Proportional, not just monotonic: doubling amplitude should double it.
    const doubled = shadowSettingsFor(quality('high'), 140)
    const single = shadowSettingsFor(quality('high'), 70)
    expect(doubled!.normalBias).toBeCloseTo(single!.normalBias * 2, 6)
  })

  it('gives medium a larger normalBias fraction than high at equal amplitude', () => {
    const high = shadowSettingsFor(quality('high'), STRATEGIC_TERRAIN_AMPLITUDE)
    const medium = shadowSettingsFor(quality('medium'), STRATEGIC_TERRAIN_AMPLITUDE)
    expect(medium!.normalBias).toBeGreaterThan(high!.normalBias)
  })

  it('keeps a small negative depth bias regardless of tier', () => {
    const high = shadowSettingsFor(quality('high'))
    const medium = shadowSettingsFor(quality('medium'))
    expect(high!.bias).toBeLessThan(0)
    expect(high!.bias).toBeGreaterThan(-0.001)
    expect(medium!.bias).toBe(high!.bias)
  })

  it('defaults amplitude to the strategic view when unspecified', () => {
    const explicit = shadowSettingsFor(quality('high'), STRATEGIC_TERRAIN_AMPLITUDE)
    const implicit = shadowSettingsFor(quality('high'))
    expect(implicit!.normalBias).toBeCloseTo(explicit!.normalBias, 10)
  })
})

describe('shadowFrustumRadius', () => {
  it('grows with extent', () => {
    expect(shadowFrustumRadius(2000)).toBeGreaterThan(shadowFrustumRadius(1000))
  })

  it('is always at least as large as the requested extent (margin, never a crop)', () => {
    expect(shadowFrustumRadius(1848)).toBeGreaterThanOrEqual(1848)
  })

  it('clamps a negative extent to zero rather than flipping sign', () => {
    expect(shadowFrustumRadius(-500)).toBe(0)
  })
})

describe('shadowCameraBounds', () => {
  it('brackets the light distance: near <= distance <= far', () => {
    const { near, far } = shadowCameraBounds(2640, 1996)
    expect(near).toBeLessThanOrEqual(2640)
    expect(far).toBeGreaterThanOrEqual(2640)
  })

  it('floors near at a positive minimum when radius exceeds distance', () => {
    const { near } = shadowCameraBounds(1100, 1996)
    expect(near).toBeGreaterThan(0)
  })

  it('far grows with radius', () => {
    const a = shadowCameraBounds(2000, 500)
    const b = shadowCameraBounds(2000, 1500)
    expect(b.far).toBeGreaterThan(a.far)
  })

  it('stays tight: far never balloons to an arbitrary large constant', () => {
    const { far } = shadowCameraBounds(2640, 1996)
    // Nowhere near the scene camera's own far plane (WORLD_SIZE * 4 = 17600).
    expect(far).toBeLessThan(6000)
  })
})

describe('configureSunShadow', () => {
  it('turns castShadow on', () => {
    const sun = new DirectionalLight()
    const settings = shadowSettingsFor(quality('high'))!
    configureSunShadow(sun, settings, 1848)
    expect(sun.castShadow).toBe(true)
  })

  it('fits the ortho frustum to +-shadowFrustumRadius(extent)', () => {
    const sun = new DirectionalLight()
    const settings = shadowSettingsFor(quality('high'))!
    configureSunShadow(sun, settings, 1848)
    const radius = shadowFrustumRadius(1848)
    expect(sun.shadow.camera.left).toBeCloseTo(-radius, 6)
    expect(sun.shadow.camera.right).toBeCloseTo(radius, 6)
    expect(sun.shadow.camera.top).toBeCloseTo(radius, 6)
    expect(sun.shadow.camera.bottom).toBeCloseTo(-radius, 6)
  })

  it('brackets near/far around the light-to-target distance', () => {
    const sun = new DirectionalLight()
    sun.position.set(0, 2640, 0) // directly overhead, distance 2640
    sun.target.position.set(0, 0, 0)
    const settings = shadowSettingsFor(quality('high'))!
    configureSunShadow(sun, settings, 1848)
    const expected = shadowCameraBounds(2640, shadowFrustumRadius(1848))
    expect(sun.shadow.camera.near).toBeCloseTo(expected.near, 6)
    expect(sun.shadow.camera.far).toBeCloseTo(expected.far, 6)
  })

  it('applies the tier map size and bias values onto the light', () => {
    const sun = new DirectionalLight()
    const settings = shadowSettingsFor(quality('medium'))!
    configureSunShadow(sun, settings, 1848)
    expect(sun.shadow.mapSize.x).toBe(1024)
    expect(sun.shadow.mapSize.y).toBe(1024)
    expect(sun.shadow.bias).toBe(settings.bias)
    expect(sun.shadow.normalBias).toBe(settings.normalBias)
  })
})

describe('enableShadows', () => {
  it('enables the renderer shadow map with PCF soft filtering', () => {
    const fakeRenderer = {
      shadowMap: { enabled: false, type: -1 },
    } as unknown as WebGLRenderer
    const settings = shadowSettingsFor(quality('high'))!
    enableShadows(fakeRenderer, settings)
    expect(fakeRenderer.shadowMap.enabled).toBe(true)
    expect(fakeRenderer.shadowMap.type).toBe(PCFSoftShadowMap)
  })
})
