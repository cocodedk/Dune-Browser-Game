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

  const sand = createSandMaterial({ glintStrength: quality.tier === 'low' ? 0 : 0.06 })
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
    lighting.applyPalette(palette, RADIUS * 3)

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
