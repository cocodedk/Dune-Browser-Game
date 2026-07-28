// src/game-render/planet/PlayerBeacon.ts
// You, on the globe.
//
// The markers already spend their two static channels: spire colour is
// faction, ring colour and size is allegiance. A third static glyph would
// collide with both and read as noise among nineteen of them. So this uses
// the channel nothing else does — motion — because one moving object among
// nineteen still ones is what peripheral vision is built to find.
//
// Deliberately carries no label. The name lives in the position strip, so the
// beacon adds nothing to a globe whose labels already fade out at distance to
// stop them piling up.

import {
  Group, Mesh, CylinderGeometry, MeshBasicMaterial, AdditiveBlending, Vector3,
} from 'three'
import type { PerspectiveCamera } from 'three'
import type { WorldState } from '../../types'
import { playerAnchor, anchorPoint } from '../../game-engine/position/playerAnchor'
import { latLonToVec3, canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

/**
 * Warm off-white, deliberately desaturated.
 *
 * It must never be mistaken for the ally gold that means a sietch has sworn
 * to you — that is a different fact about a different thing.
 */
const BEACON_COLOR = 0xfff2cf

const UP = new Vector3(0, 1, 0)

export interface PlayerBeacon {
  group: Group
  update(world: WorldState, camera: PerspectiveCamera, elapsedMs: number): void
  dispose(): void
}

export function createPlayerBeacon(
  planetRadius: number,
  radiusAt: (direction: Vector3) => number,
): PlayerBeacon {
  const group = new Group()
  group.name = 'player-beacon'

  const height = planetRadius * 0.15
  const geometry = new CylinderGeometry(
    planetRadius * 0.004, planetRadius * 0.012, height, 6, 1, true,
  )
  // Based at its origin so it stands on the surface rather than half inside it.
  geometry.translate(0, height / 2, 0)

  const material = new MeshBasicMaterial({
    color: BEACON_COLOR,
    transparent: true,
    opacity: 0.75,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
  })

  const shaft = new Mesh(geometry, material)
  shaft.name = 'beacon:player'
  shaft.renderOrder = 12
  group.add(shaft)

  const toCamera = new Vector3()
  const outward = new Vector3()

  return {
    group,
    update(world, camera, elapsedMs): void {
      const anchor = playerAnchor(
        world, p => canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT),
      )
      if (!anchor) {
        shaft.visible = false
        return
      }

      // Standing still or mid-flight, this is the same call — so a player who
      // pops back to orbit during a trip sees themselves out over the sand.
      const here = anchorPoint(anchor)
      const dir = latLonToVec3(here, 1)
      outward.set(dir.x, dir.y, dir.z).normalize()

      // The same horizon test the markers use, or it shines through the planet
      // and tells the player they are on a face they cannot see.
      const distance = camera.position.length()
      toCamera.copy(camera.position).normalize()
      shaft.visible = distance > 0 && outward.dot(toCamera) > planetRadius / distance
      if (!shaft.visible) return

      shaft.position.copy(outward).multiplyScalar(radiusAt(outward))
      shaft.quaternion.setFromUnitVectors(UP, outward)

      // Slow, lighthouse-like. Fast would read as an alarm.
      const pulse = Math.sin(elapsedMs * 0.005)
      shaft.scale.set(1, 1 + pulse * 0.22, 1)
      material.opacity = 0.62 + pulse * 0.2
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      group.clear()
    },
  }
}
