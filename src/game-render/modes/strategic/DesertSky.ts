// src/game-render/modes/strategic/DesertSky.ts
// Sky dome, sun, fill and haze for the surface view, all driven off one clock.
//
// Grouped because they are one decision, not four: the hour picks a palette
// and every one of these has to agree with it, or the terrain reads as pasted
// onto a backdrop.

import { Color, FogExp2, type Scene } from 'three'
import { createSkyDome, sunDiskBoostFor } from '../../materials/SkyDome'
import { createLighting } from '../../env/Lighting'
import { paletteForTime, type Rgb } from '../../materials/Atmosphere'
import type { SandMaterial } from '../../materials/SandMaterial'
import { configureSunShadow, type ShadowSettings } from '../../env/shadowRig'

/** Matches TimeSystem's DAY_SECONDS so the sky tracks the engine's clock. */
const DAY_SECONDS = 60

function rgbToColor(rgb: readonly [number, number, number]): Color {
  return new Color(rgb[0], rgb[1], rgb[2])
}

// --- Ground fog: leaned toward the sky, not the horizon glow -------------
//
// Finding 3 measured a shading spread of exactly 0 across the sky band at
// dusk, because the terrain's fog and the sky dome's horizon band were both
// driven off the identical palette.horizon triple: sky and ground faded to
// the literal same RGB, so there was no edge between them at all — a dust
// storm, not a horizon line. Leaning the ground's fog toward the zenith
// instead makes distant dunes fade to a cooler, dimmer tone than the fiery
// horizon glow behind them: a sunset silhouette, which is what actually
// reads as a horizon.
const FOG_SKY_LEAN = 0.4

export function fogColorFor(horizon: Rgb, zenith: Rgb, skyLean: number = FOG_SKY_LEAN): Rgb {
  return [
    horizon[0] + (zenith[0] - horizon[0]) * skyLean,
    horizon[1] + (zenith[1] - horizon[1]) * skyLean,
    horizon[2] + (zenith[2] - horizon[2]) * skyLean,
  ]
}

// --- Fog density, checked against the camera's own distance bounds -------
//
// CameraRig (StrategicMode) bounds the surface view to WORLD_SIZE * 0.22 ..
// 0.62. The closest the camera ever gets is the fraction below; solving
// exp(-density * distance) = target for density keeps that foreground
// distance at a known, chosen transmittance instead of an arithmetic
// coincidence the way the previous flat 0.00032 constant was (see the
// postmortem on its predecessor, 0.00075, in the fog comment in
// createDesertSky below).
const NEAREST_CAMERA_DISTANCE_FRACTION = 0.22
const FOREGROUND_TRANSMITTANCE = 0.75

export function fogDensityFor(
  nearestCameraDistance: number,
  foregroundTransmittance: number = FOREGROUND_TRANSMITTANCE,
): number {
  return -Math.log(foregroundTransmittance) / nearestCameraDistance
}

export interface DesertSky {
  /**
   * Retint everything for a moment in the day.
   * @returns the floor colour the terrain should adopt to match.
   */
  applyTime(timeSeconds: number): Color
  dispose(): void
}

export function createDesertSky(
  scene: Scene,
  sand: SandMaterial,
  worldSize: number,
  /**
   * Shadow tier and the world-unit radius around the camera target that needs
   * to cast. Omitted (or null) leaves the sun shadowless, which is what the
   * 'low' tier and any caller that has not opted in should get.
   */
  shadows?: { settings: ShadowSettings; extent: number } | null,
): DesertSky {
  const sky = createSkyDome(worldSize * 1.6)
  scene.add(sky.mesh)

  const lighting = createLighting(scene)

  // Exponential fog, leaned toward the sky rather than matched flat to the
  // horizon (see fogColorFor above): distant dunes dissolve into haze instead
  // of ending at a hard edge, but no longer into the exact same colour as the
  // sky behind them.
  //
  // Density is the single most destructive number in this view. It was once a
  // flat 0.00075, and the arithmetic says why that failed: the camera sits
  // about 1090 units from what it is looking at, so exp(-0.00075 * 1090) left
  // the *subject of the shot* at 44% transmittance. More than half the haze
  // was being applied to the foreground, and the result was a cream wall with
  // no horizon and no dune form anywhere in it. fogDensityFor solves for
  // density directly from the camera's own nearest distance instead, so the
  // foreground's transmittance is a chosen number rather than whatever an
  // arbitrary constant happens to produce at any given zoom.
  const fog = new FogExp2(0xe0a070, fogDensityFor(worldSize * NEAREST_CAMERA_DISTANCE_FRACTION))
  scene.fog = fog

  // Fitted after the first applyTime rather than here, because the shadow
  // camera's near/far bracket is derived from where the sun actually is and at
  // construction it is still on its placeholder position from createLighting.
  let shadowsFitted = false

  return {
    applyTime(timeSeconds: number): Color {
      const palette = paletteForTime(timeSeconds, DAY_SECONDS)

      sky.setPalette(
        rgbToColor(palette.horizon),
        rgbToColor(palette.zenith),
        rgbToColor(palette.sun),
      )
      lighting.applyPalette(palette, worldSize * 0.6)

      // Once only. Lighting keeps |sun.position| within about 15% of the
      // distance it is handed across the whole day, so a bracket fitted at the
      // first hour stays a good fit for every later one, and refitting per frame
      // would rebuild the shadow camera's projection sixty times a second for a
      // few percent of near/far.
      if (shadows && !shadowsFitted) {
        configureSunShadow(lighting.sun, shadows.settings, shadows.extent)
        shadowsFitted = true
      }

      sky.setSunDirection(
        lighting.sun.position.x,
        lighting.sun.position.y,
        lighting.sun.position.z,
      )
      // A real sunset sun looks larger and hazier near the horizon than the
      // same sun straight overhead — atmosphere scatters more of its light
      // into the surrounding glow the lower it sits. See sunDiskBoostFor.
      sky.setSunBoost(sunDiskBoostFor(palette.sunElevation))

      fog.color = rgbToColor(fogColorFor(palette.horizon, palette.zenith))

      // Sand retints with the hour: cool violet troughs at night, burnt orange
      // at noon. Without this the terrain reads as pasted onto the sky.
      //
      // Anchored on the sand colours and only tinted toward the hour, never
      // the reverse — deriving crest straight from the sun washed it to bone
      // white at noon and lost the entire palette. Troughs stay saturated for
      // the same reason: lerped too far toward the pale noon ambient, the
      // shadow side washed out and every crest line went with it.
      const shadow = new Color('#6e3113').lerp(rgbToColor(palette.ambient), 0.18)
      const crest = new Color('#dcab5c').lerp(rgbToColor(palette.sun), 0.10)
      sand.setPalette(shadow, crest, shadow.clone().multiplyScalar(0.62))
      // Glint is specular: with no sun on the sand it must disappear, or it
      // reads as white speckle noise over a dark dune field.
      sand.setGlint(Math.max(0, palette.sunElevation) * 0.07)

      return shadow.clone().lerp(crest, 0.55)
    },
    dispose(): void {
      scene.remove(sky.mesh)
      lighting.dispose()
      sky.dispose()
      scene.fog = null
    },
  }
}
