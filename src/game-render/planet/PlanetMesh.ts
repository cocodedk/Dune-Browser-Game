// src/game-render/planet/PlanetMesh.ts
// The globe: a sphere whose vertices are displaced by the same noise field
// that drives the flat terrain, so the dunes are genuinely on the planet
// rather than a texture wrapped around it.

import { BufferAttribute, Mesh, SphereGeometry, type Material, Vector3 } from 'three'
import { createNoiseField } from '../terrain/noise'
import { surfaceHeight, biomeFor } from './planetField'
import { clampedRelief, slopeAt, terrainShade } from './reliefShading'
import { greened } from './biomes'
import type { Massif } from './massifs'

export interface PlanetMesh {
  mesh: Mesh
  readonly radius: number
  /** Surface radius at a direction, including displacement. */
  radiusAt(direction: Vector3): number
  /**
   * Repaint the globe for the current state of the ecology.
   *
   * The whole point of greening Arrakis is that it is visible: a player who
   * has spent crews on planting instead of harvesting should be able to see
   * what they bought by looking at the planet.
   */
  setVegetation(regions: readonly VegetatedRegion[]): void
  dispose(): void
}

export interface VegetatedRegion {
  /** Unit vector to the region's centre on the sphere. */
  direction: Vector3
  /** 0..100, as the ecology system tracks it. */
  vegetation: number
  /** Angular radius of the region's influence, in radians. */
  extent: number
}

export interface PlanetOptions {
  radius: number
  seed: number
  /** Peak dune height as a fraction of radius. */
  relief: number
  /** Segments around the equator. Detail costs nothing but memory here. */
  segments: number
  /** Rock the settlements are cut into. Empty means a uniform erg. */
  massifs?: readonly Massif[]
}

export function createPlanetMesh(
  options: PlanetOptions,
  material: Material,
): PlanetMesh {
  const { radius, seed, relief, segments, massifs = [] } = options
  const field = createNoiseField(seed)

  const geometry = new SphereGeometry(radius, segments, Math.round(segments / 2))
  const position = geometry.attributes.position
  const v = new Vector3()

  // Per-vertex biome tint. The sand shader multiplies its palette by the
  // vertex colour, so this recolours ice, rock and salt pan without a second
  // material or a second draw call.
  const colors = new Float32Array(position.count * 3)
  // Kept so vegetation can be repainted later without recomputing the biomes.
  const baseTints: [number, number, number][] = new Array(position.count)

  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    const unit = v.clone().normalize()
    const biome = biomeFor(field, unit, massifs)

    const h = surfaceHeight(field, unit.x, unit.y, unit.z)
    // Geometry gets only the clamped share (see reliefShading) — the rest of
    // the noise's own range survives as a per-vertex shade instead, or rock's
    // 2.05x multiplier alone would still bulge the limb past a stylised
    // planet's silhouette.
    const r = radius * (1 + clampedRelief(h, relief, biome.relief))
    position.setXYZ(i, unit.x * r, unit.y * r, unit.z * r)

    const shade = terrainShade(h, slopeAt(field, unit.x, unit.y, unit.z))
    baseTints[i] = [biome.tint[0] * shade, biome.tint[1] * shade, biome.tint[2] * shade]
    colors[i * 3] = baseTints[i][0]
    colors[i * 3 + 1] = baseTints[i][1]
    colors[i * 3 + 2] = baseTints[i][2]
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new BufferAttribute(colors, 3))

  // Without this every face keeps the smooth sphere's normal and the relief is
  // invisible — the planet lights as if it were still a billiard ball.
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const mesh = new Mesh(geometry, material)
  mesh.name = 'planet'

  const colorAttribute = geometry.attributes.color as BufferAttribute
  const unit = new Vector3()

  return {
    mesh,
    radius,
    setVegetation(regions): void {
      // Rewrites the colour buffer in place. Cheap enough to be worth doing,
      // and called only when the ecology has actually moved — every frame
      // would be a pointless GPU upload of an unchanged buffer.
      for (let i = 0; i < position.count; i++) {
        unit.fromBufferAttribute(position, i).normalize()

        // Strongest single region wins rather than summing: overlapping
        // influences that add would push the tint past vegetation entirely.
        let strongest = 0
        for (const region of regions) {
          if (region.vegetation <= 0) continue
          const angle = Math.acos(
            Math.max(-1, Math.min(1, unit.dot(region.direction))),
          )
          if (angle >= region.extent) continue
          const falloff = 1 - angle / region.extent
          strongest = Math.max(strongest, region.vegetation * falloff * falloff)
        }

        const base = baseTints[i]
        const tint = strongest > 0 ? greened(base, strongest) : base
        colorAttribute.setXYZ(i, tint[0], tint[1], tint[2])
      }
      colorAttribute.needsUpdate = true
    },
    radiusAt(direction: Vector3): number {
      // Must apply the same clamped relief as the mesh build above, or
      // markers sink into rock and float over the pans.
      const unit = direction.clone().normalize()
      const h = surfaceHeight(field, unit.x, unit.y, unit.z)
      const biomeRelief = biomeFor(field, unit, massifs).relief
      return radius * (1 + clampedRelief(h, relief, biomeRelief))
    },
    dispose(): void {
      geometry.dispose()
    },
  }
}
