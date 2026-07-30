// src/game-render/env/shadowRig.ts
// Pure shadow-quality math for the sun's DirectionalLight shadow map.
//
// Lighting.ts turns castShadow off and explains why: the shadow camera on a
// DirectionalLight is orthographic and, left at its three.js default (a
// +-5 unit box, near 0.5 far 500), covers roughly a garden shed — nothing on
// a 4400-unit desert falls inside it. Flipping castShadow = true without
// fitting that box first produces either total darkness (nothing inside the
// tiny box) or, once the box is enlarged carelessly, shadow acne and blocky
// low-res edges. This module is that fitting math, kept pure and
// side-effect free so it is testable without a WebGL context. It does not
// touch Lighting.ts, TerrainMesh.ts or Renderer.ts — the integrator wires
// this in over there.
//
// Scope: the flat surface (StrategicMode) and flight (FlightMode) views
// only. Do NOT use this on PlanetMode: a radius-1000 globe with displaced
// relief self-shadows on every longitude at once, and a single directional
// light's shadow frustum cannot cover a whole sphere without either being
// microscopic (fit tight, most of the globe unshadowed) or enormous (fit
// wide, every texel covers tens of world units and the shadow reads as mud).
// That needs cascaded or per-face shadow maps, which is a different task.

import { PCFSoftShadowMap, type DirectionalLight, type WebGLRenderer } from 'three'
import type { QualitySettings, QualityTier } from '../core/Quality'

/** Tiers that get a shadow map at all. 'low' never does — see shadowSettingsFor. */
type ShadowTier = Extract<QualityTier, 'medium' | 'high'>

export interface ShadowSettings {
  readonly tier: ShadowTier
  /** Square shadow map resolution, texels per side. */
  readonly mapSize: number
  /** Small constant depth-space bias; see DEPTH_BIAS for why it stays tiny. */
  readonly bias: number
  /** World-unit normal offset — the real defence against dune-slope acne. */
  readonly normalBias: number
}

const MAP_SIZE: Record<ShadowTier, number> = { high: 2048, medium: 1024 }

// normalBias offsets the sampled depth along the surface normal by a fixed
// *world-unit* amount, so it has to scale with how tall the terrain relief
// actually is, not with the map's world extent. DesertTerrain's amplitude is
// 124 (see its comment there on the 34-degree sand-slip limit); a couple of
// percent of that clears acne on the steepest ~34-degree dune faces at low
// dawn/dusk sun angles without visibly detaching the shadow from its caster
// ("peter-panning"). Medium uses a bigger fraction because its map has a
// quarter of high's texels across the same frustum, so each texel covers
// more ground and needs a larger offset to stay ahead of its own footprint.
const NORMAL_BIAS_FRACTION: Record<ShadowTier, number> = { high: 0.018, medium: 0.028 }

// shadow.bias is depth-space, not world-unit, and only has to mop up acne on
// perfectly flat ground where normalBias's slope-scaled offset is ~zero.
// Kept an order of magnitude below a typical scene default because the tight
// frustums below (hundreds, not tens of thousands of units) make even a
// small depth bias read as visible peter-panning.
const DEPTH_BIAS = -0.00025

/**
 * Terrain amplitude of the surface view (DesertTerrain.ts), used when a
 * caller does not pass its own. Flight uses a shallower field (amplitude 70,
 * see FlightMode.ts) and should pass that explicitly.
 */
export const STRATEGIC_TERRAIN_AMPLITUDE = 124

/** Quality tier -> shadow settings. Returns null on 'low': no shadow map at all. */
export function shadowSettingsFor(
  quality: QualitySettings,
  terrainAmplitude: number = STRATEGIC_TERRAIN_AMPLITUDE,
): ShadowSettings | null {
  if (quality.tier === 'low') return null
  const tier = quality.tier
  return {
    tier,
    mapSize: MAP_SIZE[tier],
    bias: DEPTH_BIAS,
    normalBias: terrainAmplitude * NORMAL_BIAS_FRACTION[tier],
  }
}

