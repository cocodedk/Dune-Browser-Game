// src/game-render/post/passes.ts
// PURE decisions for the post-processing pass plan. No three.js imports, no
// EffectComposer — kept testable without a WebGL context per repo policy.
// PostPipeline.ts consumes these and does the actual (impure) pass wiring.

import type { QualitySettings } from '../core/Quality'

export interface PassPlan {
  /** Composer is active at all. False on 'low' -> caller renders directly. */
  enabled: boolean
  bloom: boolean
  grade: boolean
  smaa: boolean
}

/**
 * Decide which passes run for a tier.
 *
 * 'low' skips the composer entirely rather than running a mostly-disabled
 * one — an EffectComposer still allocates two full-size HalfFloat render
 * targets even with every optional pass off, and that's exactly the fill-rate
 * cost 'low' exists to avoid (see Quality.ts). SMAA is reserved for 'high'
 * only: it's the priciest pass here (two extra render targets, two extra
 * full-screen shader passes) and 'medium' already spends its headroom on
 * bloom + grain.
 */
export function passPlanFor(quality: QualitySettings): PassPlan {
  const enabled = quality.tier !== 'low'
  return {
    enabled,
    bloom: enabled && quality.bloom,
    grade: enabled && quality.colorGrade,
    smaa: quality.tier === 'high',
  }
}

/**
 * Multisample count for the composer's own render target.
 *
 * Required, not optional. Renderer.ts asks the canvas for `antialias: true` on
 * medium and high, but once a composer is in the loop the only thing drawn to
 * the default framebuffer is OutputPass's fullscreen quad — every triangle in
 * the scene is rasterised into an offscreen target instead, and
 * EffectComposer's default target is not multisampled. So wiring the composer
 * up silently threw away all geometric anti-aliasing, and SMAA (high only) was
 * the sole thing standing in for it: medium tier went from MSAA-smooth dune
 * crests to fully jagged ones. Multisampling the composer target restores
 * parity on every tier that runs it, and costs bandwidth rather than the two
 * extra targets and two extra fullscreen passes SMAA needs.
 */
export function msaaSamplesFor(quality: QualitySettings): number {
  return quality.tier === 'low' ? 0 : 4
}

export interface BloomParams {
  strength: number
  radius: number
  threshold: number
}

// Tuned by eye against the sun-glare / dune-crest reference in
// docs/PRD/dune92/02-architecture-3d.md, with "half-res selective bloom for
// sun and spice glow" as the target. Threshold 0.85 sits just above where
// ACES-mapped sky and lit sand settle, so only the sun disk, dune crest
// specular and spice-blue rim lights (which push near 1.0) actually bloom —
// everything else stays crisp. Strength 0.35 was the largest value that
// didn't visibly haze the sand texture in a side-by-side toggle; the classic
// amateur tell is a hazy over-bloomed image, so err low.
export const BLOOM_STRENGTH = 0.35
export const BLOOM_RADIUS = 0.4
export const BLOOM_THRESHOLD = 0.85

/**
 * Bloom cost scales with resolution, not with these parameters, so the plan
 * doesn't vary them by tier — the tier gate in passPlanFor already decides
 * whether bloom runs at all. Takes quality for API symmetry with
 * passPlanFor and so a future tier-specific tweak has a natural home.
 */
export function bloomParamsFor(quality: QualitySettings): BloomParams {
  void quality // reserved: no tier-specific tuning needed yet, see comment above
  return { strength: BLOOM_STRENGTH, radius: BLOOM_RADIUS, threshold: BLOOM_THRESHOLD }
}

export interface DevicePixelSize {
  width: number
  height: number
}

/**
 * EffectComposer.setSize takes CSS pixels and multiplies internally by
 * whatever pixel ratio it was last told about — but our custom grade pass
 * carries its own uResolution uniform (for aspect-correct vignette/grain)
 * that nothing updates automatically. This is the shared math for that
 * uniform and for anything else that needs actual device pixels, e.g. on the
 * user's 3440x1440 HiDPI display where CSS and device pixels diverge.
 * Rounded and floored at 1 so a not-yet-laid-out (0-size) canvas can't hand a
 * render target a zero or negative dimension.
 */
export function devicePixelSize(
  cssWidth: number,
  cssHeight: number,
  pixelRatio: number,
): DevicePixelSize {
  return {
    width: Math.max(1, Math.round(cssWidth * pixelRatio)),
    height: Math.max(1, Math.round(cssHeight * pixelRatio)),
  }
}
