// landscape-shop/sietch/src/model/surface/maps.ts
// The four baked map sets, and the world lookup each one is baked
// through. Bytes are baked ONCE at module scope and shared; the
// DataTexture objects wrapping them are new on every createSietch() call
// so each set disposes exactly what it made. The seam suite builds the
// set a dozen times a run, and a quarter of a million texel evaluations
// per build would turn a fast suite into a slow one.

import {
  ClampToEdgeWrapping, DataTexture, LinearFilter, LinearMipmapLinearFilter,
  NoColorSpace, RepeatWrapping, SRGBColorSpace,
} from 'three'
import { FOOTPRINT } from '../../spec'
import { CAP_Z } from '../galleryLayout'
import { bakeSurface, type BakedMaps } from './bake'
import { bakeChisel, type ChiselBake } from './chisel'
import { carvedRingAt } from './carvedProfile'
import { sampleFloor, sampleShell, sampleWall } from './sample'

export const SHELL_MAP_SIZE: [number, number] = [1024, 64]
export const WALL_MAP_SIZE: [number, number] = [384, 256]
export const FLOOR_MAP_SIZE: [number, number] = [256, 256]

export interface MapSet {
  map: DataTexture
  normalMap: DataTexture
  roughnessMap: DataTexture
}

function wrap(
  data: Uint8Array, width: number, height: number, srgb: boolean,
  repeat: [number, number] = [1, 1], offset: [number, number] = [0, 0],
  wrapping: typeof ClampToEdgeWrapping | typeof RepeatWrapping = ClampToEdgeWrapping,
): DataTexture {
  const texture = new DataTexture(data, width, height)
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  texture.wrapS = wrapping
  texture.wrapT = wrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.offset.set(offset[0], offset[1])
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function asSet(
  baked: BakedMaps, repeat?: [number, number], offset?: [number, number],
): MapSet {
  const { width, height } = baked
  return {
    map: wrap(baked.map, width, height, true, repeat, offset),
    normalMap: wrap(baked.normalMap, width, height, false, repeat, offset),
    roughnessMap: wrap(baked.roughnessMap, width, height, false, repeat, offset),
  }
}

/** The shell's U is arc length round the carved section, so a texel's
 *  world position needs that section built and walked. Rings are cached
 *  on the row, which bake.ts guarantees is walked outermost. */
function shellWorldLookup(width: number, height: number) {
  let cachedRow = -1
  let ring = carvedRingAt(0)
  return (col: number, row: number): [number, number, number] => {
    if (row !== cachedRow) {
      ring = carvedRingAt(-FOOTPRINT.depthM * ((row + 0.5) / height))
      cachedRow = row
    }
    const u = (col + 0.5) / width
    let i = 1
    while (i < ring.u.length - 1 && ring.u[i] < u) i++
    const span = ring.u[i] - ring.u[i - 1] || 1
    const f = (u - ring.u[i - 1]) / span
    const a = ring.points[i - 1]
    const b = ring.points[i]
    return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, ring.z]
  }
}

/** Arc length of the section at mid-hall, where the vault is full size —
 *  the scale the shell's U texels actually measure. */
function shellArcLengthM(): number {
  const ring = carvedRingAt(-FOOTPRINT.depthM * 0.5)
  let total = 0
  for (let i = 1; i < ring.points.length; i++) {
    total += Math.hypot(ring.points[i].x - ring.points[i - 1].x, ring.points[i].y - ring.points[i - 1].y)
  }
  return total
}

let shellBake: BakedMaps | null = null
let wallBake: BakedMaps | null = null
let floorBake: BakedMaps | null = null
let chiselBake: ChiselBake | null = null

export function shellBytes(): BakedMaps {
  if (!shellBake) {
    const [width, height] = SHELL_MAP_SIZE
    shellBake = bakeSurface({
      width, height,
      worldAt: shellWorldLookup(width, height),
      sample: sampleShell,
      metresPerTexel: [shellArcLengthM() / width, FOOTPRINT.depthM / height],
    })
  }
  return shellBake
}

export function wallBytes(): BakedMaps {
  if (!wallBake) {
    const [width, height] = WALL_MAP_SIZE
    wallBake = bakeSurface({
      width, height,
      worldAt: (col, row) => [
        ((col + 0.5) / width - 0.5) * FOOTPRINT.widthM,
        ((row + 0.5) / height) * FOOTPRINT.heightM,
        CAP_Z,
      ],
      sample: sampleWall,
      metresPerTexel: [FOOTPRINT.widthM / width, FOOTPRINT.heightM / height],
    })
  }
  return wallBake
}

export function floorBytes(): BakedMaps {
  if (!floorBake) {
    const [width, height] = FLOOR_MAP_SIZE
    floorBake = bakeSurface({
      width, height,
      worldAt: (col, row) => [
        ((col + 0.5) / width - 0.5) * FOOTPRINT.widthM,
        0,
        -((row + 0.5) / height) * FOOTPRINT.depthM,
      ],
      sample: (x, _y, z) => sampleFloor(x, z),
      metresPerTexel: [FOOTPRINT.widthM / width, FOOTPRINT.depthM / height],
    })
  }
  return floorBake
}

export function chiselBytes(): ChiselBake {
  if (!chiselBake) chiselBake = bakeChisel()
  return chiselBake
}

/** Vault and mouth collar. UV is already normalised by envelope.ts. */
export function shellMaps(): MapSet {
  return asSet(shellBytes())
}

/** Back-wall cap. ShapeGeometry's UVs are the shape's own metres, so the
 *  mapping is the metre-to-unit transform — which is exactly what makes
 *  a course on this wall the same course at the same height on the side
 *  walls beside it. */
export function wallMaps(): MapSet {
  return asSet(wallBytes(), [1 / FOOTPRINT.widthM, 1 / FOOTPRINT.heightM], [0.5, 0])
}

/** The walkable strip. UV is already normalised by floor.ts. */
export function floorMaps(): MapSet {
  return asSet(floorBytes())
}

const CHISEL_REPEAT: [number, number] = [3, 3]

export function chiselMaps(): { normalMap: DataTexture; roughnessMap: DataTexture } {
  const baked = chiselBytes()
  return {
    normalMap: wrap(baked.normalMap, baked.size, baked.size, false, CHISEL_REPEAT, [0, 0], RepeatWrapping),
    roughnessMap: wrap(baked.roughnessMap, baked.size, baked.size, false, CHISEL_REPEAT, [0, 0], RepeatWrapping),
  }
}
