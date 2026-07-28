// src/game-render/planet/WormSign.ts
// Marks the sand where a maker took a crew.
//
// A worm attack that produces one line in a scrolling event log is an attack
// the player misses. This puts it on the planet: a dull red ring over the
// field, fading across the days afterwards, so the map remembers what happened
// there and the player has to decide whether it is worth going back.

import {
  Group, Mesh, RingGeometry, MeshBasicMaterial, DoubleSide, Vector3,
} from 'three'
import type { WorldState } from '../../types'
import { activeSightings } from '../../game-engine/worms/wormsign'
import { latLonToVec3, canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

/** Dried-blood red. Never the faction reds, so it cannot be misread as one. */
const WORM_COLOR = 0x8e2318

export interface WormSign {
  group: Group
  update(world: WorldState, daySeconds: number): void
  dispose(): void
}

const UP = new Vector3(0, 1, 0)

export function createWormSign(
  world: WorldState,
  planetRadius: number,
  radiusAt: (direction: Vector3) => number,
): WormSign {
  const group = new Group()
  group.name = 'worm-sign'

  // One ring per spice field, hidden until something happens there. Building
  // them all up front means a worm attack costs no allocation at the moment
  // it lands, which is the worst possible moment for a frame hitch.
  const geometry = new RingGeometry(planetRadius * 0.03, planetRadius * 0.05, 28)
  geometry.rotateX(-Math.PI / 2)

  const rings = new Map<string, Mesh>()
  const materials: MeshBasicMaterial[] = []

  for (const field of world.spiceFields) {
    const material = new MeshBasicMaterial({
      color: WORM_COLOR,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
      fog: false,
      depthTest: false,
    })
    materials.push(material)

    const mesh = new Mesh(geometry, material)
    mesh.name = `wormsign:${field.id}`
    mesh.renderOrder = 8
    mesh.visible = false

    const ll = canvasToLatLon(field.position, SOURCE_WIDTH, SOURCE_HEIGHT)
    const dir = latLonToVec3(ll, 1)
    const out = new Vector3(dir.x, dir.y, dir.z).normalize()
    mesh.position.copy(out).multiplyScalar(radiusAt(out))
    mesh.quaternion.setFromUnitVectors(UP, out)

    rings.set(field.id, mesh)
    group.add(mesh)
  }

  return {
    group,
    update(state: WorldState, daySeconds: number): void {
      for (const mesh of rings.values()) mesh.visible = false

      for (const sighting of activeSightings(
        state.wormSightings, state.time, daySeconds,
      )) {
        const mesh = rings.get(sighting.fieldId)
        if (!mesh) continue
        mesh.visible = true
        ;(mesh.material as MeshBasicMaterial).opacity = 0.25 + sighting.strength * 0.6
        // Swells slightly with freshness, so a new sighting catches the eye
        // against older ones that are still fading.
        mesh.scale.setScalar(1 + sighting.strength * 0.5)
      }
    },
    dispose(): void {
      geometry.dispose()
      for (const m of materials) m.dispose()
      group.clear()
    },
  }
}
