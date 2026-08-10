// character-shop/chani/src/model/face/mesh.ts
// Triangulates a parametric surface into one closed solid.
//
// Winding is (row, row+1, column+1) — the identical hand loft.ts uses, so
// the face normal comes out as up x d(theta), which points OUT. This is
// not a style choice: chani's R1 limbs shipped wound inside-out for two
// passes and rendered as flat panels, because inverted normals change the
// shading and never the silhouette. depth.test.ts measures the signed
// volume of every mass this builds.

import { Mesh, BufferGeometry, Float32BufferAttribute, type MeshStandardMaterial } from 'three'
import type { Pt } from './surface'

interface Options {
  /** Columns around the surface. */
  uSegs: number
  /** Rows up the profile, not counting the apex. */
  vSegs: number
  /** Collapse the top row to a single vertex on the axis. */
  apexTop?: boolean
  /** Fan the bottom row to a hub at its own centroid. */
  capBottom?: boolean
}

export function surfaceMesh(
  surface: (u: number, v: number) => Pt,
  material: MeshStandardMaterial,
  { uSegs, vSegs, apexTop = true, capBottom = true }: Options,
): Mesh {
  const positions: number[] = []
  const indices: number[] = []
  const rows = apexTop ? vSegs : vSegs + 1

  for (let i = 0; i < rows; i++) {
    const v = i / vSegs
    for (let j = 0; j < uSegs; j++) positions.push(...surface(j / uSegs, v))
  }

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < uSegs; j++) {
      const jn = (j + 1) % uSegs
      const a = i * uSegs + j
      const b = i * uSegs + jn
      const c = (i + 1) * uSegs + j
      const d = (i + 1) * uSegs + jn
      indices.push(a, c, b, b, c, d)
    }
  }

  const topRow = (rows - 1) * uSegs
  if (apexTop) {
    const [, ay, az] = surface(0, 1)
    const apex = positions.length / 3
    positions.push(0, ay, az)
    for (let j = 0; j < uSegs; j++) {
      indices.push(apex, topRow + ((j + 1) % uSegs), topRow + j)
    }
  }

  if (capBottom) {
    let cy = 0
    let cz = 0
    for (let j = 0; j < uSegs; j++) {
      cy += positions[j * 3 + 1]
      cz += positions[j * 3 + 2]
    }
    const hub = positions.length / 3
    positions.push(0, cy / uSegs, cz / uSegs)
    for (let j = 0; j < uSegs; j++) indices.push(hub, j, (j + 1) % uSegs)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new Mesh(geometry, material)
}
