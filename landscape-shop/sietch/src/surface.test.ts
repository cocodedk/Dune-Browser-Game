// landscape-shop/sietch/src/surface.test.ts
// R2 guards — surface and materials. seam.test.ts is lead-owned and
// already exactly 200 lines, so the round's own measurements live here.
// Everything below is measured off the real geometry or the real baked
// bytes; nothing is asserted from a constant this layer also wrote.
//
// The load-bearing one is the first: R2 was allowed to change geometry
// only if the massing did not move, and the whole guarantee reduces to
// "displacement is inward-only, and exactly zero at the four vertices the
// footprint is measured from". If that ever breaks, seam.test.ts's 1%
// bbox guards break too — but they break as a mystery, and this one
// breaks with a point index.

import { describe, it, expect } from 'vitest'
import type { DataTexture, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { createSietch } from './model/Sietch'
import { meshesOf } from './testHelpers'
import {
  buildVaultProfile, PROFILE_POINT_COUNT, SPRING_LEFT_INDEX, SPRING_RIGHT_INDEX,
} from './model/crossSection'
import { vaultScaleAt } from './model/vaultScale'
import { vaultAsymmetryAt } from './model/vaultAsymmetry'
import {
  carvedRingAt, protectionGate, proudAt, RING_COUNT, ringZ,
} from './model/surface/carvedProfile'
import { chatterProudAt, CROWN_CLEAR_T, ridgeProudAt } from './model/surface/carveSweep'
import { BEDDED_TOP_Y_M, bedProudAt } from './model/surface/bedding'
import { FLOOR_MAP_SIZE, SHELL_MAP_SIZE, WALL_MAP_SIZE } from './model/surface/maps'
import { FOOTPRINT } from './spec'

const MEASURED_VERTICES = [0, SPRING_LEFT_INDEX, SPRING_RIGHT_INDEX, PROFILE_POINT_COUNT - 1]

function baseRingAt(z: number) {
  const scale = vaultScaleAt(z)
  return buildVaultProfile(
    (FOOTPRINT.widthM / 2) * scale, FOOTPRINT.heightM * scale,
    vaultAsymmetryAt(z, FOOTPRINT.depthM),
  )
}

describe('R2: the carving is massing-invariant by construction', () => {
  it('stands proud inward only, at every ring and every point', () => {
    for (let r = 0; r < RING_COUNT; r++) {
      const z = ringZ(r)
      const t = -z / FOOTPRINT.depthM
      const base = baseRingAt(z)
      for (let i = 0; i < base.points.length; i++) {
        expect(
          proudAt(i, base.points[i], t),
          `point ${i} at z=${z} is displaced OUTWARD`,
        ).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('never pushes a carved point past the ring\'s own spec\'d half-width or height', () => {
    for (let r = 0; r < RING_COUNT; r++) {
      const z = ringZ(r)
      const scale = vaultScaleAt(z)
      const maxX = (FOOTPRINT.widthM / 2) * scale + 1e-9
      const maxY = FOOTPRINT.heightM * scale + 1e-9
      for (const p of carvedRingAt(z).points) {
        expect(Math.abs(p.x), `x past the wall at z=${z}`).toBeLessThanOrEqual(maxX)
        expect(p.y, `y past the crown at z=${z}`).toBeLessThanOrEqual(maxY)
      }
    }
  })

  it('leaves the four measured vertices EXACTLY where R1 put them', () => {
    for (const i of MEASURED_VERTICES) expect(protectionGate(i)).toBe(0)
    for (let r = 0; r < RING_COUNT; r++) {
      const z = ringZ(r)
      const base = baseRingAt(z).points
      const carved = carvedRingAt(z).points
      for (const i of MEASURED_VERTICES) {
        expect(carved[i].x, `vertex ${i} moved in x at z=${z}`).toBeCloseTo(base[i].x, 12)
        expect(carved[i].y, `vertex ${i} moved in y at z=${z}`).toBeCloseTo(base[i].y, 12)
      }
    }
  })

  it('leaves the crown unscored where the vault reaches its full height', () => {
    // R2.1: swept across the ARCH as well as along the hall. The ridges
    // now carry a skew, so a ridge's own line sits at a different depth
    // at each point along the arch and "clear at the crown vertex" is no
    // longer the same statement as "clear everywhere in the gap".
    for (let t = CROWN_CLEAR_T.min; t <= CROWN_CLEAR_T.max; t += 0.004) {
      for (let a = 0; a <= 1; a += 0.05) {
        expect(ridgeProudAt(t, a), `a sweep ridge entered the crown gap at t=${t}, a=${a}`).toBe(0)
      }
      expect(chatterProudAt(t), `chatter entered the crown gap at t=${t}`).toBe(0)
    }
    // and bedding stops below the massive stone the crown is cut through
    expect(bedProudAt(BEDDED_TOP_Y_M + 1.5)).toBe(0)
  })
})

describe('R2: the material family is small, mapped, and node-safe', () => {
  it('is exactly six materials, every map a DataTexture at its spec\'d size', () => {
    const set = createSietch()
    const meshes = meshesOf(set.root as unknown as Object3D)
    const materials = new Set(meshes.map((m) => m.material as MeshStandardMaterial))
    expect(materials.size, 'the family grew past six materials').toBe(6)

    const sizes = new Map<string, [number, number]>()
    const seen = new Set<DataTexture>()
    for (const material of materials) {
      for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
        if (!texture) continue
        // DataTexture, never CanvasTexture: the whole surface layer has to
        // bake in node, with no DOM and no WebGL (the house rule).
        const map = texture as DataTexture
        expect(map.isDataTexture, 'a map is not a DataTexture').toBe(true)
        const { data, width, height } = map.image
        expect(data?.byteLength, 'a map has no pixel data').toBe(width * height * 4)
        seen.add(map)
        sizes.set(`${width}x${height}`, [width, height])
      }
    }
    for (const [w, h] of [SHELL_MAP_SIZE, WALL_MAP_SIZE, FLOOR_MAP_SIZE]) {
      expect(sizes.has(`${w}x${h}`), `no map baked at ${w}x${h}`).toBe(true)
    }
    const bytes = [...seen].reduce((sum, t) => sum + t.image.width * t.image.height * 4, 0)
    expect(bytes, `texture memory ${bytes} B`).toBeLessThanOrEqual(3_500_000)
    set.dispose()
  })

  it('disposes every texture it created, not just the materials', () => {
    const set = createSietch()
    const meshes = meshesOf(set.root as unknown as Object3D)
    const maps: DataTexture[] = []
    for (const mesh of meshes) {
      const material = mesh.material as MeshStandardMaterial
      for (const map of [material.map, material.normalMap, material.roughnessMap]) {
        if (map && !maps.includes(map as DataTexture)) maps.push(map as DataTexture)
      }
    }
    const freed = new Set<DataTexture>()
    for (const map of maps) map.addEventListener('dispose', () => freed.add(map))
    set.dispose()
    for (const map of maps) expect(freed.has(map), 'a DataTexture leaked past dispose()').toBe(true)
  })
})

describe('R2: the carving stayed inside its triangle budget', () => {
  it('is under 40,000 triangles', () => {
    const set = createSietch()
    let triangles = 0
    for (const mesh of meshesOf(set.root as unknown as Object3D) as Mesh[]) {
      const geometry = mesh.geometry
      triangles += geometry.index
        ? geometry.index.count / 3
        : geometry.attributes.position.count / 3
    }
    expect(triangles, `${triangles} triangles`).toBeLessThanOrEqual(40_000)
    set.dispose()
  })
})
