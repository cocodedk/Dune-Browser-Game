// src/game-render/modes/strategic/StrategicMode.ts
// The 3D map: terrain, sky, lighting, fog, and a camera that reads as a map
// you study rather than a scene you fly. Assembles the pieces and retints
// everything from world.time each frame.

import {
  Scene,
  FogExp2,
  Color,
  PerspectiveCamera,
  type Material,
} from 'three'
import type { SceneModeId, WorldState } from '../../../types'
import type { SceneMode } from '../../core/ModeManager'
import type { QualitySettings } from '../../core/Quality'
import { generateHeightfield } from '../../terrain/heightfield'
import { createSandMaterial } from '../../materials/SandMaterial'
import { createSkyDome } from '../../materials/SkyDome'
import { createLighting } from '../../env/Lighting'
import { paletteForTime } from '../../materials/Atmosphere'
import { createTerrainMesh } from './TerrainMesh'
import { createGroundPlane } from './GroundPlane'
import { createCameraRig } from '../../core/CameraRig'
import { createSietchMarkers } from './SietchMarkers'
import { createPlayerToken } from './PlayerToken'
import { createMarkerLabels } from './MarkerLabels'

/** Matches TimeSystem's DAY_SECONDS so the sky tracks the engine's clock. */
const DAY_SECONDS = 60
// Large enough that the heightfield's square boundary sits well beyond the fog
// distance, which lets the camera drop low enough to show sky and horizon
// without ever revealing the edge.
const WORLD_SIZE = 2600
const TERRAIN_SEED = 20250727

function rgbToColor(rgb: readonly [number, number, number]): Color {
  return new Color(rgb[0], rgb[1], rgb[2])
}

