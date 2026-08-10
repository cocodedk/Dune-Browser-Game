// landscape-shop/sietch/src/surfaceMaps.test.ts
// R2 guards — what is actually IN the baked bytes. These read the same
// Uint8Arrays the renderer uploads, so they cannot pass on a field
// function that is correct but never reaches a map.
//
// The two that carry the round's bar:
//   "named forms, not noise" is measured as a DIRECTION — across the
//   courses the wall varies a lot, along them almost not at all. Noise
//   would vary equally both ways, and no threshold on "how much texture
//   is there" could tell the two apart.
//   "anchored, not sprayed" is measured as a POSITION — the soot's own
//   centre of mass has to sit near the hearth spec.ts names.

import { describe, it, expect } from 'vitest'
import { floorBytes, shellBytes, wallBytes, FLOOR_MAP_SIZE, WALL_MAP_SIZE } from './model/surface/maps'
import { sampleFloor } from './model/surface/sample'
import { smokeStainAt, POOL_CENTRE } from './model/surface/smoke'
import { carvedRingAt } from './model/surface/carvedProfile'
import { beddingLiftAt } from './model/surface/bedding'
import { CAP_Z } from './model/galleryLayout'
import { DRESSING, FOOTPRINT } from './spec'

const [WALL_W, WALL_H] = WALL_MAP_SIZE
const [FLOOR_W, FLOOR_H] = FLOOR_MAP_SIZE

function luminanceAt(data: Uint8Array, width: number, col: number, row: number): number {
  const o = (row * width + col) * 4
  return data[o] * 0.3 + data[o + 1] * 0.6 + data[o + 2] * 0.1
}

function deviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
}

// A clear window on the back wall: right of galleryLeftB's jamb and left
// of galleryRightHigh's, below the height the smoke pools at, so what is
// measured is bedding and nothing else.
const WINDOW_X_M = [-1, 5]
const WINDOW_Y_M = [0.8, 7.0]
const colOfX = (x: number): number => Math.round((x / FOOTPRINT.widthM + 0.5) * WALL_W)
const rowOfY = (y: number): number => Math.round((y / FOOTPRINT.heightM) * WALL_H)

describe('R2: the bands have a direction — named forms, not noise', () => {
  it('the back wall varies far more ACROSS its courses than along them', () => {
    const wall = wallBytes().map
    const [c0, c1] = WINDOW_X_M.map(colOfX)
    const [r0, r1] = WINDOW_Y_M.map(rowOfY)

    // Across the courses: the mean of each row, walked bottom to top.
    const acrossCourses: number[] = []
    for (let row = r0; row < r1; row++) {
      let sum = 0
      for (let col = c0; col < c1; col++) sum += luminanceAt(wall, WALL_W, col, row)
      acrossCourses.push(sum / (c1 - c0))
    }
    // Along them: how much a single row wanders left to right, averaged.
    let alongCourses = 0
    for (let row = r0; row < r1; row++) {
      const line: number[] = []
      for (let col = c0; col < c1; col++) line.push(luminanceAt(wall, WALL_W, col, row))
      alongCourses += deviation(line)
    }
    alongCourses /= r1 - r0

    // R2.1: 4 -> 4.6. Measured 4.98 after the courses were re-authored.
    // The bar can only go up: the dip fights this ratio (a course running
    // downhill inside the window IS along-course variation), so it is
    // also the number that caps DIP_PER_M — see bedding.ts.
    const ratio = deviation(acrossCourses) / (alongCourses || 1e-6)
    expect(ratio, `across/along = ${ratio.toFixed(2)} — the bands lost their direction`)
      .toBeGreaterThan(4.6)
  })

  it('the same courses run round the shell as run across the back wall', () => {
    // Binned in BEDDING coordinates, not world height. The courses dip
    // across the hall and swell along it (bedding.ts), so "the same
    // course" means the same height ABOVE THE BEDDING, and a test that
    // binned raw Y would be measuring the dip instead of the courses —
    // measured: it scored 0.41 and the courses were fine.
    const shell = shellBytes()
    const wall = wallBytes()
    const bins = 26
    const range = [0.5, 7.0]
    const gather = (
      width: number, height: number, data: Uint8Array,
      worldAt: (col: number, row: number) => [number, number, number],
      step: number,
    ): number[] => {
      const sum = new Float64Array(bins)
      const count = new Float64Array(bins)
      for (let row = 0; row < height; row += step) {
        for (let col = 0; col < width; col += step) {
          const [x, y, z] = worldAt(col, row)
          const bed = y - beddingLiftAt(x, z, FOOTPRINT.depthM)
          const bin = Math.floor(((bed - range[0]) / (range[1] - range[0])) * bins)
          if (bin < 0 || bin >= bins) continue
          sum[bin] += luminanceAt(data, width, col, row)
          count[bin]++
        }
      }
      return [...sum].map((s, i) => (count[i] ? s / count[i] : NaN))
    }

    let ring = carvedRingAt(0)
    let cachedRow = -1
    const shellProfile = gather(shell.width, shell.height, shell.map, (col, row) => {
      if (row !== cachedRow) {
        ring = carvedRingAt(-FOOTPRINT.depthM * ((row + 0.5) / shell.height))
        cachedRow = row
      }
      const u = (col + 0.5) / shell.width
      let k = 1
      while (k < ring.u.length - 1 && ring.u[k] < u) k++
      return [ring.points[k].x, ring.points[k].y, ring.z]
    }, 1)
    const wallProfile = gather(wall.width, wall.height, wall.map, (col, row) => [
      ((col + 0.5) / wall.width - 0.5) * FOOTPRINT.widthM,
      ((row + 0.5) / wall.height) * FOOTPRINT.heightM,
      CAP_Z,
    ], 1)

    const pairs = shellProfile
      .map((s, i) => [s, wallProfile[i]])
      .filter(([s, w]) => Number.isFinite(s) && Number.isFinite(w))
    const correlation = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]))
    // R2.1: 0.6 -> 0.85. Measured 0.93 once the back wall grew real
    // course slabs (backWallCourses.ts) off the same table the shell uses.
    expect(correlation, `shell/wall course profiles correlate ${correlation.toFixed(2)}`)
      .toBeGreaterThan(0.85)
  })
})

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n
  const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / (Math.sqrt(da * db) || 1e-9)
}

