// src/game-render/env/Lighting.ts
// One directional sun plus one hemisphere fill. That is the whole rig.
//
// No shadow maps on the strategic terrain: slope shading in the sand material
// already reads as form, and terrain-wide shadow maps cost far more than they
// return at this camera distance. Real shadows arrive only in the small
// location dioramas (Stage 13).

import { DirectionalLight, HemisphereLight, Color, type Scene } from 'three'
import type { AtmospherePalette } from '../materials/Atmosphere'

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

      // Kept deliberately low. At the first pass (sun 2.4 + fill 0.9) ACES
      // rolled the sand off to near-white and every dune form vanished. Sand
      // is highly reflective, so it blows out long before you expect it to.
      sun.intensity = Math.max(0.08, 0.20 + Math.max(0, elevation) * 0.62)
      fill.intensity = Math.max(0.14, 0.16 + Math.max(0, elevation) * 0.12)
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
