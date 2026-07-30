// src/game-render/planet/reliefShading.ts
// Split the globe's relief into two channels: how far a vertex may actually
// move (silhouette) and how dark or bright it paints (shading).
//
// The critique's number: RELIEF 0.055 times the rock biome's 2.05 multiplier
// put displacement up to ~11% of radius on the limb — Earth is ~0.1%, and
// even stylised planets stay under ~2%. But sampling the real seeded field —
// scripted arithmetic against the actual createNoiseField/surfaceHeight
// implementation, not a rendered frame — showed the *median* erg height
// alone, at the old 0.055 constant, already
// displaced ~3.5% of radius (h clustered around 0.5-0.8 across a full
// lat/lon sweep, not just the reported [0.35, 1.2] extremes). A clamp with
// the base relief left untouched would not fix the potato — it would
// flatten almost the whole globe onto one plateau at the clamp, which is a
// different way to erase the dunes.
// So both move: PlanetMode's RELIEF constant comes down to keep typical
// terrain safely under the cap, and this cap exists to stop the outliers
// (mountain chains, massif uplift) from ever pushing a vertex past it.

import { Vector3 } from 'three'
import type { NoiseField } from '../terrain/noise'
import { surfaceHeight } from './planetField'

/**
 * Displacement ceiling, as a fraction of radius. Chosen to sit at the
 * critique's own "stylised planets stay under ~2%" line.
 */
export const SILHOUETTE_CAP = 0.02

/**
 * The relief actually applied to a vertex's position, clamped to the
 * silhouette cap.
 *
 * @param height Raw noise sample from {@link surfaceHeight}, roughly 0.3..1.2
 *   across the real field (sampled, not assumed).
 * @param relief Global relief scale (PlanetMode's RELIEF constant).
 * @param biomeRelief Per-biome multiplier from biomeAt — rock and massif
 *   uplift are what push this past the cap; erg alone rarely does.
 */
export function clampedRelief(
  height: number, relief: number, biomeRelief: number,
): number {
  const raw = height * relief * biomeRelief
  return Math.max(-SILHOUETTE_CAP, Math.min(SILHOUETTE_CAP, raw))
}

// Matches the epsilon the tuning script used to measure real slope magnitudes
// against this exact field (p50 ~1.9, p90 ~4.1, p99 ~7.6 in that sample) —
// changing it here without re-measuring would silently invalidate the gains
// below.
const SLOPE_EPSILON = 0.01

/**
 * Local gradient magnitude of {@link surfaceHeight} at a point on the unit
 * sphere, via a finite difference along two tangent directions.
 *
 * Not mesh connectivity — a sphere built from lat/lon rows has no cheap
 * "neighbour" concept at the poles, but the underlying noise is a continuous
 * 3D field, so sampling it a small step away in an arbitrary tangent basis
 * works anywhere, seams included.
 */
export function slopeAt(field: NoiseField, x: number, y: number, z: number): number {
  const n = new Vector3(x, y, z)
  const reference = Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
  const t1 = new Vector3().crossVectors(reference, n).normalize()
  const t2 = new Vector3().crossVectors(n, t1).normalize()

  const h0 = surfaceHeight(field, x, y, z)
  const p1 = n.clone().addScaledVector(t1, SLOPE_EPSILON)
  const p2 = n.clone().addScaledVector(t2, SLOPE_EPSILON)
  const h1 = surfaceHeight(field, p1.x, p1.y, p1.z)
  const h2 = surfaceHeight(field, p2.x, p2.y, p2.z)

  return Math.hypot(h1 - h0, h2 - h0) / SLOPE_EPSILON
}

// height range sampled at roughly [0.35, 1.2]; this window turns that into
// 0..1 before the altitude term below scales it.
const ALTITUDE_LOW = 0.3
const ALTITUDE_HIGH = 1.2
const ALTITUDE_GAIN = 0.25
// slope p90 measured ~4.1 on the real field; a gain of 1/6 puts p90 at ~0.68
// and only the rare p99+ spikes (~7.6 and up) reach full steepness.
const SLOPE_GAIN = 1 / 6
const SLOPE_DARKEN = 0.3
const SHADE_MIN = 0.55
const SHADE_MAX = 1.3

/**
 * Per-vertex albedo multiplier standing in for the geometric relief the
 * silhouette cap above throws away — crests read brighter, steep ground
 * darker, so the biome noise still shows even where the mesh itself has
 * gone nearly spherical.
 *
 * Every constant here was set by arithmetic against the sampled height and
 * slope percentiles noted above, not by eye on a rendered globe.
 */
export function terrainShade(height: number, slope: number): number {
  const altitude = Math.max(
    0, Math.min(1, (height - ALTITUDE_LOW) / (ALTITUDE_HIGH - ALTITUDE_LOW)),
  )
  const steepness = Math.max(0, Math.min(1, slope * SLOPE_GAIN))
  const shade = 1 + (altitude - 0.5) * 2 * ALTITUDE_GAIN - steepness * SLOPE_DARKEN
  return Math.max(SHADE_MIN, Math.min(SHADE_MAX, shade))
}
