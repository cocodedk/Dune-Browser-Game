// landscape-shop/sietch/src/model/surface/chisel.ts
// ADZE MARKS. Every box-shaped mass in the hall — the ramp treads, the
// stair, the tier walkway, the jambs, the pier — was cut by hand with the
// same tool, and this is that tool's signature: parallel strokes running
// one way across the stone, at one angle, because one crew swung one way.
// It is the only tiling map in the set, and it is the only place a
// direction is not derived from world position, so it is kept coarse and
// weak: it says "cut by hand", nothing more.
//
// Tileable by construction — the stroke wavevector is a pair of INTEGERS,
// so the pattern is exactly periodic on the unit tile and no seam can
// appear where the map wraps.

import { clamp01 } from './curves'

export const CHISEL_SIZE = 128

// Two crossing stroke directions, both integer wavevectors: the coarse
// swing of the adze and the finer trimming passes taken back across it.
// Crossed strokes are why this reads as tooth rather than as corduroy.
//
// It used to carry four ROUND SCARS as well. They were removed after the
// render showed them for what they are at this tiling: a polka-dot grid
// repeating across every flat face in the hall. A round dent has no
// direction, so it had no business in a set whose whole R2 bar is named
// directional forms — and at any strength where it was visible, it was
// visible as a pattern.
const COARSE_K = [3, 5]
const COARSE_DEPTH = 0.0026
const FINE_K = [7, -4]
const FINE_DEPTH = 0.0013

function heightAt(u: number, v: number): number {
  const coarse = (1 - Math.cos((COARSE_K[0] * u + COARSE_K[1] * v) * Math.PI * 2)) / 2
  const fine = (1 - Math.cos((FINE_K[0] * u + FINE_K[1] * v) * Math.PI * 2)) / 2
  return -(COARSE_DEPTH * coarse + FINE_DEPTH * fine)
}

export interface ChiselBake {
  normalMap: Uint8Array
  roughnessMap: Uint8Array
  size: number
}

/** Normal + roughness for the tiling adze map. Heights are in tile units,
 *  not metres — the map is applied at whatever scale a mass's own box UVs
 *  give it, so an absolute depth would be meaningless. */
export function bakeChisel(): ChiselBake {
  const size = CHISEL_SIZE
  const heights = new Float32Array(size * size)
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      heights[row * size + col] = heightAt((col + 0.5) / size, (row + 0.5) / size)
    }
  }

  const normalMap = new Uint8Array(size * size * 4)
  const roughnessMap = new Uint8Array(size * size * 4)
  const at = (col: number, row: number): number =>
    heights[((row + size) % size) * size + ((col + size) % size)]
  // Heights are tile units and so is the texel spacing: differentiating
  // in the same units keeps the slope honest.
  const scale = 1 / size

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const o = (row * size + col) * 4
      const dx = (at(col + 1, row) - at(col - 1, row)) / (2 * scale)
      const dy = (at(col, row + 1) - at(col, row - 1)) / (2 * scale)
      const length = Math.hypot(dx, dy, 1)
      normalMap[o] = Math.round(((-dx / length) * 0.5 + 0.5) * 255)
      normalMap[o + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255)
      normalMap[o + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255)
      normalMap[o + 3] = 255

      // A stroke's floor is rougher than the stone it was struck out of.
      const r = Math.round(clamp01(0.94 + 4 * -at(col, row)) * 255)
      roughnessMap[o] = r
      roughnessMap[o + 1] = r
      roughnessMap[o + 2] = r
      roughnessMap[o + 3] = 255
    }
  }

  return { normalMap, roughnessMap, size }
}
