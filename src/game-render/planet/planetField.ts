// src/game-render/planet/planetField.ts
// The scalar fields the globe is built from: how high the ground is, and what
// kind of ground it is.
//
// Split from PlanetMesh once the settlement rock went in and the file crossed
// the repository's limit. Keeping these together matters more than the line
// count does — the mesh build and radiusAt() must sample identical fields or
// markers float over their own rock.

import { Vector3 } from 'three'
import { createNoiseField } from '../terrain/noise'
import { biomeAt } from './biomes'
import { massifUplift } from './massifs'
import type { Massif } from './massifs'

type Field = ReturnType<typeof createNoiseField>

/**
 * Ridged 3D noise sampled on the sphere's surface.
 *
 * Sampling in 3D rather than by lat/lon is what avoids the pinching and seam
 * that a 2D heightmap wrapped onto a sphere always produces at the poles and
 * the antimeridian.
 */
export function surfaceHeight(
  field: Field,
  x: number, y: number, z: number,
): number {
  // Three offset 2D slices approximate 3D noise closely enough for relief and
  // cost a third of a real 3D implementation.
  const a = field.warpedFbm(x * 1.6 + 11.3, z * 1.6 + 4.1, 4, 0.8)
  const b = field.warpedFbm(y * 1.6 + 27.7, x * 1.6 + 9.5, 4, 0.8)
  const c = field.fbm(z * 2.6 + 3.9, y * 2.6 + 18.2, 3)

  const rolling = (a + b) * 0.5
  // Ridged transform gives the crest lines that make dunes legible from orbit.
  const ridged = 1 - Math.abs(c)
  return 0.55 * (rolling * 0.5 + 0.5) + 0.45 * ridged * ridged
}

/**
 * Large-scale "continental" field: which parts of the planet are upland rock
 * and which are basin.
 *
 * Much lower frequency than the dune noise, because it decides regions rather
 * than landforms — at the dune frequency the biomes would interleave into
 * static instead of reading as places.
 */
function continentalAt(
  field: Field,
  x: number, y: number, z: number,
): number {
  const a = field.fbm(x * 1.35 + 61.4, z * 1.35 - 18.9, 3)
  const b = field.fbm(y * 1.35 + 5.2, x * 1.35 + 44.1, 3)
  // Gain 0.42 rather than 0.25: fBm does not use anything like its nominal
  // range, so the narrower mapping left the field bunched around 0.5 and the
  // rock and pan biomes effectively unreachable.
  return Math.min(1, Math.max(0, (a + b) * 0.42 + 0.5))
}

/**
 * Biome at a point on the unit sphere.
 *
 * The single place settlement rock is injected, and it has to stay single:
 * the mesh build and radiusAt both come through here, so adding the uplift
 * anywhere else would let markers float over their own rock or sink into it.
 */
export function biomeFor(
  field: Field,
  unit: Vector3,
  massifs: readonly Massif[],
): ReturnType<typeof biomeAt> {
  // asin of y is the latitude for a unit vector, no trig on the caller's part.
  const latitude = (Math.asin(Math.max(-1, Math.min(1, unit.y))) * 180) / Math.PI
  const longitude = (Math.atan2(unit.z, unit.x) * 180) / Math.PI

  // Added to the *continental field*, not to the biome weights. The rock edge
  // is then the level set of noise-plus-uplift, so the same fBm that draws
  // every other rock province draws these coastlines and they cannot read as
  // circles.
  const continental = continentalAt(field, unit.x, unit.y, unit.z)
    + massifUplift(latitude, longitude, massifs)

  return biomeAt(latitude, Math.min(1, continental))
}
