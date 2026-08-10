// landscape-shop/cliff/src/dressingR3.helpers.ts
// Measures one dressing piece off the BUILT meshes, so dressingR3.test.ts can
// stay inside the 200-line rule. Not itself a test file; no vitest here.
//
// The three dressing meshes are merged per family (model/dressing.ts), so a
// piece is a TRIANGLE SLICE of one of them. The bake records that slice; this
// walks it on the real geometry, which is what makes the guards independent of
// the placement table that produced it.

import type { BufferAttribute, Mesh, Object3D } from 'three'
import { DRESSING_BAKE, type DressPiece } from './model/dressing'

export interface PieceMeasure {
  name: string
  family: string
  anchor: string | null
  triangles: number
  min: number[]
  max: number[]
  centroid: number[]
}

const MESH_FOR: Record<string, string> = {
  rock: 'dressRock',
  sand: 'dressSand',
  goods: 'dressGoods',
}

function meshFor(root: Object3D, family: string): Mesh {
  const mesh = root.getObjectByName(MESH_FOR[family]) as Mesh | null
  if (!mesh) throw new Error(`dressing mesh for family ${family} is missing from the set`)
  return mesh
}

/** Vertex indices of triangle `t`. dressRock and dressGoods are split
 *  non-indexed for flat shading, so their triangles are consecutive vertex
 *  triples; dressSand stays indexed (see model/dressing.ts). */
function cornersOf(mesh: Mesh, t: number): [number, number, number] {
  const index = mesh.geometry.index
  if (!index) return [t * 3, t * 3 + 1, t * 3 + 2]
  return [index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2)]
}

function measure(mesh: Mesh, piece: DressPiece): PieceMeasure {
  const position = mesh.geometry.getAttribute('position') as BufferAttribute
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const sum = [0, 0, 0]
  let samples = 0
  for (let t = piece.from; t < piece.to; t++) {
    for (const corner of cornersOf(mesh, t)) {
      const point = [position.getX(corner), position.getY(corner), position.getZ(corner)]
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], point[a])
        max[a] = Math.max(max[a], point[a])
        sum[a] += point[a]
      }
      samples++
    }
  }
  if (!samples) throw new Error(`dressing piece ${piece.name} built no geometry`)
  return {
    name: piece.name,
    family: piece.family,
    anchor: piece.anchor,
    triangles: piece.to - piece.from,
    min,
    max,
    centroid: sum.map((value) => value / samples),
  }
}

export function pieceMeasurements(root: Object3D): PieceMeasure[] {
  root.updateMatrixWorld(true)
  return DRESSING_BAKE.pieces.map((piece) => measure(meshFor(root, piece.family), piece))
}
