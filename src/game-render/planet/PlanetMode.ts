// src/game-render/planet/PlanetMode.ts
// Arrakis as a world.
//
// Replaces the flat dune field as the strategic view. The player looks at a
// globe hanging in space and zooms down toward the surface; the sietch markers
// stand on it, and the same day/night palette drives the light.
//
// Assembly only. The globe is in PlanetMesh, the haze in AtmosphereShell, the
// markers in PlanetMarkers, the camera in OrbitControl.

import { Scene, PerspectiveCamera, Vector3, Color, type Material } from 'three'
import type { SceneModeId, WorldState } from '../../types'
import type { SceneMode } from '../core/ModeManager'
import type { QualitySettings } from '../core/Quality'
import { createSandMaterial } from '../materials/SandMaterial'
import { createLighting } from '../env/Lighting'
import { paletteForTime } from '../materials/Atmosphere'
import { createPlanetMesh } from './PlanetMesh'
import { createStarfield } from './Starfield'
import { createAtmosphereShell } from './AtmosphereShell'
import { createPlanetMarkers } from './PlanetMarkers'
import { createOrbitControl } from './OrbitControl'

const DAY_SECONDS = 60
const RADIUS = 1000
const RELIEF = 0.055

function rgb(c: readonly [number, number, number]): Color {
  return new Color(c[0], c[1], c[2])
}

export function createPlanetMode(
  camera: PerspectiveCamera,
  quality: QualitySettings,
  world: WorldState,
  canvas: HTMLElement,
  /** Called once the player has zoomed all the way down to the surface. */
  onDescend?: () => void,
): SceneMode {
  const scene = new Scene()

  const sand = createSandMaterial({
    glintStrength: quality.tier === 'low' ? 0 : 0.06,
    // The globe carries per-vertex biome tints; the flat surface mesh does not.
    vertexColors: true,
  })
  const planet = createPlanetMesh(
    {
      radius: RADIUS,
      seed: 20250727,
      relief: RELIEF,
      segments: quality.tier === 'low' ? 96 : 192,
    },
    sand.material as Material,
  )
  scene.add(planet.mesh)

  const stars = createStarfield(RADIUS * 40)
  scene.add(stars.points)

  const air = createAtmosphereShell(RADIUS)
  scene.add(air.mesh)

  const lighting = createLighting(scene)

  const markers = createPlanetMarkers(world, RADIUS, d => planet.radiusAt(d))
  scene.add(markers.group)

  const orbit = createOrbitControl(camera, canvas, { radius: RADIUS, onDescend })

  function applyTime(state: WorldState): void {
    const palette = paletteForTime(state.time, DAY_SECONDS)

    // The sun's bearing follows the camera's, offset over the player's left
    // shoulder.
    //
    // With the azimuth fixed — which is right for a single patch of desert —
    // one hemisphere of the globe was lit permanently and the other never was
    // at all, so half of Arrakis was built, displaced, tinted and impossible
    // to look at. Sweeping the azimuth on the day clock instead just means the
    // camera and the terminator chase each other around.
    //
    // This is a map the player reads, not a rotating body being simulated: the
    // face you turn toward should be the face that is lit. The hour still
    // shows, in colour and in how high the light sits, and the limb still
    // falls away into shadow.
    const bearing = Math.atan2(camera.position.x, camera.position.z)
    lighting.applyPalette(palette, RADIUS * 3, bearing + 0.55)

    const shadow = new Color('#6e3113').lerp(rgb(palette.ambient), 0.18)
    const crest = new Color('#dcab5c').lerp(rgb(palette.sun), 0.10)
    sand.setPalette(shadow, crest, shadow.clone().multiplyScalar(0.62))
    sand.setGlint(Math.max(0, palette.sunElevation) * 0.06)

    // The haze takes its colour from the horizon — the same light that would
    // be scattering through it — and its direction from the sun the lighting
    // rig just placed, so the bright limb can never drift off the day side.
    air.setPalette(rgb(palette.horizon), lighting.sun.position)
  }

  return {
    id: 'strategic' as SceneModeId,
    scene,
    /** Raycast hit on the globe resolves to the nearest sietch. */
    pickAt(x: number, z: number): string | null {
      const hit = new Vector3(x, 0, z)
      if (hit.lengthSq() === 0) return null
      let best: string | null = null
      let bestDist = Infinity
      for (const [id, anchor] of markers.anchors) {
        const d = anchor.distanceTo(hit)
        if (d < bestDist) { bestDist = d; best = id }
      }
      return bestDist < RADIUS * 0.22 ? best : null
    },
    update(deltaMs: number, state: WorldState): void {
      applyTime(state)
      orbit.step(deltaMs)
      markers.update(state, camera, orbit.zoom)
    },
    dispose(): void {
      orbit.dispose()
      scene.remove(planet.mesh)
      scene.remove(stars.points)
      scene.remove(air.mesh)
      scene.remove(markers.group)
      lighting.dispose()
      planet.dispose()
      stars.dispose()
      air.dispose()
      markers.dispose()
      sand.dispose()
    },
  }
}
