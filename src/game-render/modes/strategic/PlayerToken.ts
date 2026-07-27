// src/game-render/modes/strategic/PlayerToken.ts
// The player's position on the map, interpolated along a trip.
//
// The engine remains the clock: progress comes from currentTravelProgress, so
// the marker can never disagree with when arrival actually fires.

import { Group, Mesh, ConeGeometry, SphereGeometry, MeshBasicMaterial } from 'three'
import type { WorldState } from '../../../types'
import { currentTravelProgress } from '../../../game-engine/TravelSystem'
import { projectToWorld } from './markerLayout'

const HOVER_HEIGHT = 46
const BOB_AMPLITUDE = 3.5

export interface PlayerToken {
  group: Group
  update(world: WorldState, elapsedMs: number): void
  dispose(): void
}

export function createPlayerToken(
  spread: number,
  heightAt: (x: number, z: number) => number,
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

  function update(world: WorldState, elapsedMs: number): void {
    const { player } = world

    const from = world.villages.find(v => v.id === player.location)
    if (!from) return

    let target = projectToWorld(from.position, spread)

    if (player.state === 'traveling' && player.travelTarget) {
      const to = world.villages.find(v => v.id === player.travelTarget)
      if (to) {
        const progress = currentTravelProgress(world)
        const a = projectToWorld(from.position, spread)
        const b = projectToWorld(to.position, spread)
        target = {
          x: a.x + (b.x - a.x) * progress,
          z: a.z + (b.z - a.z) * progress,
        }
      }
    }

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
