// src/game-render/modes/strategic/DesertTerrain.ts
// The erg: heightfield, mesh, and the flat floor beyond it.
//
// Split out of StrategicMode because the tuning here is where most of this
// view's look actually lives, and it deserves to be readable without the
// camera and marker plumbing around it.

import { Color, type Material, type Scene } from 'three'
import { generateHeightfield } from '../../terrain/heightfield'
import { createTerrainMesh } from './TerrainMesh'
import { createGroundPlane } from './GroundPlane'
import type { QualitySettings } from '../../core/Quality'
import { seedForLocation } from './localMap'

/** Terrain extent in world units. Everything else scales off this. */
export const WORLD_SIZE = 4400
const TERRAIN_SEED = 20250727

// Peak dune height. Named rather than inlined because SandMaterial's fog
// height falloff (Finding 1, skyMath.ts's heightFogFactor) wants the same
// order of magnitude — shadowRig.ts's STRATEGIC_TERRAIN_AMPLITUDE duplicates
// this value for the same reason, on the shadow side.
export const DUNE_AMPLITUDE = 124

export interface DesertTerrain {
  heightAt(x: number, z: number): number
  /** Retint the floor so the far flat reads as more desert, not a backdrop. */
  setGroundColor(color: Color): void
  dispose(): void
}

export function createDesertTerrain(
  scene: Scene,
  quality: QualitySettings,
  sandMaterial: Material,
  /** Where on the globe this patch of desert is. */
  centre: { lat: number; lon: number } = { lat: 0, lon: 0 },
  /** Let the dunes cast and receive — see createTerrainMesh. */
  shadows = false,
): DesertTerrain {
  const heightfield = generateHeightfield({
    resolution: quality.terrainResolution,
    worldSize: WORLD_SIZE,
    // Seeded from the place, so two parts of Arrakis do not generate the
    // same dunes and landing anywhere does not look like landing everywhere.
    seed: seedForLocation(centre, TERRAIN_SEED),
    // Seen from a low angle, 78 read as ripples on a beach rather than dunes.
    // Sand can stand at about 34 degrees before it slips, and this is the
    // amplitude that puts the steep faces near that limit at this wavelength.
    amplitude: DUNE_AMPLITUDE,
    // Scaled with WORLD_SIZE to hold dune wavelength constant (~230 world
    // units across-wind). The first pass at 6 octaves produced fine wrinkles
    // that read as crumpled paper rather than dunes.
    frequency: 3.5 * (WORLD_SIZE / 2600),
    octaves: quality.tier === 'low' ? 3 : 4,
    warpStrength: 0.9,
    // Ridge-dominant: sharp crests are what make a dune legible.
    ridgeMix: 0.62,
    // Elongate ridges along X, across the prevailing wind.
    stretch: [1, 3.4],
    // Ramp to zero at the border so the dunes meet the ground plane instead
    // of ending in a cliff the camera reads as a plateau.
    //
    // 0.16 was tuned when thick fog was doing most of the hiding. From a low
    // camera with honest haze the boundary reappeared as a straight lip along
    // the skyline, so the taper has to be long enough to read as the dunes
    // simply running out — which is what a real erg does at its margin.
    edgeFalloff: 0.4,
    // Finding 3: "no skyline shape, no rock, no landmark" — one wall near the
    // +Z edge, tall enough to read as vast rather than as dune. Slope at its
    // steepest is amplitudeMultiplier*amplitude*0.8578/(falloffWidth*worldSize)
    // (the Gaussian's own peak-derivative bound) β‰ˆ 3*124*0.8578/(0.05*4400)
    // β‰ˆ 55 degrees — arithmetic, not measured from a render, but comfortably
    // past both sand's ~34-degree repose limit and the shader's rock-band
    // threshold (sandShader.glsl.ts, 0.5..0.72 flatness) with margin either
    // side of it.
    escarpment: {
      edgeDistance: 0.08,
      falloffWidth: 0.05,
      amplitudeMultiplier: 3,
      frequencyScale: 0.5,
      edgeTaper: 0.04,
    },
  })

  const terrain = createTerrainMesh(heightfield, sandMaterial, shadows)
  scene.add(terrain.mesh)

  // Extends well past the fog distance. With the field now reaching the
  // horizon this should never actually be visible; it remains as the floor
  // under everything, and as insurance on a low-quality tier.
  const ground = createGroundPlane(WORLD_SIZE * 8)
  scene.add(ground.mesh)

  return {
    heightAt: terrain.heightAt,
    setGroundColor(color: Color): void {
      ground.setColor(color)
    },
    dispose(): void {
      scene.remove(terrain.mesh)
      scene.remove(ground.mesh)
      terrain.dispose()
      ground.dispose()
    },
  }
}
