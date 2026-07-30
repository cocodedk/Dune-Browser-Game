// src/game-render/planet/PlanetFurniture.ts
// The globe's secondary systems, bundled into one thing PlanetMode has to
// create, update and dispose.
//
// Split out once night lights joined worm sign, desert sites, crews and the
// player beacon and the assembly in PlanetMode crossed the file's line limit.
// None of these interact with each other — this is a box they live in, not a
// system in its own right.

import {
  Group, type BufferGeometry, type PerspectiveCamera, type Vector3,
} from 'three'
import type { WorldState } from '../../types'
import { createWormSign } from './WormSign'
import { createDesertSites } from './DesertSites'
import { createCrewUnits } from './CrewUnits'
import { createPlayerBeacon } from './PlayerBeacon'
import { createNightLights } from './NightLights'

export interface PlanetFurniture {
  group: Group
  update(
    state: WorldState,
    camera: PerspectiveCamera,
    zoom: number,
    deltaMs: number,
    sunDirection: Vector3,
  ): void
  dispose(): void
}

export function createPlanetFurniture(
  world: WorldState,
  radius: number,
  radiusAt: (direction: Vector3) => number,
  /** Village anchors PlanetMarkers already computed — never re-projected. */
  anchors: Map<string, Vector3>,
  /** The planet's own displaced geometry, shared with the night wash. */
  planetGeometry: BufferGeometry,
  daySeconds: number,
): PlanetFurniture {
  const group = new Group()
  group.name = 'planet-furniture'

  const wormSign = createWormSign(world, radius, radiusAt)
  const sites = createDesertSites(world.desertSites, radius, radiusAt)
  const crews = createCrewUnits(radius, radiusAt)
  const beacon = createPlayerBeacon(radius, radiusAt)
  const nightLights = createNightLights(world, anchors, planetGeometry, radius)

  group.add(wormSign.group, sites.group, crews.group, beacon.group, nightLights.group)

  let elapsedMs = 0

  return {
    group,
    update(state, camera, zoom, deltaMs, sunDirection): void {
      wormSign.update(state, daySeconds)
      sites.update(state.desertSites, zoom)
      elapsedMs += deltaMs
      crews.update(state, elapsedMs)
      beacon.update(state, camera, elapsedMs)
      nightLights.update(state, sunDirection, camera)
    },
    dispose(): void {
      wormSign.dispose()
      sites.dispose()
      crews.dispose()
      beacon.dispose()
      nightLights.dispose()
      group.clear()
    },
  }
}
