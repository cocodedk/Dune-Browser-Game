// src/game-render/core/Quality.ts
// PURE device tiering. No three.js, no DOM access — the caller passes probed
// values in, so tier selection is testable without a browser.
//
// The tier decides what the desert can afford: grid resolution, post stack,
// and pixel ratio. Getting this wrong on a low-end machine costs the whole
// aesthetic, so the boundaries are explicit and tested.

export type QualityTier = 'low' | 'medium' | 'high'

export interface DeviceProbe {
  /** navigator.hardwareConcurrency, or 0 when unknown. */
  cores: number
  /** window.devicePixelRatio. */
  devicePixelRatio: number
  /** Measured ms for the first frame, when available. */
  firstFrameMs?: number
}

export interface QualitySettings {
  tier: QualityTier
  /** Cap applied to devicePixelRatio — the single biggest fill-rate lever. */
  pixelRatio: number
  /** Terrain heightfield grid resolution per side. */
  terrainResolution: number
  bloom: boolean
  grain: boolean
  /** Colour grade + vignette are never disabled: they carry the art direction. */
  colorGrade: true
}

const SETTINGS: Record<QualityTier, Omit<QualitySettings, 'tier' | 'pixelRatio'>> = {
  low: { terrainResolution: 128, bloom: false, grain: false, colorGrade: true },
  medium: { terrainResolution: 192, bloom: true, grain: true, colorGrade: true },
  high: { terrainResolution: 256, bloom: true, grain: true, colorGrade: true },
}

const PIXEL_RATIO_CAP: Record<QualityTier, number> = {
  low: 1,
  medium: 1.5,
  high: 2,
}

/**
 * Pick a tier from a device probe.
 *
 * A slow measured first frame demotes regardless of core count — reported cores
 * are a poor proxy for GPU capability, and a machine that already stuttered is
 * telling us more than its CPU spec does.
 */
export function selectTier(probe: DeviceProbe): QualityTier {
  if (probe.firstFrameMs !== undefined && probe.firstFrameMs > 50) return 'low'

  const cores = probe.cores > 0 ? probe.cores : 4 // unknown -> assume mid-range
  if (cores <= 2) return 'low'
  if (cores <= 6) return 'medium'

  // Plenty of cores but a very high DPR screen: the fill-rate cost of native
  // resolution outweighs the CPU headroom.
  if (probe.devicePixelRatio > 2.5) return 'medium'
  return 'high'
}

export function resolveQuality(probe: DeviceProbe): QualitySettings {
  const tier = selectTier(probe)
  return {
    tier,
    ...SETTINGS[tier],
    pixelRatio: Math.min(probe.devicePixelRatio, PIXEL_RATIO_CAP[tier]),
  }
}