// Padding beyond the requested extent so PCF's soft kernel — which samples a
// few texels around each point — does not fall off the edge of the map and
// read as a hard unshadowed strip right at the frustum boundary.
const FRUSTUM_MARGIN = 1.08

/**
 * Half-width of the orthographic shadow frustum's square footprint, in
 * world units, for a given "this much around the target needs shadows"
 * extent.
 *
 * Extent is chosen by the caller per view, not by this module: the surface
 * view should pass something on the order of MARKER_SPREAD (WORLD_SIZE *
 * 0.42) — the readable middle of the map where sietches, the player token
 * and the camera's actual pan range live — never the full WORLD_SIZE. Spread
 * the full 4400 across a 2048-texel map and you get over 2 world units per
 * texel; fit to MARKER_SPREAD (~1848) instead and that shrinks to under 1 —
 * the difference between a crisp dune edge and a blocky one. Flight should
 * pass its own FIELD_SIZE * 0.5.
 */
export function shadowFrustumRadius(extent: number): number {
  return Math.max(0, extent) * FRUSTUM_MARGIN
}

// Never let near collapse to (or below) zero: at low dawn/dusk elevation the
// light can sit almost exactly `radius` away from its target (see
// shadowCameraBounds), and a near of 0 would destroy the depth buffer's
// precision at the far end for a good chunk of every day.
const NEAR_MIN = 10

/**
 * Near/far for the shadow camera, derived from how far the light currently
 * sits from its target and the frustum radius above.
 *
 * Standard fit for a directional light aimed at a fixed target: every point
 * within `radius` of the target is, by definition, within distance
 * +- radius of the light along the light's own view axis, regardless of
 * which way the light is pointing. So near = distance - radius and
 * far = distance + radius bracket the whole shadow-relevant area tightly at
 * every sun angle, instead of hard-coding a fixed "worst case" far plane the
 * way reusing the main camera's far (WORLD_SIZE * 4) would.
 */
export function shadowCameraBounds(
  lightDistance: number,
  radius: number,
): { near: number; far: number } {
  return {
    near: Math.max(NEAR_MIN, lightDistance - radius),
    far: lightDistance + radius,
  }
}

/**
 * Point the sun's shadow camera at the relevant area and apply the tier's
 * map/bias settings. Reads the DirectionalLight's *current* position and
 * target, so call this after at least one Lighting `applyPalette()` so the
 * sun is not still sitting at its construction-time placeholder.
 *
 * Lighting.ts's azimuth/elevation formula keeps |sun.position| within about
 * +-15% of the `distance` argument passed to applyPalette across the whole
 * day (the horizontal-factor term trades off against the vertical term as
 * elevation changes, see Lighting.ts), so one call right after setup stays a
 * good fit for the rest of the day; re-call after a large time jump if you
 * want the bracket exact rather than approximate.
 */
export function configureSunShadow(
  sun: DirectionalLight,
  settings: ShadowSettings,
  extent: number,
): void {
  sun.castShadow = true

  const radius = shadowFrustumRadius(extent)
  const cam = sun.shadow.camera
  cam.left = -radius
  cam.right = radius
  cam.top = radius
  cam.bottom = -radius

  const lightDistance = sun.position.distanceTo(sun.target.position)
  const { near, far } = shadowCameraBounds(lightDistance, radius)
  cam.near = near
  cam.far = far
  cam.updateProjectionMatrix()

  sun.shadow.mapSize.set(settings.mapSize, settings.mapSize)
  sun.shadow.bias = settings.bias
  sun.shadow.normalBias = settings.normalBias
}

/**
 * Flip the renderer over to soft shadows. PCFSoftShadowMap at every tier
 * that reaches here — 'low' never does, since shadowSettingsFor returns null
 * for it and the integrator should skip calling this entirely in that case.
 */
export function enableShadows(renderer: WebGLRenderer, settings: ShadowSettings): void {
  void settings // reserved: no per-tier renderer setting beyond PCFSoft today
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
}
