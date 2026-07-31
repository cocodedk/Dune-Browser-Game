// src/game-render/planet/PlanetMode.ts
// Arrakis as a world.
//
// Replaces the flat dune field as the strategic view. The player looks at a
// globe hanging in space and zooms down toward the surface; the sietch markers
// stand on it, and the same day/night palette drives the light.
//
// Assembly only. The globe is in PlanetMesh, the haze in AtmosphereShell, the
// markers in PlanetMarkers, the camera in OrbitControl.

import { Scene, PerspectiveCamera, Vector3, Sphere, Color, type Material } from 'three'
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
import { createPlanetFurniture } from './PlanetFurniture'
import { massifsForSettlements } from './massifs'
import { canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'
import { nearestAnchor } from './pickAnchor'
import { createSunPlacer } from './PlanetSun'

const DAY_SECONDS = 60
const RADIUS = 1000
// Down from 0.055: sampling the real field found the erg's own *median*
// height already displaced ~3.5% of radius at that constant, before rock's
// 2.05x multiplier (see reliefShading.ts's cap). By arithmetic, not a render.
const RELIEF = 0.015

function rgb(c: readonly [number, number, number]): Color {
  return new Color(c[0], c[1], c[2])
}

export function createPlanetMode(
  camera: PerspectiveCamera,
  quality: QualitySettings,
  world: WorldState,
  canvas: HTMLElement,
  /** Called once the player has zoomed all the way down to the surface. */
  onDescend?: (centre: { lat: number; lon: number }) => void,
): SceneMode {
  const scene = new Scene()
  // Left unset this shows the renderer's clear colour ('#1a1208', a "no mode
  // yet" placeholder) through every gap the starfield leaves, so space read as
  // the same warm khaki as unlit dune. Undershot deliberately: the composer's
  // tone mapping sits between this and the screen.
  scene.background = new Color('#040306')

  const sand = createSandMaterial({
    glintStrength: quality.tier === 'low' ? 0 : 0.06,
    // The globe carries per-vertex biome tints; the flat surface mesh does not.
    vertexColors: true,
    // mapRepeat's 180 default was tuned to the flat desert's 4400-unit plane
    // (~24.4 units/ripple); left at that default here it tiles the sphere's
    // own UV space instead and reads too coarse. Recomputed for the same
    // ~24-unit wavelength against this sphere's ~6283-unit circumference.
    mapRepeat: 260,
    // A sphere's up is radial; see uRadialUp in sandShader.glsl.ts. Without it
    // the equatorial belt classifies as vertical rock face and paints itself
    // dark — the "chocolate mud, not apricot desert" of the art-director review.
    radialUp: true,
  })
  // Sietches are caves cut into rock, never open sand — the rock goes where
  // they are, a couple of places at a lower line than a mountain.
  const massifs = massifsForSettlements(
    world.villages,
    p => canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT),
    { great_flat: 0.45, funeral_plain: 0.7 },
  )

  const planet = createPlanetMesh(
    {
      radius: RADIUS,
      seed: 20250727,
      relief: RELIEF,
      // Built once, so segment count is a one-time cost — the height field's
      // mountain chains and fine grain need vertices at their own frequency
      // or an under-sampled mesh filters them straight back out.
      segments: quality.tier === 'low' ? 128 : 256,
      massifs,
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

  const orbit = createOrbitControl(camera, canvas, {
    radius: RADIUS,
    onDescend,
  })

  // Sized to the mean surface, so a click lands on the ground rather than on
  // the mathematical sphere the relief is displaced from.
  const pickSphere = new Sphere(new Vector3(0, 0, 0), RADIUS * 1.02)
  const pickHit = new Vector3()

  const ecology = createPlanetEcology(planet, world)

  // Shares markers.anchors rather than re-projecting: that projection has a
  // hand-written inverse elsewhere (sietch-aiming) a second copy could drift from.
  const furniture = createPlanetFurniture(
    world, RADIUS, d => planet.radiusAt(d), markers.anchors, planet.mesh.geometry, DAY_SECONDS,
  )
  scene.add(furniture.group)

  const placeSun = createSunPlacer(lighting, camera, RADIUS)

  function applyTime(state: WorldState): void {
    const palette = paletteForTime(state.time, DAY_SECONDS)

    // Colours/fill from the palette; placeSun overrides sun placement right after.
    lighting.applyPalette(palette, RADIUS * 3)
    placeSun(palette.sunElevation)

    // Base hues moved, not the blend fraction: the old '#6e3113' anchor lerped
    // only 0.18 toward ambient and stayed brown at every hour.
    const shadow = new Color('#5a3550').lerp(rgb(palette.ambient), 0.18)
    const crest = new Color('#f2cf92').lerp(rgb(palette.sun), 0.10)
    sand.setPalette(shadow, crest, shadow.clone().multiplyScalar(0.62))
    sand.setGlint(Math.max(0, palette.sunElevation) * 0.06)

    // Haze colour from the horizon (the light scattering through it);
    // direction from the sun placeSun just set, so the limb stays on the day side.
    air.setPalette(rgb(palette.horizon), lighting.sun.position)
  }

  return {
    id: 'strategic' as SceneModeId,
    scene,
    /**
     * A click on the globe resolves to the nearest sietch on the sphere the
     * ray meets, not the y=0 plane — that version left everything above ~12
     * degrees of latitude unclickable, and clicking is the only travel verb.
     */
    pickRay(ray): string | null {
      const surface = ray.intersectSphere(pickSphere, pickHit)
      if (!surface) return null
      return nearestAnchor(surface, markers.anchors, RADIUS * 0.22)
    },
    update(deltaMs: number, state: WorldState): void {
      applyTime(state)
      orbit.step(deltaMs)
      markers.update(state, camera, orbit.zoom)
      moons.update(state.time)
      ecology.update(state)
      // After applyTime: furniture's night lights read the sun position
      // placeSun just set for this frame.
      furniture.update(state, camera, orbit.zoom, deltaMs, lighting.sun.position)
    },
    dispose(): void {
      orbit.dispose()
      scene.remove(planet.mesh)
      scene.remove(stars.points)
      scene.remove(air.mesh)
      scene.remove(markers.group)
      scene.remove(furniture.group)
      scene.remove(moons.group)
      scene.remove(worlds.group)
      lighting.dispose()
      // Before planet.dispose(): night lights borrow the planet's geometry
      // without owning it, so tear down while it still exists.
      furniture.dispose()
      moons.dispose()
      worlds.dispose()
      planet.dispose()
      stars.dispose()
      air.dispose()
      markers.dispose()
      sand.dispose()
    },
  }
}
