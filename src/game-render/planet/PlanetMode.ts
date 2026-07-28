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
import { createMoons } from './Moons'
import { createNamedStars } from './NamedStars'
import { createPlanetEcology } from './PlanetEcology'
import { createWormSign } from './WormSign'

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

  const moons = createMoons(RADIUS, DAY_SECONDS)
  scene.add(moons.group)

  // Far beyond the moons, so they never sort in front of the system.
  const worlds = createNamedStars(RADIUS * 26)
  scene.add(worlds.group)

  const orbit = createOrbitControl(camera, canvas, { radius: RADIUS, onDescend })

  const ecology = createPlanetEcology(planet, world)

  const wormSign = createWormSign(world, RADIUS, d => planet.radiusAt(d))
  scene.add(wormSign.group)

  const SUN_AXIS = new Vector3(0, 1, 0)
  const sunDirection = new Vector3()

  /**
   * Put the sun behind the player's shoulder.
   *
   * A directional rig aimed by compass bearing and hour is right for standing
   * on a desert and wrong for looking at a ball. Measured, the inhabited band
   * — the only part of Arrakis anyone needs to read — was rendering between
   * [26,6,3] and [9,1,0]. Black. Two causes: the sun sat 55 degrees off the
   * view axis because its elevation is set by the hour and the camera's is
   * not, and the intensities were tuned down for a surface where every
   * surface normal points at the sky.
   *
   * So the globe places its own sun: swung a little off the camera for
   * modelling, lifted a little for a top light, and brighter. The hour still
   * drives colour and still dims the whole planet toward night.
   */
  function placeSun(elevation: number): void {
    sunDirection.copy(camera.position).normalize()
      .applyAxisAngle(SUN_AXIS, 0.62)
    sunDirection.y += 0.42
    sunDirection.normalize().multiplyScalar(RADIUS * 3)

    lighting.sun.position.copy(sunDirection)
    lighting.sun.target.position.set(0, 0, 0)
    lighting.sun.target.updateMatrixWorld()

    // Night still falls, but never all the way to an unreadable map.
    const daylight = Math.max(0.22, 0.34 + Math.max(0, elevation) * 0.9)
    lighting.sun.intensity = daylight * 1.9
    lighting.fill.intensity = Math.max(0.3, daylight * 0.75)
  }

  function applyTime(state: WorldState): void {
    const palette = paletteForTime(state.time, DAY_SECONDS)

    // Colours and fill from the palette; the sun's own placement is overridden
    // straight afterwards, for the reasons in placeSun.
    lighting.applyPalette(palette, RADIUS * 3)
    placeSun(palette.sunElevation)

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
      moons.update(state.time)
      ecology.update(state)
      wormSign.update(state, DAY_SECONDS)
    },
    dispose(): void {
      orbit.dispose()
      scene.remove(planet.mesh)
      scene.remove(stars.points)
      scene.remove(air.mesh)
      scene.remove(markers.group)
      scene.remove(moons.group)
      scene.remove(worlds.group)
      scene.remove(wormSign.group)
      lighting.dispose()
      moons.dispose()
      worlds.dispose()
      wormSign.dispose()
      planet.dispose()
      stars.dispose()
      air.dispose()
      markers.dispose()
      sand.dispose()
    },
  }
}
