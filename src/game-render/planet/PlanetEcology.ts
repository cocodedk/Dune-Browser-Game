// src/game-render/planet/PlanetEcology.ts
// Repaints the globe as the ecology advances.
//
// Greening Arrakis is the longest and most expensive decision in the game —
// crews spent on planting are crews not harvesting, and a region taken past
// sixty never blows spice again. A decision that costs that much has to be
// visible on the planet, not just in a number on a panel.

import { Vector3 } from 'three'
import type { WorldState } from '../../types'
import type { PlanetMesh } from './PlanetMesh'
import { latLonToVec3, canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

/**
 * Angular radius of a region's influence, in radians.
 *
 * Wide enough that a greened region reads as a stretch of country rather than
 * a dot, narrow enough that eight of them do not merge into one continent.
 */
const REGION_EXTENT = 0.42

/**
 * Below this much total change, do not repaint.
 *
 * Vegetation moves by fractions of a point per game-day, and rewriting the
 * whole colour buffer every frame would be a GPU upload of an unchanged
 * buffer sixty times a second.
 */
const REPAINT_THRESHOLD = 0.25

export interface PlanetEcology {
  /** Repaint if the ecology has moved enough to see. Safe to call per frame. */
  update(world: WorldState): void
}

export function createPlanetEcology(
  planet: PlanetMesh,
  world: WorldState,
): PlanetEcology {
  // Regions are named for their village, so the village's position on the
  // original flat map is the region's centre on the globe.
  const centres = new Map<string, Vector3>()
  for (const village of world.villages) {
    const ll = canvasToLatLon(village.position, SOURCE_WIDTH, SOURCE_HEIGHT)
    const dir = latLonToVec3(ll, 1)
    centres.set(village.id, new Vector3(dir.x, dir.y, dir.z).normalize())
  }

  let painted = Number.NaN

  function update(state: WorldState): void {
    const total = state.ecology.reduce((sum, r) => sum + r.vegetation, 0)
    if (Math.abs(total - painted) < REPAINT_THRESHOLD) return
    painted = total

    const regions = []
    for (const region of state.ecology) {
      const direction = centres.get(region.regionId)
      if (!direction) continue
      regions.push({
        direction,
        vegetation: region.vegetation,
        extent: REGION_EXTENT,
      })
    }
    planet.setVegetation(regions)
  }

  update(world)
  return { update }
}