describe('R2: the soot is anchored to the hearth, not sprayed on the vault', () => {
  it('the darkest quarter of the shell map has its centre of mass over the hearth', () => {
    const shell = shellBytes()
    const samples: Array<[number, number, number]> = [] // x, z, darkness
    for (let row = 0; row < shell.height; row++) {
      const ring = carvedRingAt(-FOOTPRINT.depthM * ((row + 0.5) / shell.height))
      for (let col = 0; col < shell.width; col += 2) {
        const luminance = luminanceAt(shell.map, shell.width, col, row)
        const u = (col + 0.5) / shell.width
        let k = 1
        while (k < ring.u.length - 1 && ring.u[k] < u) k++
        samples.push([ring.points[k].x, ring.z, luminance])
      }
    }
    samples.sort((p, q) => p[2] - q[2])
    const darkest = samples.slice(0, Math.floor(samples.length / 12))
    const cx = darkest.reduce((s, p) => s + p[0], 0) / darkest.length
    const cz = darkest.reduce((s, p) => s + p[1], 0) / darkest.length
    const offset = Math.hypot(cx - DRESSING.hearthAtM[0], cz - DRESSING.hearthAtM[2])
    // R2.1: 12 -> 10.5 m. Measured 9.7 once smoke.ts's lean stopped
    // pulling the plume toward the centreline. soot.test.ts adds the two
    // guards this one is too loose to make: where the centroid sits
    // RELATIVE TO THE FLUE, and that the stain is one-sided at all.
    expect(offset, `soot centroid (${cx.toFixed(1)}, ${cz.toFixed(1)}) is ${offset.toFixed(1)} m from the hearth`)
      .toBeLessThan(10.5)
  })

  it('leaves rock far from the plume completely clean', () => {
    expect(smokeStainAt(POOL_CENTRE[0], FOOTPRINT.heightM * 0.9, POOL_CENTRE[1])).toBeGreaterThan(0.7)
    // the far side of the hall, at the same height
    expect(smokeStainAt(POOL_CENTRE[0] + 24, FOOTPRINT.heightM * 0.9, POOL_CENTRE[1])).toBe(0)
    // and the floor beside the fire, which a sprayed stain would catch
    expect(smokeStainAt(DRESSING.hearthAtM[0], 1.0, DRESSING.hearthAtM[2])).toBe(0)
  })
})

describe('R2: the floor is polished where the feet go and nowhere else', () => {
  it('the mouth-to-hearth line is measurably smoother than the rock beside it', () => {
    const onPath = sampleFloor(-3.5, -32).roughness
    const beside = sampleFloor(6.5, -32).roughness
    expect(beside - onPath, `path ${onPath.toFixed(2)} vs beside ${beside.toFixed(2)}`)
      .toBeGreaterThan(0.25)
  })

  it('bakes that difference into the roughness map, not just the field', () => {
    const floor = floorBytes()
    const at = (x: number, z: number): number => {
      const col = Math.round((x / FOOTPRINT.widthM + 0.5) * FLOOR_W)
      const row = Math.round((-z / FOOTPRINT.depthM) * FLOOR_H)
      return floor.roughnessMap[(row * FLOOR_W + col) * 4 + 1]
    }
    expect(at(6.5, -32) - at(-3.5, -32), 'the polish never reached the map').toBeGreaterThan(60)
  })
})
