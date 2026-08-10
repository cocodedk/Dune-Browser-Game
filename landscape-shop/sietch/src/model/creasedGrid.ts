// landscape-shop/sietch/src/model/creasedGrid.ts
// SMOOTHING GROUPS FOR A SWEPT GRID — the R2.1 fix for the single worst
// line in the R2 critique: "a uniform sine-wave ripple, not shadowed
// irregular courses".
//
// The vault is a grid of quads and R2 finished it with
// computeVertexNormals(), which averages every face meeting at a vertex.
// That is right for a smooth tube and wrong for a carved one: a bedding
// course's riser is ONE quad standing at 60-80 degrees to its neighbours,
// and averaging it with them turns a step into a fillet. A fillet has a
// gradient; a step has an EDGE, and an edge is the only thing that throws
// the hard shadow line a critic reads as "carved".
//
// So: a vertex takes the average of the faces around it that point
// roughly the same way it does, and ignores the rest. Faces that disagree
// by more than the crease angle each keep their own normal, which means a
// vertex can carry two different normals and the geometry has to be
// NON-INDEXED. Triangle count is unchanged (the budget guard counts
// triangles, not vertices); only the vertex buffer grows.
//
// Everything here is plain arithmetic on typed arrays — no DOM, no WebGL,
// so the seam suite builds it in node like the rest of the set.

import { BufferGeometry, Float32BufferAttribute } from 'three'

/** Below this the cross product is rounding noise, not a direction. */
const DEGENERATE_AREA = 1e-9

export interface Grid {
  /** Rings along the sweep. */
  rows: number
  /** Points per ring. Every ring must have the same count. */
  cols: number
  /** rows * cols * 3, row-major. */
  position: Float32Array
  /** rows * cols * 2, row-major. */
  uv: Float32Array
}

/** Face normal of the quad whose lower-left grid corner is (r, s), wound
 *  exactly as the indexed path winds it (a, c, b) so the surface still
 *  faces the tube's interior. */
function quadNormals(grid: Grid): Float32Array {
  const { rows, cols, position } = grid
  const normals = new Float32Array((rows - 1) * (cols - 1) * 3)
  const at = (r: number, s: number, k: number): number => position[(r * cols + s) * 3 + k]

  for (let r = 0; r < rows - 1; r++) {
    for (let s = 0; s < cols - 1; s++) {
      const ax = at(r, s, 0), ay = at(r, s, 1), az = at(r, s, 2)
      const cx = at(r + 1, s, 0) - ax, cy = at(r + 1, s, 1) - ay, cz = at(r + 1, s, 2) - az
      const bx = at(r, s + 1, 0) - ax, by = at(r, s + 1, 1) - ay, bz = at(r, s + 1, 2) - az
      let nx = cy * bz - cz * by
      let ny = cz * bx - cx * bz
      let nz = cx * by - cy * bx
      const len = Math.hypot(nx, ny, nz)
      const o = (r * (cols - 1) + s) * 3
      // A quad with no area has no direction, and normalising one anyway
      // amplifies rounding noise into a random normal — which prints as
      // bright and dark slivers wherever the wall's samples collapse
      // together (wallSampling.ts clamps them at the floor and at the
      // spring line). Left at zero, and skipped by every reader below.
      if (len < DEGENERATE_AREA) continue
      nx /= len; ny /= len; nz /= len
      normals[o] = nx; normals[o + 1] = ny; normals[o + 2] = nz
    }
  }
  return normals
}

/** The normal a corner (i, j) should carry ON the quad (qr, qs): the mean
 *  of the up-to-four quads meeting there, keeping only the ones within
 *  the crease angle of this quad's own face. */
function cornerNormal(
  faces: Float32Array, quadCols: number, quadRows: number,
  i: number, j: number, qr: number, qs: number, cosCrease: number,
  out: [number, number, number],
): void {
  const own = (qr * quadCols + qs) * 3
  const ox = faces[own], oy = faces[own + 1], oz = faces[own + 2]
  let sx = 0, sy = 0, sz = 0
  for (const r of [i - 1, i]) {
    for (const s of [j - 1, j]) {
      if (r < 0 || s < 0 || r >= quadRows || s >= quadCols) continue
      const o = (r * quadCols + s) * 3
      const nx = faces[o], ny = faces[o + 1], nz = faces[o + 2]
      if (nx === 0 && ny === 0 && nz === 0) continue
      if (nx * ox + ny * oy + nz * oz < cosCrease) continue
      sx += nx; sy += ny; sz += nz
    }
  }
  const len = Math.hypot(sx, sy, sz)
  if (len === 0) {
    // Every face here was degenerate too: borrow the nearest real one so
    // the vertex still shades as part of the surface.
    out[0] = ox; out[1] = oy; out[2] = oz
    if (ox === 0 && oy === 0 && oz === 0) out[1] = 1
    return
  }
  out[0] = sx / len; out[1] = sy / len; out[2] = sz / len
}

/**
 * @param creaseDeg Faces meeting at more than this angle keep their own
 *   normals. ~30 degrees: the arch's own facets are a few degrees apart
 *   and must stay smooth; a course riser swings 50 degrees and more.
 */
export function buildCreasedGeometry(grid: Grid, creaseDeg: number): BufferGeometry {
  const { rows, cols, position, uv } = grid
  const faces = quadNormals(grid)
  const cosCrease = Math.cos((creaseDeg * Math.PI) / 180)
  const quadRows = rows - 1
  const quadCols = cols - 1

  const positions = new Float32Array(quadRows * quadCols * 6 * 3)
  const normals = new Float32Array(quadRows * quadCols * 6 * 3)
  const uvs = new Float32Array(quadRows * quadCols * 6 * 2)
  const n: [number, number, number] = [0, 0, 0]
  let p = 0
  let t = 0

  for (let r = 0; r < quadRows; r++) {
    for (let s = 0; s < quadCols; s++) {
      // Same six-corner order as the indexed path: a, c, b then b, c, d.
      const corners: Array<[number, number]> = [
        [r, s], [r + 1, s], [r, s + 1],
        [r, s + 1], [r + 1, s], [r + 1, s + 1],
      ]
      for (const [i, j] of corners) {
        const v = (i * cols + j) * 3
        positions[p] = position[v]
        positions[p + 1] = position[v + 1]
        positions[p + 2] = position[v + 2]
        cornerNormal(faces, quadCols, quadRows, i, j, r, s, cosCrease, n)
        normals[p] = n[0]; normals[p + 1] = n[1]; normals[p + 2] = n[2]
        const w = (i * cols + j) * 2
        uvs[t] = uv[w]
        uvs[t + 1] = uv[w + 1]
        p += 3
        t += 2
      }
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}
