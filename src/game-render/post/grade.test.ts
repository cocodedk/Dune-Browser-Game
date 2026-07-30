// src/game-render/post/grade.test.ts

import { describe, it, expect } from 'vitest'
import { gradeUniformDefaults, createGradeShader } from './grade'

// ---------------------------------------------------------------------------
// gradeUniformDefaults — the art-direction constants must stay subtle
// ---------------------------------------------------------------------------

describe('gradeUniformDefaults', () => {
  it('keeps vignette strength subtle (a heavy vignette reads as amateur)', () => {
    const d = gradeUniformDefaults()
    expect(d.vignetteStrength).toBeGreaterThan(0)
    expect(d.vignetteStrength).toBeLessThan(0.4)
  })

  it('keeps grain amplitude very low — texture, not visible static', () => {
    const d = gradeUniformDefaults()
    expect(d.grainAmount).toBeGreaterThan(0)
    expect(d.grainAmount).toBeLessThan(0.05)
  })

  it('keeps chromatic aberration near-zero at frame centre by construction', () => {
    // The shader multiplies this by dist^3 from centre, so any small positive
    // value already satisfies "near-zero at centre" — this guards against
    // someone bumping it into visibly-broken territory (e.g. > 1 uv unit).
    const d = gradeUniformDefaults()
    expect(d.aberrationStrength).toBeGreaterThan(0)
    expect(d.aberrationStrength).toBeLessThan(0.02)
  })

  it('keeps the contrast lift gentle, as a partial blend not a hard replace', () => {
    const d = gradeUniformDefaults()
    expect(d.contrast).toBeGreaterThan(0)
    expect(d.contrast).toBeLessThan(0.5)
  })

  it('splits warm highlights from cool shadows per the apricot/blue-violet art direction', () => {
    const d = gradeUniformDefaults()
    const [warmR, , warmB] = d.warmTint
    const [coolR, , coolB] = d.coolTint
    // Warm tint pushes red above blue; cool tint pushes blue above red.
    expect(warmR).toBeGreaterThan(warmB)
    expect(coolB).toBeGreaterThan(coolR)
  })

  it('returns fresh array instances each call so callers cannot mutate the shared constant', () => {
    const a = gradeUniformDefaults()
    const b = gradeUniformDefaults()
    expect(a.warmTint).not.toBe(b.warmTint)
    expect(a.warmTint).toEqual(b.warmTint)
  })
})

// ---------------------------------------------------------------------------
// createGradeShader — shape and isolation, not GLSL compilation (no GL here)
// ---------------------------------------------------------------------------

describe('createGradeShader', () => {
  it('exposes every uniform the fragment shader source references', () => {
    const shader = createGradeShader()
    const required = [
      'tDiffuse',
      'uResolution',
      'uTime',
      'uVignetteStrength',
      'uGrainAmount',
      'uAberrationStrength',
      'uContrast',
      'uWarmTint',
      'uCoolTint',
      'uSplitToneStrength',
    ]
    for (const name of required) {
      expect(shader.uniforms).toHaveProperty(name)
      expect(shader.fragmentShader).toContain(name)
    }
  })

  it('gives each call its own uniforms object so two pipelines cannot alias one Vector2', () => {
    const a = createGradeShader()
    const b = createGradeShader()
    expect(a.uniforms).not.toBe(b.uniforms)
    expect(a.uniforms.uResolution.value).not.toBe(b.uniforms.uResolution.value)
  })

  it('seeds uniform values from gradeUniformDefaults, not hardcoded twice', () => {
    const shader = createGradeShader()
    const d = gradeUniformDefaults()
    expect(shader.uniforms.uVignetteStrength.value).toBe(d.vignetteStrength)
    expect(shader.uniforms.uGrainAmount.value).toBe(d.grainAmount)
  })
})
