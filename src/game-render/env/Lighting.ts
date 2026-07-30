// src/game-render/env/Lighting.ts
// One directional sun plus one hemisphere fill. That is the whole rig.
//
// The strategic terrain does now carry a real shadow map (see shadowRig.ts,
// wired in from DesertSky) plus a procedural normal map on the sand. Neither
// darkens or bumps anything visible unless the DIRECT term is a large enough
// share of total light to have something worth removing — a shadow can only
// subtract the direct term, never the ambient one. Sizing that share is this
// file's job; the shadow map and normal map do nothing on their own.

import { DirectionalLight, HemisphereLight, Color, type Scene } from 'three'
import type { AtmospherePalette } from '../materials/Atmosphere'

// --- Direct/ambient split -----------------------------------------------
//
// Measured before this pass (sun = 0.20 + elev*0.62, fill = 0.16 + elev*0.12):
//   elevation | direct share
//      0.15   |     62%
//      0.30   |     66%
//      0.50   |     70%
//      1.00   |     75%
// The elevations that cast the most readable relief (roughly 10-35 degrees
// of sun altitude, elevation ~0.15-0.4) had the *weakest* direct share of the
// whole day — exactly backwards for a shadow map that can only carve into
// the direct term. Below, ambient is pulled down at least as much as direct
// is pushed up, per the same reasoning as the noon keyframe comment in
// Atmosphere.ts: sand is reflective and clips early under ACES. That earlier
// conclusion was reached with no shadow map and no normal map to hold the
// resulting darks; both exist now, so the ceiling moved, but the underlying
// warning about clipping did not — hence pulling ambient down rather than
// only pushing the sun up.
//
// sqrt(elevation) front-loads the gain into the low-angle band instead of
// linear's slow crawl, and capping both curves at SUN_GOLDEN_PEAK_ELEVATION
// decouples brightness from raw elevation the way a real desert does: golden
// hour is the brightest-*looking* time of day, not solar noon, and at noon
// the sun sits ~71 degrees up (see shadowRig.ts's near/far math) where the
// camera's fixed 27-degree pitch (CameraRig, StrategicMode) cannot see the
// shadows anyway. Capping means noon does not get brighter than the golden
// hour it already cleared, which keeps the sand from blowing out at the one
// elevation this rig used to run brightest.
// The night floors are the intensities at and below elevation 0, since both
// curves clamp their elevation term at zero. They are 0.20 and 0.16 because
// that is what actually rendered before this rewrite, and night was not part
// of the problem being fixed.
//
// Worth stating precisely, because the obvious reading of the old code is
// wrong. It was `max(0.08, 0.20 + max(0, elevation) * 0.62)` — and the inner
// clamp already floors the sum at 0.20, so the outer 0.08 could never bind.
// Same for the fill's 0.14 against a 0.16 base. Both apparent floors were dead
// code that never executed, and carrying them over as if they were the shipped
// values would have cut night from 0.36 to 0.22, a 39% darkening, while a test
// asserting "at least the pre-existing floor" waved it through.
// They sum to 0.36 rather than each matching its old value, because the two
// requirements pull against each other and only the sum is a real constraint.
// Fill is a floor plus a negligible gain, so its night value sets ambient at
// *every* elevation: restoring the literal old pair (0.20 sun, 0.16 fill) puts
// direct share at 83.9% at elevation 0.15 — under target in the exact 10-35
// degree band where relief casts. Solving both at once, night parity needs
// sun >= 0.211, and 0.24 leaves margin.
//
// The cost is that night is a little more directional than it was: 67% direct
// where it used to be 56%. That is a deliberate trade and it suits Arrakis,
// which has two moons overhead to motivate a directional night key.
export const SUN_NIGHT_FLOOR = 0.24
export const SUN_GOLDEN_GAIN = 1.7
export const SUN_GOLDEN_PEAK_ELEVATION = 0.4

export const FILL_NIGHT_FLOOR = 0.12
export const FILL_GOLDEN_GAIN = 0.03

/** Total light at and below the horizon, i.e. what night actually gets. */
export const NIGHT_TOTAL_INTENSITY = SUN_NIGHT_FLOOR + FILL_NIGHT_FLOOR

