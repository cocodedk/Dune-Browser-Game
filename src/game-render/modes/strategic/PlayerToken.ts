// src/game-render/modes/strategic/PlayerToken.ts
// The player's position on the map, interpolated along a trip.
//
// The engine remains the clock: progress comes from currentTravelProgress, so
// the marker can never disagree with when arrival actually fires.

import { Group, Mesh, ConeGeometry, SphereGeometry, MeshBasicMaterial } from 'three'
import type { WorldState } from '../../../types'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from './markerLayout'
import { angularDistance } from './localMap'
import type { LatLon } from './localMap'
import { canvasToLatLon } from '../../planet/sphere'
import { playerAnchor, anchorPoint, longitudeDelta } from '../../../game-engine/position/playerAnchor'

const HOVER_HEIGHT = 46
const BOB_AMPLITUDE = 3.5

export interface PlayerToken {
  group: Group
  update(world: WorldState, elapsedMs: number): void
  dispose(): void
}

/**
 * @param centre The descent point this dune field represents.
 *
 * The token used to place itself with projectToWorld — the *old global* flat
 * projection, mapping the whole canvas around the world origin. Every marker
 * beside it has been placed by localPlacements, in bearing and distance from
 * the descent centre, since the surface view learned where it was. The two
 * frames agree nowhere: even landing dead-centre put the token at a small
 * fraction of the right distance, and landing anywhere else left it hovering
 * over sand unrelated to any settlement. The one "you are here" instrument in
 * the game was pointing at the wrong place.
 */
export function createPlayerToken(
  spread: number,
  heightAt: (x: number, z: number) => number,
  centre: LatLon,
  localDegrees: number,
): PlayerToken {
  const group = new Group()
  group.name = 'player-token'

  const material = new MeshBasicMaterial({ color: 0xffffff, fog: false })
  material.depthTest = false

  // Downward cone — a pointer at the player, not an object in the world.
  const coneGeometry = new ConeGeometry(7, 18, 4)
  coneGeometry.rotateX(Math.PI)
  const cone = new Mesh(coneGeometry, material)
  cone.renderOrder = 20
  group.add(cone)

  const beadGeometry = new SphereGeometry(3.2, 10, 8)
  const bead = new Mesh(beadGeometry, material)
  bead.position.y = 14
  bead.renderOrder = 20
  group.add(bead)

  const perDegree = spread / localDegrees

  function update(world: WorldState, elapsedMs: number): void {
    const anchor = playerAnchor(world, p => canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT))
    if (!anchor) return

    const here = anchorPoint(anchor)

    // Over the horizon means over the horizon: a token for somewhere outside
    // this dune field would be a mark pointing off the edge of the world.
    if (angularDistance(centre, here) > localDegrees) {
      group.visible = false
      return
    }
    group.visible = true

    // The same frame localPlacements uses, so the token and the markers agree.
    const east = longitudeDelta(centre.lon, here.lon)
      * Math.cos((centre.lat * Math.PI) / 180)
    const target = { x: east * perDegree, z: -(here.lat - centre.lat) * perDegree }

    const bob = Math.sin(elapsedMs * 0.0022) * BOB_AMPLITUDE
    group.position.set(
      target.x,
      heightAt(target.x, target.z) + HOVER_HEIGHT + bob,
      target.z,
    )
    group.rotation.y = elapsedMs * 0.0008
  }

  return {
    group,
    update,
    dispose(): void {
      coneGeometry.dispose()
      beadGeometry.dispose()
      material.dispose()
      group.clear()
    },
  }
}
