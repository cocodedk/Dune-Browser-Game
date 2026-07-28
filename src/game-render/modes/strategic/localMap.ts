// src/game-render/modes/strategic/localMap.ts
// PURE: which settlements are near where you actually landed, and where they
// sit relative to you.
//
// The surface view is one dune field. It used to be centred on the world
// origin and always show the same central cluster, so descending over the far
// side of the planet put you in exactly the same patch of desert looking at
// exactly the same sietches. The globe had a far side; the ground did not.
//
// This maps a descent point to a local neighbourhood: everything within a few
// degrees, positioned by its bearing and distance from you.

import type { MarkerPlacement } from './markerLayout'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from './markerLayout'
import { canvasToLatLon } from '../../planet/sphere'

export interface LatLon {
  lat: number
  lon: number
}

export interface LocalSource {
  id: string
  position: { x: number; y: number }
}

/**
 * Shortest signed difference between two longitudes, in degrees.
 *
 * Longitude wraps, and a naive subtraction puts a sietch at -179 half a planet
 * away from one at +179 rather than two degrees.
 */
export function longitudeDelta(from: number, to: number): number {
  let delta = to - from
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  return delta
}

/**
 * Great-circle-ish angular distance in degrees.
 *
 * Small-angle approximation with a cosine correction on longitude, which is
 * exact enough over the few degrees this view covers and avoids trigonometry
 * per settlement per frame.
 */
export function angularDistance(a: LatLon, b: LatLon): number {
  const dLat = b.lat - a.lat
  const dLon = longitudeDelta(a.lon, b.lon) * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLon)
}

/**
 * Settlements near a descent point, placed in world XZ around the camera.
 *
 * @param centre        Where the player came down.
 * @param spread        World units per `extentDegrees` of arc.
 * @param extentDegrees Radius of the neighbourhood. Past this, a settlement is
 *   over the horizon and belongs to the globe rather than to this view.
 */
export function localPlacements(
  sources: readonly LocalSource[],
  centre: LatLon,
  spread: number,
  extentDegrees: number,
): MarkerPlacement[] {
  const out: MarkerPlacement[] = []
  const perDegree = spread / extentDegrees

  for (const source of sources) {
    const ll = canvasToLatLon(source.position, SOURCE_WIDTH, SOURCE_HEIGHT)
    if (angularDistance(centre, ll) > extentDegrees) continue

    // East is +x, north is -z, matching the flat map's original orientation.
    const east = longitudeDelta(centre.lon, ll.lon) * Math.cos((centre.lat * Math.PI) / 180)
    const north = ll.lat - centre.lat

    out.push({ id: source.id, x: east * perDegree, z: -north * perDegree })
  }
  return out
}

/**
 * A terrain seed for a place.
 *
 * Two different parts of Arrakis must not generate the same dunes, or landing
 * anywhere would look like landing everywhere. Quantised so that small camera
 * drift does not regenerate the world underfoot.
 */
export function seedForLocation(centre: LatLon, base: number): number {
  const lat = Math.round(centre.lat / 4)
  const lon = Math.round(centre.lon / 4)
  return (base ^ Math.imul(lat + 512, 73856093) ^ Math.imul(lon + 512, 19349663)) >>> 0
}

/**
 * Which patch of desert the surface view should show.
 *
 * Coming down from orbit, it is wherever the player zoomed in. Stepping out of
 * a location, it must be where they are *standing* — the descent centre is
 * whatever they last zoomed down at, which after any travel is stale and can
 * be half a planet away. Walking out of a sietch and finding a stretch of
 * desert that does not even contain it is the single worst answer to "where
 * am I".
 */
export function surfaceCentre(
  previousMode: string,
  orbitCentre: LatLon,
  playerPosition: { x: number; y: number } | undefined,
): LatLon {
  if (previousMode !== 'location' || !playerPosition) return orbitCentre
  return canvasToLatLon(playerPosition, SOURCE_WIDTH, SOURCE_HEIGHT)
}

/**
 * Where a descent from orbit should actually put the player.
 *
 * The orbit camera reports the point directly beneath itself, which is the
 * centre of the visible disc — not the sietch the player was looking at when
 * they scrolled in. Since a sietch is almost never dead-centre, zooming down
 * "on" one landed you in empty desert some degrees away from it, which reads
 * as the game ignoring you.
 *
 * So a descent snaps to the nearest settlement the player knows about, if one
 * is close enough to have plausibly been the thing they aimed at. Beyond that
 * the desert is the desert and they land where they pointed.
 */
export function descentTarget(
  centre: LatLon,
  settlements: readonly { id: string; discovered: boolean; position: { x: number; y: number } }[],
  snapDegrees = 14,
): LatLon {
  let best: LatLon | null = null
  let bestDistance = snapDegrees

  for (const s of settlements) {
    if (!s.discovered) continue
    const ll = canvasToLatLon(s.position, SOURCE_WIDTH, SOURCE_HEIGHT)
    const d = angularDistance(centre, ll)
    if (d >= bestDistance) continue
    best = ll
    bestDistance = d
  }
  return best ?? centre
}
