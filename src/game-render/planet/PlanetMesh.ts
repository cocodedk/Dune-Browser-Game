// src/game-render/planet/PlanetMesh.ts
// The globe: a sphere whose vertices are displaced by the same noise field
// that drives the flat terrain, so the dunes are genuinely on the planet
// rather than a texture wrapped around it.

import { BufferAttribute, Mesh, SphereGeometry, type Material, Vector3 } from 'three'
import { createNoiseField } from '../terrain/noise'
import { biomeAt } from './biomes'

export interface PlanetMesh {
  mesh: Mesh
  readonly radius: number
  /** Surface radius at a direction, including displacement. */
  radiusAt(direction: Vector3): number
  dispose(): void
}

export interface PlanetOptions {
  radius: number
  seed: number
  /** Peak dune height as a fraction of radius. */
  relief: number
  /** Segments around the equator. Detail costs nothing but memory here. */
  segments: number
}

/**
 * Ridged 3D noise sampled on the sphere's surface.
 *
 * Sampling in 3D rather than by lat/lon is what avoids the pinching and seam
 * that a 2D heightmap wrapped onto a sphere always produces at the poles and
 * the antimeridian.
 */
function surfaceHeight(
  field: ReturnType<typeof createNoiseField>,
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
  field: ReturnType<typeof createNoiseField>,
  x: number, y: number, z: number,
): number {
  const a = field.fbm(x * 1.35 + 61.4, z * 1.35 - 18.9, 3)
  const b = field.fbm(y * 1.35 + 5.2, x * 1.35 + 44.1, 3)
  // Gain 0.42 rather than 0.25: fBm does not use anything like its nominal
  // range, so the narrower mapping left the field bunched around 0.5 and the
  // rock and pan biomes effectively unreachable.
  return Math.min(1, Math.max(0, (a + b) * 0.42 + 0.5))
}

/** Biome at a point on the unit sphere. */
function biomeFor(
  field: ReturnType<typeof createNoiseField>,
  unit: Vector3,
): ReturnType<typeof biomeAt> {
  // asin of y is the latitude for a unit vector, no trig on the caller's part.
  const latitude = (Math.asin(Math.max(-1, Math.min(1, unit.y))) * 180) / Math.PI
  return biomeAt(latitude, continentalAt(field, unit.x, unit.y, unit.z))
}

export function createPlanetMesh(
  options: PlanetOptions,
  material: Material,
): PlanetMesh {
  const { radius, seed, relief, segments } = options
  const field = createNoiseField(seed)

  const geometry = new SphereGeometry(radius, segments, Math.round(segments / 2))
  const position = geometry.attributes.position
  const v = new Vector3()

  // Per-vertex biome tint. The sand shader multiplies its palette by the
  // vertex colour, so this recolours ice, rock and salt pan without a second
  // material or a second draw call.
  const colors = new Float32Array(position.count * 3)

  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    const unit = v.clone().normalize()
    const biome = biomeFor(field, unit)

    const h = surfaceHeight(field, unit.x, unit.y, unit.z)
    const r = radius * (1 + h * relief * biome.relief)
    position.setXYZ(i, unit.x * r, unit.y * r, unit.z * r)

    colors[i * 3] = biome.tint[0]
    colors[i * 3 + 1] = biome.tint[1]
    colors[i * 3 + 2] = biome.tint[2]
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new BufferAttribute(colors, 3))

  // Without this every face keeps the smooth sphere's normal and the relief is
  // invisible — the planet lights as if it were still a billiard ball.
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const mesh = new Mesh(geometry, material)
  mesh.name = 'planet'

  return {
    mesh,
    radius,
    radiusAt(direction: Vector3): number {
      // Must apply the same biome relief scaling as the mesh build above, or
      // markers sink into rock and float over the pans.
      const unit = direction.clone().normalize()
      const h = surfaceHeight(field, unit.x, unit.y, unit.z)
      return radius * (1 + h * relief * biomeFor(field, unit).relief)
    },
    dispose(): void {
      geometry.dispose()
    },
  }
}