/** Direct sun intensity for a sun elevation in [-1, 1]. */
export function sunIntensityFor(elevation: number): number {
  const e = Math.min(Math.max(0, elevation), SUN_GOLDEN_PEAK_ELEVATION)
  return SUN_NIGHT_FLOOR + SUN_GOLDEN_GAIN * Math.sqrt(e)
}

/** Ambient (hemisphere) fill intensity for the same elevation. */
export function fillIntensityFor(elevation: number): number {
  const e = Math.min(Math.max(0, elevation), SUN_GOLDEN_PEAK_ELEVATION)
  return FILL_NIGHT_FLOOR + FILL_GOLDEN_GAIN * e
}

/**
 * Direct light's share of total illumination — the regression guard for this
 * whole module. A shadow only ever removes the direct share, so this number
 * is a hard ceiling on how deep any shadow, at any elevation, can read.
 */
export function directShare(elevation: number): number {
  const sun = sunIntensityFor(elevation)
  const fill = fillIntensityFor(elevation)
  return sun / (sun + fill)
}

export interface LightingRig {
  sun: DirectionalLight
  fill: HemisphereLight
  /**
   * Point the sun and retint everything for the current hour.
   *
   * @param azimuthRadians Compass bearing of the sun. Fixed by default, which
   *   suits a single patch of desert; the globe sweeps it a full turn per day
   *   so that every longitude is lit at some point.
   */
  applyPalette(
    palette: AtmospherePalette,
    distance?: number,
    azimuthRadians?: number,
  ): void
  dispose(): void
}

function toColor(rgb: readonly [number, number, number]): Color {
  return new Color(rgb[0], rgb[1], rgb[2])
}

export function createLighting(scene: Scene): LightingRig {
  const sun = new DirectionalLight(0xfff2dc, 2.2)
  sun.position.set(400, 500, 300)
  sun.castShadow = false

  // Sky colour from above, warm sand bounce from below — the bounce is what
  // keeps shadowed dune faces from going dead black.
  const fill = new HemisphereLight(0x9fc4ff, 0xc98a52, 0.7)

  scene.add(sun)
  scene.add(sun.target)
  scene.add(fill)

  return {
    sun,
    fill,
    applyPalette(palette, distance = 700, azimuthRadians = Math.PI * 0.25): void {
      sun.color = toColor(palette.sun)
      // The sky fill lands on exactly the up-facing crests the sun already
      // lights, so a literal blue zenith greys out the brightest sand on the
      // screen: measured, it held daytime saturation at 0.38 while dusk
      // reached 0.50. Pulled toward the sun's colour it stays a *sky* bounce
      // without bleeding the ochre out of the desert. The dome itself keeps
      // the true zenith colour — this is the bounce, not the sky.
      fill.color = toColor(palette.zenith).lerp(toColor(palette.sun), 0.62)
      fill.groundColor = toColor(palette.horizon)

      // Elevation runs -1 (midnight) to 1 (noon). Keep a sliver of light below
      // the horizon so night is legible rather than pitch black.
      const elevation = palette.sunElevation
      const altitude = Math.max(elevation, -0.25)
      // Fixed by default, which is right for a small patch of desert where the
      // sun simply rises and sets. On the globe it is not: with a fixed
      // azimuth one hemisphere is lit permanently and the other is never lit
      // at all, so half the planet could not be looked at. The planet view
      // sweeps this through a full turn over its day.
      const azimuth = azimuthRadians

      sun.position.set(
        Math.cos(azimuth) * distance * Math.max(0.35, 1 - Math.abs(altitude)),
        altitude * distance,
        Math.sin(azimuth) * distance * Math.max(0.35, 1 - Math.abs(altitude)),
      )
      sun.target.position.set(0, 0, 0)
      sun.target.updateMatrixWorld()

      // See sunIntensityFor/fillIntensityFor above for the reasoning; this is
      // deliberately a much higher direct share than the first pass (sun 2.4 +
      // fill 0.9 blew the sand to near-white under ACES — same risk, addressed
      // by moving ambient down rather than only pushing direct up further).
      sun.intensity = sunIntensityFor(elevation)
      fill.intensity = fillIntensityFor(elevation)
    },
    dispose(): void {
      scene.remove(sun)
      scene.remove(sun.target)
      scene.remove(fill)
      sun.dispose()
      fill.dispose()
    },
  }
}
