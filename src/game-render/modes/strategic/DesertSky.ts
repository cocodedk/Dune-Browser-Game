// src/game-render/modes/strategic/DesertSky.ts
// Sky dome, sun, fill and haze for the surface view, all driven off one clock.
//
// Grouped because they are one decision, not four: the hour picks a palette
// and every one of these has to agree with it, or the terrain reads as pasted
// onto a backdrop.

import { Color, FogExp2, type Scene } from 'three'
import { createSkyDome } from '../../materials/SkyDome'
import { createLighting } from '../../env/Lighting'
import { paletteForTime } from '../../materials/Atmosphere'
import type { SandMaterial } from '../../materials/SandMaterial'

/** Matches TimeSystem's DAY_SECONDS so the sky tracks the engine's clock. */
const DAY_SECONDS = 60

function rgbToColor(rgb: readonly [number, number, number]): Color {
  return new Color(rgb[0], rgb[1], rgb[2])
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
): DesertSky {
  const sky = createSkyDome(worldSize * 1.6)
  scene.add(sky.mesh)

  const lighting = createLighting(scene)

  // Exponential fog tinted to the horizon: distant dunes dissolve into haze
  // instead of ending at a hard edge.
  //
  // Density is the single most destructive number in this view. It was
  // 0.00075, and the arithmetic says why that failed: the camera sits about
  // 1090 units from what it is looking at, so exp(-0.00075 * 1090) left the
  // *subject of the shot* at 44% transmittance. More than half the haze was
  // being applied to the foreground, and the result was a cream wall with no
  // horizon and no dune form anywhere in it.
  //
  // At 0.00032 the foreground keeps most of its contrast while the far dunes
  // still dissolve into the horizon.
  const fog = new FogExp2(0xe0a070, 0.00032)
  scene.fog = fog

  return {
    applyTime(timeSeconds: number): Color {
      const palette = paletteForTime(timeSeconds, DAY_SECONDS)

      sky.setPalette(
        rgbToColor(palette.horizon),
        rgbToColor(palette.zenith),
        rgbToColor(palette.sun),
      )
      lighting.applyPalette(palette, worldSize * 0.6)
      sky.setSunDirection(
        lighting.sun.position.x,
        lighting.sun.position.y,
        lighting.sun.position.z,
      )

      fog.color = rgbToColor(palette.fog)

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
