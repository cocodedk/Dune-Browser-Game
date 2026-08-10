// landscape-shop/sietch/src/soot.test.ts
// R2.1 guards — the stain is ANCHORED AND ONE-SIDED. surfaceMaps.test.ts
// already asks whether the darkest rock sits near the hearth; a fresh
// critic showed that is not enough: "the dark zone sits centered
// top-of-vault regardless of the firepit's off-center position — reads as
// plain light falloff." A stain centred on the room passes a
// distance-to-hearth test and still reads as falloff. Two things have to
// be true instead, and neither can be satisfied by a symmetric wash:
//
//   IT SITS ON THE FLUE LINE. smoke.ts's story is that the smoke leaves
//   through the galleries cut in the back wall, so the plume leans from
//   DRESSING.hearthAtM toward them as it climbs. The line is built here
//   from spec.ts's hearth and galleryLayout.ts's own openings — never
//   from a constant smoke.ts also wrote.
//
//   IT IS LOPSIDED. Measured on the field, not the map: course tone
//   darkens the shell map independently of soot, and the two cannot be
//   told apart in a byte. The windows either side of the hearth are the
//   same 16 m, so the answer is not a consequence of the hall's shape.

import { describe, it, expect } from 'vitest'
import { smokeStainAt } from './model/surface/smoke'
import { shellBytes } from './model/surface/maps'
import { carvedRingAt } from './model/surface/carvedProfile'
import { CAP_Z, GALLERY_LAYOUT } from './model/galleryLayout'
import { DRESSING, FOOTPRINT } from './spec'

const [HEARTH_X, , HEARTH_Z] = DRESSING.hearthAtM
/** Where the smoke leaves: the mean of the two floor-level openings, at
 *  the plane they are cut in. */
const FLUE: [number, number] = [
  GALLERY_LAYOUT.filter((g) => g.baseY === 0).reduce((s, g) => s + g.x, 0) /
    GALLERY_LAYOUT.filter((g) => g.baseY === 0).length,
  CAP_Z,
]

const MAX_FLUE_OFFSET_M = 4
const MIN_ASYMMETRY = 4

function distanceToFlueLine(x: number, z: number): number {
  const dx = FLUE[0] - HEARTH_X
  const dz = FLUE[1] - HEARTH_Z
  const k = Math.max(0, Math.min(1,
    ((x - HEARTH_X) * dx + (z - HEARTH_Z) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - (HEARTH_X + dx * k), z - (HEARTH_Z + dz * k))
}

describe('R2.1: the soot sits on the flue line, not on the room', () => {
  it('the darkest twelfth of the shell map has its centre of mass on the hearth-to-gallery line', () => {
    const shell = shellBytes()
    const samples: Array<[number, number, number]> = []
    for (let row = 0; row < shell.height; row++) {
      const ring = carvedRingAt(-FOOTPRINT.depthM * ((row + 0.5) / shell.height))
      for (let col = 0; col < shell.width; col += 2) {
        const o = (row * shell.width + col) * 4
        const luminance = shell.map[o] * 0.3 + shell.map[o + 1] * 0.6 + shell.map[o + 2] * 0.1
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
    const offset = distanceToFlueLine(cx, cz)
    expect(
      offset,
      `soot centroid (${cx.toFixed(1)}, ${cz.toFixed(1)}) is ${offset.toFixed(1)} m off the flue line`,
    ).toBeLessThan(MAX_FLUE_OFFSET_M)
  })
})

/** Sum of the stain over a slab of roof, sampled on a fixed grid. */
function roofStain(zFrom: number, zTo: number, xFrom: number, xTo: number): number {
  let total = 0
  for (let i = 0; i <= 40; i++) {
    const x = xFrom + ((xTo - xFrom) * i) / 40
    for (let j = 0; j <= 24; j++) {
      const y = FOOTPRINT.heightM * (0.55 + 0.4 * (j / 24))
      for (let k = 0; k <= 32; k++) {
        total += smokeStainAt(x, y, zFrom + ((zTo - zFrom) * k) / 32)
      }
    }
  }
  return total
}

const HALF_WIDTH_M = FOOTPRINT.widthM / 2
const WINDOW_M = 16

describe('R2.1: the stain is lopsided, both along the hall and across it', () => {
  it('the roof toward the flue is stained many times harder than the roof toward the mouth', () => {
    const toward = roofStain(HEARTH_Z, HEARTH_Z + WINDOW_M, -HALF_WIDTH_M, HALF_WIDTH_M)
    const away = roofStain(HEARTH_Z, HEARTH_Z - WINDOW_M, -HALF_WIDTH_M, HALF_WIDTH_M)
    expect(
      toward,
      `flue side ${toward.toFixed(0)} vs mouth side ${away.toFixed(0)} over equal ${WINDOW_M} m windows`,
    ).toBeGreaterThan(MIN_ASYMMETRY * away)
    expect(toward, 'there is no stain on the roof at all').toBeGreaterThan(100)
  })

  it('and it leans to the gallery side of the hall, not down the middle', () => {
    const gallerySide = roofStain(-FOOTPRINT.depthM, 0, -HALF_WIDTH_M, 0)
    const farSide = roofStain(-FOOTPRINT.depthM, 0, 0, HALF_WIDTH_M)
    expect(
      gallerySide,
      `x<0 ${gallerySide.toFixed(0)} vs x>0 ${farSide.toFixed(0)}`,
    ).toBeGreaterThan(MIN_ASYMMETRY * farSide)
  })
})
