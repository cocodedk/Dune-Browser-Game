// src/game-render/post/passes.test.ts

import { describe, it, expect } from 'vitest'
import { passPlanFor, bloomParamsFor, devicePixelSize, msaaSamplesFor } from './passes'
import type { QualitySettings } from '../core/Quality'

function quality(overrides: Partial<QualitySettings> = {}): QualitySettings {
  return {
    tier: 'high',
    pixelRatio: 1,
    terrainResolution: 384,
    bloom: true,
    grain: true,
    colorGrade: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// passPlanFor
// ---------------------------------------------------------------------------

describe('passPlanFor', () => {
  it('disables the whole composer on low tier, even if flags say otherwise', () => {
    const plan = passPlanFor(quality({ tier: 'low', bloom: true, colorGrade: true }))
    expect(plan.enabled).toBe(false)
    expect(plan.bloom).toBe(false)
    expect(plan.grade).toBe(false)
    expect(plan.smaa).toBe(false)
  })

  it('enables bloom and grade on medium, but not SMAA', () => {
    const plan = passPlanFor(quality({ tier: 'medium', bloom: true, colorGrade: true }))
    expect(plan.enabled).toBe(true)
    expect(plan.bloom).toBe(true)
    expect(plan.grade).toBe(true)
    expect(plan.smaa).toBe(false)
  })

  it('enables SMAA only on high', () => {
    const plan = passPlanFor(quality({ tier: 'high' }))
    expect(plan.smaa).toBe(true)
  })

  it('follows the bloom flag on medium/high rather than hardcoding it', () => {
    const plan = passPlanFor(quality({ tier: 'high', bloom: false }))
    expect(plan.enabled).toBe(true)
    expect(plan.bloom).toBe(false)
  })

  it('grade tracks colorGrade even though Quality.ts currently pins it true', () => {
    const plan = passPlanFor(quality({ tier: 'high', colorGrade: true }))
    expect(plan.grade).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// bloomParamsFor
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// msaaSamplesFor
//
// Guards the regression these numbers exist to prevent: every tier that runs
// the composer must multisample its target, because the canvas's own MSAA stops
// covering scene geometry once nothing but OutputPass draws to the default
// framebuffer. Medium is the tier that silently lost all AA.

describe('msaaSamplesFor', () => {
  it('multisamples on every tier that runs the composer', () => {
    for (const tier of ['medium', 'high'] as const) {
      const plan = passPlanFor(quality({ tier }))
      expect(plan.enabled).toBe(true)
      expect(msaaSamplesFor(quality({ tier }))).toBeGreaterThanOrEqual(2)
    }
  })

  it('does not pay for samples on low, where no composer is built', () => {
    expect(passPlanFor(quality({ tier: 'low' })).enabled).toBe(false)
    expect(msaaSamplesFor(quality({ tier: 'low' }))).toBe(0)
  })

  it('covers medium, which SMAA does not reach', () => {
    const medium = quality({ tier: 'medium' })
    expect(passPlanFor(medium).smaa).toBe(false)
    expect(msaaSamplesFor(medium)).toBeGreaterThan(0)
  })
})

describe('bloomParamsFor', () => {
  it('returns a high threshold so only genuine highlights bloom', () => {
    const params = bloomParamsFor(quality())
    expect(params.threshold).toBeGreaterThan(0.7)
    expect(params.threshold).toBeLessThanOrEqual(1)
  })

  it('keeps strength low to avoid a hazy over-bloomed image', () => {
    const params = bloomParamsFor(quality())
    expect(params.strength).toBeGreaterThan(0)
    expect(params.strength).toBeLessThan(0.6)
  })

  it('radius is within the valid [0,1] UnrealBloomPass range', () => {
    const params = bloomParamsFor(quality())
    expect(params.radius).toBeGreaterThanOrEqual(0)
    expect(params.radius).toBeLessThanOrEqual(1)
  })

  it('is deterministic for a given tier', () => {
    const a = bloomParamsFor(quality({ tier: 'medium' }))
    const b = bloomParamsFor(quality({ tier: 'medium' }))
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// devicePixelSize
// ---------------------------------------------------------------------------

describe('devicePixelSize', () => {
  it('scales CSS pixels by the device pixel ratio', () => {
    expect(devicePixelSize(1000, 500, 2)).toEqual({ width: 2000, height: 1000 })
  })

  it('handles the fractional pixel ratios Quality.ts hands out (e.g. 1.5)', () => {
    expect(devicePixelSize(1000, 500, 1.5)).toEqual({ width: 1500, height: 750 })
  })

  it('handles an ultrawide 3440x1440-class size at pixelRatio 2', () => {
    expect(devicePixelSize(3440, 1440, 2)).toEqual({ width: 6880, height: 2880 })
  })

  it('never returns a zero or negative dimension for a not-yet-laid-out canvas', () => {
    expect(devicePixelSize(0, 0, 1)).toEqual({ width: 1, height: 1 })
    expect(devicePixelSize(-10, 5, 1)).toEqual({ width: 1, height: 5 })
  })
})
