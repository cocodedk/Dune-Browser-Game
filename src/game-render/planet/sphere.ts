// src/game-render/planet/sphere.ts
// PURE spherical geometry helpers for the planet view.
//
// Arrakis is a world, not a sand pit. Everything here maps between the flat
// canvas coordinates the engine already uses and positions on a globe, so the
// simulation never has to know it is being drawn on a sphere.

export interface LatLon {
  /** Degrees, -90 (south) to +90 (north). */
  lat: number
  /** Degrees, -180 to +180. */
  lon: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

const DEG = Math.PI / 180

/** Position on a sphere of the given radius. */
export function latLonToVec3(pos: LatLon, radius: number): Vec3 {
  const phi = (90 - pos.lat) * DEG
  const theta = (pos.lon + 180) * DEG
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  }
}

/** Inverse of latLonToVec3, for turning a surface hit back into coordinates. */
export function vec3ToLatLon(v: Vec3): LatLon {
  const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (r === 0) return { lat: 0, lon: 0 }
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y / r))) / DEG
  const lon = Math.atan2(v.z, -v.x) / DEG - 180
  return { lat, lon: ((lon + 540) % 360) - 180 }
}

/**
 * Map the engine's flat canvas coordinates onto a band of the globe.
 *
 * Deliberately not the whole sphere: the playable region occupies a
 * recognisable continent rather than being smeared pole to pole, which would
 * make the far sietches unreachable-looking and distort the map badly at the
 * poles.
 */
export function canvasToLatLon(
  point: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number,
  spanLonDeg = 110,
  spanLatDeg = 64,
): LatLon {
  const u = point.x / sourceWidth - 0.5
  const v = point.y / sourceHeight - 0.5
  return { lat: -v * spanLatDeg, lon: u * spanLonDeg }
}

/** Great-circle angle between two points, in radians. */
export function angularDistance(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG
  const dLon = (b.lon - a.lon) * DEG
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(s)))
}

export interface ZoomRange {
  /** Camera distance from the planet centre showing the whole globe. */
  far: number
  /** Closest approach — low orbit, individual dunes readable. */
  near: number
}

/**
 * Camera distance for a zoom level in 0..1.
 *
 * Exponential rather than linear: at planetary scale a fixed step feels
 * glacial when far out and violent when close in, so each notch should move a
 * constant *fraction* of the remaining distance.
 */
export function zoomToDistance(zoom: number, range: ZoomRange): number {
  const t = Math.max(0, Math.min(1, zoom))
  return range.far * Math.pow(range.near / range.far, t)
}

/** Inverse of zoomToDistance. */
export function distanceToZoom(distance: number, range: ZoomRange): number {
  if (range.far <= 0 || range.near <= 0 || range.far === range.near) return 0
  const t = Math.log(distance / range.far) / Math.log(range.near / range.far)
  return Math.max(0, Math.min(1, t))
}

/**
 * How much of the surface is visible, as a fraction of the globe.
 * Used to fade labels in as the player descends toward the surface.
 */
export function visibleFraction(distance: number, radius: number): number {
  if (distance <= radius) return 0
  return 1 - radius / distance
}
