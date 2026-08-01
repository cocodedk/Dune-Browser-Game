// vehicle-shop/ornihopter/src/flight/groundCollision.ts
// Unconditional ground clamp. heightAt() is the same pure function that
// displaces the terrain mesh (see stage/terrain.ts), so this cannot
// disagree with what the craft appears to fly over. This clamp runs every
// step regardless of how the rest of the dynamics behaved that step, which
// is what guarantees altitude can never go negative rather than merely
// making it unlikely.

import type { Vec3 } from '../contracts'
import { normalise } from '../contracts'
import { heightAt } from '../stage/terrain'
import { scale } from './vecMath'
import { GROUND_CONTACT_DAMPING } from './constants'

export interface GroundResult {
  position: Vec3
  velocity: Vec3
  speed: number
  altitude: number
}

export function clampToGround(position: Vec3, velocity: Vec3, speed: number): GroundResult {
  const terrainHeight = heightAt(position.x, position.z)
  const altitude = position.y - terrainHeight

  if (altitude >= 0) {
    return { position, velocity, speed, altitude }
  }

  // Skim the surface rather than tunnel through it: pin height to the
  // ground and bleed a little speed, preserving the travel direction so
  // speed and |velocity| never fall out of agreement.
  const dampedSpeed = speed * GROUND_CONTACT_DAMPING
  const direction = normalise(velocity)

  return {
    position: { x: position.x, y: terrainHeight, z: position.z },
    velocity: scale(direction, dampedSpeed),
    speed: dampedSpeed,
    altitude: 0,
  }
}