export function createStrategicMode(
  camera: PerspectiveCamera,
  quality: QualitySettings,
  world: WorldState,
  canvas: HTMLElement,
): SceneMode {
  const scene = new Scene()

  const heightfield = generateHeightfield({
    resolution: quality.terrainResolution,
    worldSize: WORLD_SIZE,
    seed: TERRAIN_SEED,
    amplitude: 78,
    // Scaled with WORLD_SIZE to hold dune wavelength constant (~230 world
    // units across-wind). The first pass at 6 octaves produced fine wrinkles
    // that read as crumpled paper rather than dunes.
    frequency: 3.5,
    octaves: quality.tier === 'low' ? 3 : 4,
    warpStrength: 0.9,
    // Ridge-dominant: sharp crests are what make a dune legible.
    ridgeMix: 0.62,
    // Elongate ridges along X, across the prevailing wind.
    stretch: [1, 3.4],
    // Ramp to zero at the border so the dunes meet the ground plane instead
    // of ending in a cliff the camera reads as a plateau.
    edgeFalloff: 0.16,
  })

  const sand = createSandMaterial({
    glintStrength: quality.tier === 'low' ? 0 : 0.07,
  })
  const terrain = createTerrainMesh(heightfield, sand.material as Material)
  scene.add(terrain.mesh)

  // Extends well past the fog distance, so the terrain's border never becomes
  // a visible horizon line.
  const ground = createGroundPlane(WORLD_SIZE * 8)
  scene.add(ground.mesh)

  const sky = createSkyDome(WORLD_SIZE * 1.6)
  scene.add(sky.mesh)

  // Villages occupy the readable middle of the map, not the fogged distance.
  const MARKER_SPREAD = WORLD_SIZE * 0.42
  const markers = createSietchMarkers(world, MARKER_SPREAD, terrain.heightAt)
  scene.add(markers.group)

  const playerToken = createPlayerToken(MARKER_SPREAD, terrain.heightAt)
  scene.add(playerToken.group)

  const labels = createMarkerLabels(
    markers.placements,
    world.villages.map(v => ({ id: v.id, name: v.name })),
    terrain.heightAt,
    96,
  )
  scene.add(labels.group)

  const lighting = createLighting(scene)

  // Exponential fog tinted to the horizon: distant dunes dissolve into haze
  // instead of ending at a hard edge. Kept light — at 0.00085 the mid-distance
  // washed out entirely and the dune forms disappeared into flat brown.
  // Density is load-bearing, not decoration: it must fully swallow the
  // heightfield's square boundary before it reaches the horizon line. At
  // 0.00052 the far edge showed as a hard plateau lip against the sky.
  // ~91% opacity by 1300 units hides it while leaving the foreground clear.
  const fog = new FogExp2(0xe0a070, 0.0012)
  scene.fog = fog

  // High, fixed-pitch orbital view. Deliberately not free-look — this is a map
  // you read, not a scene you fly.
  //
  // Pitch matters more than it looks: at a shallow angle the camera sees the
  // heightfield's flat square boundary as a plateau cliff on the horizon.
  // Looking down at ~62 degrees keeps the edge out of frame and puts the light
  // across the dune crests instead of end-on.
  camera.near = 1
  camera.far = WORLD_SIZE * 4
  camera.updateProjectionMatrix()

  // Low pitch puts sky and horizon in frame — that vista is where a desert
  // gets its drama — while fog hides the heightfield boundary beyond it.
  // Pan is bounded to the marker area so the player cannot wander off the map.
  const rig = createCameraRig(camera, canvas, {
    minDistance: WORLD_SIZE * 0.22,
    maxDistance: WORLD_SIZE * 0.62,
    panExtent: MARKER_SPREAD * 0.5,
    pitchRadians: (30 * Math.PI) / 180,
  })

  function applyTime(world: WorldState): void {
    const palette = paletteForTime(world.time, DAY_SECONDS)

    sky.setPalette(
      rgbToColor(palette.horizon),
      rgbToColor(palette.zenith),
      rgbToColor(palette.sun),
    )
    lighting.applyPalette(palette, WORLD_SIZE * 0.6)
    sky.setSunDirection(
      lighting.sun.position.x,
      lighting.sun.position.y,
      lighting.sun.position.z,
    )

    fog.color = rgbToColor(palette.fog)

    // Sand retints with the hour: cool violet troughs at night, burnt orange
    // at noon. Without this the terrain reads as pasted onto the sky.
    // Anchor on the sand colours and only tint toward the hour, rather than
    // the reverse. Deriving crest straight from the sun washed it to bone
    // white at noon and lost the entire palette.
    const shadow = new Color('#7d3a18').lerp(rgbToColor(palette.ambient), 0.3)
    const crest = new Color('#e3b972').lerp(rgbToColor(palette.sun), 0.22)
    const slip = shadow.clone().multiplyScalar(0.62)
    sand.setPalette(shadow, crest, slip)
    // Glint is specular: with no sun on the sand it must disappear, or it
    // reads as white speckle noise over a dark dune field.
    sand.setGlint(Math.max(0, palette.sunElevation) * 0.07)

    // Track the sand so the far flat reads as more desert, not as a backdrop.
    ground.setColor(shadow.clone().lerp(crest, 0.55))
  }

  let elapsedMs = 0

  return {
    id: 'strategic' as SceneModeId,
    scene,
    /** World-XZ hit test for a click, delegated to the marker layer. */
    pickAt(x: number, z: number): string | null {
      return markers.pickAt(x, z, MARKER_SPREAD * 0.09)
    },
    update(deltaMs: number, state: WorldState): void {
      elapsedMs += deltaMs
      applyTime(state)
      markers.refresh(state)
      playerToken.update(state, elapsedMs)
    },
    dispose(): void {
      scene.remove(terrain.mesh)
      scene.remove(ground.mesh)
      scene.remove(sky.mesh)
      scene.remove(markers.group)
      scene.remove(playerToken.group)
      scene.remove(labels.group)
      labels.dispose()
      rig.dispose()
      lighting.dispose()
      terrain.dispose()
      ground.dispose()
      markers.dispose()
      playerToken.dispose()
      sand.dispose()
      sky.dispose()
      scene.fog = null
    },
  }
}
