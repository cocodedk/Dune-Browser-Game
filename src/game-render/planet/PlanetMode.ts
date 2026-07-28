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
import { massifsForSettlements } from './massifs'
import { canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'
import { createWormSign } from './WormSign'
import { createDesertSites } from './DesertSites'
import { createCrewUnits } from './CrewUnits'
import { createPlayerBeacon } from './PlayerBeacon'
import { nearestAnchor } from './pickAnchor'
import { createSunPlacer } from './PlanetSun'

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
  onDescend?: (centre: { lat: number; lon: number }) => void,
): SceneMode {
  const scene = new Scene()

  const sand = createSandMaterial({
    glintStrength: quality.tier === 'low' ? 0 : 0.06,
    // The globe carries per-vertex biome tints; the flat surface mesh does not.
    vertexColors: true,
  })
  // Sietches are caves cut into rock, never open sand — so the rock goes
  // where they are. A couple of places get a lower line than a mountain.
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
      segments: quality.tier === 'low' ? 96 : 192,
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
    onDescend: onDescend ? () => onDescend(orbit.centre) : undefined,
  })

  // Sized to the mean surface, so a click lands on the ground rather than on
  // the mathematical sphere the relief is displaced from.
  const pickSphere = new Sphere(new Vector3(0, 0, 0), RADIUS * 1.02)
  const pickHit = new Vector3()

  const ecology = createPlanetEcology(planet, world)

  const wormSign = createWormSign(world, RADIUS, d => planet.radiusAt(d))
  scene.add(wormSign.group)

  const sites = createDesertSites(world.desertSites, RADIUS, d => planet.radiusAt(d))
  scene.add(sites.group)

  const crews = createCrewUnits(RADIUS, d => planet.radiusAt(d))
  scene.add(crews.group)

  const beacon = createPlayerBeacon(RADIUS, d => planet.radiusAt(d))
  scene.add(beacon.group)
  let elapsedMs = 0

  const placeSun = createSunPlacer(lighting, camera, RADIUS)

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
    /**
     * A click on the globe resolves to the sietch nearest where the ray meets
     * the planet.
     *
     * Against the sphere, not the y=0 plane. The plane version could not work:
     * it compared a flat intersection against anchors sitting on a sphere, so
     * anything above about 12 degrees of latitude was unclickable and
     * travelling by clicking the map — the game's only travel verb — silently
     * did nothing for most of the world.
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
      wormSign.update(state, DAY_SECONDS)
      sites.update(state.desertSites, orbit.zoom)
      elapsedMs += deltaMs
      crews.update(state, elapsedMs)
      beacon.update(state, camera, elapsedMs)
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
      scene.remove(sites.group)
      scene.remove(crews.group)
      scene.remove(beacon.group)
      lighting.dispose()
      moons.dispose()
      worlds.dispose()
      wormSign.dispose()
      sites.dispose()
      crews.dispose()
      beacon.dispose()
      planet.dispose()
      stars.dispose()
      air.dispose()
      markers.dispose()
      sand.dispose()
    },
  }
}
