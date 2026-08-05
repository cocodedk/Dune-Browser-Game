// character-shop/stilgar/src/model/geometry/shell.ts
// A closed cloth/hair shell with REAL THICKNESS everywhere, including at
// its cut edges.
//
// This is the direct fix for the artifact head.ts carried through pass 2:
// an open SphereGeometry shell has a zero-thickness rim, which renders as a
// stray hairline at grazing angles and forces DoubleSide to hide it. Here
// the patch is doubled — an outer sheet, an inner sheet pushed `thickness`
// down its own surface normal — and STITCHED all the way round its
// rectangular boundary. The result is a watertight solid whose rim is a
// visible band of cloth edge, which is what a real hood opening looks like.
//
// Same winding identity as mesh.ts: u increasing must sweep the way the
// figure's own rings do, v increasing must run upward.

import { BufferGeometry } from 'three'
import { finishGeo, type Pt } from './mesh'

/** A rectangular patch, NOT wrapped in u: u=0 and u=1 are the two cut
 *  edges (a hood's two rim sides; a beard's two ends behind the jaw). */
export type Patch = (u: number, v: number) => Pt

const EPS = 1.5e-3
const EDGE = EPS * 4

function surfaceNormal(patch: Patch, u: number, v: number): Pt {
  // Never sample the derivative at a boundary, and stay a few EPS clear of
  // one: a patch whose ring collapses to a point there (a hood peak) hands
  // back a vanishing tangent, and a normalised zero is a NaN that silently
  // poisons the whole geometry.
  const uu = Math.min(Math.max(u, EDGE), 1 - EDGE)
  const vv = Math.min(Math.max(v, EDGE), 1 - EDGE)
  const a = patch(uu - EPS, vv)
  const b = patch(uu + EPS, vv)
  const c = patch(uu, vv - EPS)
  const d = patch(uu, vv + EPS)
  const du: Pt = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const dv: Pt = [d[0] - c[0], d[1] - c[1], d[2] - c[2]]
  // n = dv x du is the outward direction under this file's winding.
  const n: Pt = [
    dv[1] * du[2] - dv[2] * du[1],
    dv[2] * du[0] - dv[0] * du[2],
    dv[0] * du[1] - dv[1] * du[0],
  ]
  const len = Math.hypot(n[0], n[1], n[2])
  return len > 1e-12 ? [n[0] / len, n[1] / len, n[2] / len] : [0, 1, 0]
}

/** Build the closed shell. `thickness` is the cloth's real depth in metres. */
export function shellGeo(patch: Patch, uSegs: number, vSegs: number, thickness: number): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const push = (p: Pt): number => {
    positions.push(p[0], p[1], p[2])
    return positions.length / 3 - 1
  }

  const outer: number[][] = []
  const inner: number[][] = []
  for (let i = 0; i <= uSegs; i++) {
    const u = i / uSegs
    const outRow: number[] = []
    const inRow: number[] = []
    for (let j = 0; j <= vSegs; j++) {
      const v = j / vSegs
      const p = patch(u, v)
      // Weld the two cut edges wherever they meet. A hood whose opening
      // has closed above the brow has u=0 and u=1 landing on the same
      // point; two coincident vertices there would each average only their
      // own side's faces and draw a shading crease straight down the front
      // of the hood — the one place nobody may see a seam.
      if (i === uSegs && dist(positions, outer[0][j], p) < 1e-9) {
        outRow.push(outer[0][j])
        inRow.push(inner[0][j])
        continue
      }
      const n = surfaceNormal(patch, u, v)
      outRow.push(push(p))
      inRow.push(push([p[0] - n[0] * thickness, p[1] - n[1] * thickness, p[2] - n[2] * thickness]))
    }
    outer.push(outRow)
    inner.push(inRow)
  }

  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      // Outer sheet faces out; inner sheet is the same quad reversed, so
      // looking into a hood shows a properly lit lining, not a backface.
      indices.push(outer[i][j], outer[i][j + 1], outer[i + 1][j])
      indices.push(outer[i + 1][j], outer[i][j + 1], outer[i + 1][j + 1])
      indices.push(inner[i][j], inner[i + 1][j], inner[i][j + 1])
      indices.push(inner[i + 1][j], inner[i + 1][j + 1], inner[i][j + 1])
    }
  }

  // Rim bands: the four boundary edges of the patch, each a strip of cloth
  // edge one `thickness` wide. This is the part the old open shell had
  // nothing at all in place of.
  for (let j = 0; j < vSegs; j++) {
    indices.push(outer[0][j], inner[0][j], outer[0][j + 1])
    indices.push(inner[0][j], inner[0][j + 1], outer[0][j + 1])
    indices.push(outer[uSegs][j], outer[uSegs][j + 1], inner[uSegs][j])
    indices.push(inner[uSegs][j], outer[uSegs][j + 1], inner[uSegs][j + 1])
  }
  for (let i = 0; i < uSegs; i++) {
    indices.push(outer[i][0], outer[i + 1][0], inner[i][0])
    indices.push(outer[i + 1][0], inner[i + 1][0], inner[i][0])
    indices.push(outer[i][vSegs], inner[i][vSegs], outer[i + 1][vSegs])
    indices.push(outer[i + 1][vSegs], inner[i][vSegs], inner[i + 1][vSegs])
  }

  return finishGeo(positions, indices)
}

function dist(positions: number[], index: number, p: Pt): number {
  return Math.hypot(
    positions[index * 3] - p[0],
    positions[index * 3 + 1] - p[1],
    positions[index * 3 + 2] - p[2],
  )
}
