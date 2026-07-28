// src/game-engine/position/playerAnchor.ts
// PURE: where the player actually is, in degrees.
//
// One source of truth for every "you are here" mark. The globe beacon and the
// surface token both read this, so the two views cannot disagree about where
// the player is — which they did, silently, because each computed its own
// answer in its own coordinate frame.

import type { WorldState } from '../../types'
import { currentTravelProgress } from '../TravelSystem'

export interface LatLon {
  lat: number
  lon: number
}

export interface PlayerAnchor {
  /** Where the player set out from, or simply where they are. */
  from: LatLon
  /** Where they are heading, or null when standing still. */
  to: LatLon | null
  /** 0..1 along the trip. Always 0 when idle. */
  progress: number
}

/** Shortest signed longitude difference. Longitude wraps. */
export function longitudeDelta(from: number, to: number): number {
  let d = to - from
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/**
 * Interpolate between two points the short way round.
 *
 * A naive lerp puts the midpoint of 179 -> -179 at longitude 0, which is half
 * a planet from either end.
 */
export function interpolate(from: LatLon, to: LatLon, t: number): LatLon {
  const clamped = Math.min(1, Math.max(0, t))
  const lon = from.lon + longitudeDelta(from.lon, to.lon) * clamped
  return {
    lat: from.lat + (to.lat - from.lat) * clamped,
    // Normalise back into -180..180 so consumers never see 190 degrees.
    lon: ((lon + 180) % 360 + 360) % 360 - 180,
  }
}

/**
 * @param toLatLon Projection from a village's authored position to degrees.
 */
export function playerAnchor(
  world: WorldState,
  toLatLon: (p: { x: number; y: number }) => LatLon,
): PlayerAnchor | null {
  const from = world.villages.find(v => v.id === world.player.location)
  if (!from) return null

  const origin = toLatLon(from.position)
  const targetId = world.player.travelTarget

  if (world.player.state !== 'traveling' || targetId === null) {
    return { from: origin, to: null, progress: 0 }
  }

  const target = world.villages.find(v => v.id === targetId)
  if (!target) return { from: origin, to: null, progress: 0 }

  return {
    from: origin,
    to: toLatLon(target.position),
    // The engine's own clock, so a mark can never disagree with arrival.
    progress: currentTravelProgress(world),
  }
}

/** Where to draw the player right now, trip included. */
export function anchorPoint(anchor: PlayerAnchor): LatLon {
  if (!anchor.to) return anchor.from
  return interpolate(anchor.from, anchor.to, anchor.progress)
}
