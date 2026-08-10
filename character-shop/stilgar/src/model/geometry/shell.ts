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

/** Cloth depth: one number, or a function of (u, v) for a form that has to
 *  thin to nothing at its own ends — a brow tapering to a point rather than
 *  to a barbed sliver of rim band. */
export type Thickness = number | ((u: number, v: number) => number)

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

/** Build the closed shell. `thickness` is the cloth's real depth in metres,
 *  or a per-(u, v) function of it. */
export function shellGeo(patch: Patch, uSegs: number, vSegs: number, thickness: Thickness): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const push = (p: Pt): number => {
    positions.push(p[0], p[1], p[2])
    return positions.length / 3 - 1
  }
  const depth = typeof thickness === 'number' ? () => thickness : thickness
  const sink = (p: Pt, n: Pt, t: number): Pt =>
    [p[0] - n[0] * t, p[1] - n[1] * t, p[2] - n[2] * t]

  // Rings that collapse to a single point — a hood's peak. Emitting uSegs
  // coincident copies there gives each one a normal averaged over its own
  // two faces only, which facets the crown; worse, the INNER copies are each
  // pushed down their own u's normal, so they fan out into a cone of radius
  // `thickness` that pokes back out through the outer sheet. That cone's tip
  // is the pinhole the crown has been rendering since R1. One shared vertex
  // per sheet, offset down the ring's MEAN normal, has neither problem.
  const apex: (readonly [number, number] | null)[] = []
  for (let j = 0; j <= vSegs; j++) {
    const v = j / vSegs
    const p = patch(0, v)
    if (span(patch, v) > 1e-9) {
      apex.push(null)
      continue
    }
    let nx = 0
    let ny = 0
    let nz = 0
    for (let i = 0; i < uSegs; i++) {
      const n = surfaceNormal(patch, i / uSegs, v)
      nx += n[0]
      ny += n[1]
      nz += n[2]
    }
    const len = Math.hypot(nx, ny, nz) || 1
    apex.push([push(p), push(sink(p, [nx / len, ny / len, nz / len], depth(0, v)))] as const)
  }

  // Rows where the two cut edges have MET (a hood whose opening has closed
  // above the brow, or a collapsed ring). Two coincident vertices there
  // would each average only their own side's faces and draw a shading
  // crease straight down the front of the hood.
  const welded: boolean[] = []
  for (let j = 0; j <= vSegs; j++) {
    const v = j / vSegs
    const a = patch(0, v)
    const b = patch(1, v)
    welded.push(apex[j] !== null || Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) < 1e-9)
  }

  const outer: number[][] = []
  const inner: number[][] = []
  for (let i = 0; i <= uSegs; i++) {
    const u = i / uSegs
    const outRow: number[] = []
    const inRow: number[] = []
    for (let j = 0; j <= vSegs; j++) {
      const v = j / vSegs
      const shared = apex[j]
      if (shared) {
        outRow.push(shared[0])
        inRow.push(shared[1])
        continue
      }
      if (i === uSegs && welded[j]) {
        outRow.push(outer[0][j])
        inRow.push(inner[0][j])
        continue
      }
      const p = patch(u, v)
      const n = surfaceNormal(patch, u, v)
      outRow.push(push(p))
      inRow.push(push(sink(p, n, depth(u, v))))
    }
    outer.push(outRow)
    inner.push(inRow)
  }

  // Zero-area triangles are skipped by POSITION, not just by index. A patch
  // whose thickness tapers to nothing at its own ends (brows.ts) has an outer
  // and an inner vertex at the same point there, so its rim band degenerates
  // into a line of slivers with distinct indices — invisible, but they are
  // literally the "degenerate vertices at the brow tips" a panel can measure,
  // and a mesh should not ship them.
  const tri = (a: number, b: number, c: number): void => {
    if (a === b || b === c || a === c) return
    if (same(positions, a, b) || same(positions, b, c) || same(positions, a, c)) return
    indices.push(a, b, c)
  }
  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      // Outer sheet faces out; inner sheet is the same quad reversed, so
      // looking into a hood shows a properly lit lining, not a backface.
      tri(outer[i][j], outer[i][j + 1], outer[i + 1][j])
      tri(outer[i + 1][j], outer[i][j + 1], outer[i + 1][j + 1])
      tri(inner[i][j], inner[i + 1][j], inner[i][j + 1])
      tri(inner[i + 1][j], inner[i + 1][j + 1], inner[i][j + 1])
    }
  }

  // Rim bands: the boundary edges of the patch, each a strip of cloth edge
  // one `thickness` wide — what the old open shell had nothing in place of.
  // SKIPPED across any span where the two cut edges have welded: there the
  // surface is closed, both bands collapse onto the hood's own centre front,
  // and the pair renders as a seam down the dome with the mesh non-manifold
  // along it. Where exactly one end of a span is welded the band is still
  // emitted — that quad is the real closure of the rim strip.
  for (let j = 0; j < vSegs; j++) {
    if (welded[j] && welded[j + 1]) continue
    tri(outer[0][j], inner[0][j], outer[0][j + 1])
    tri(inner[0][j], inner[0][j + 1], outer[0][j + 1])
    tri(outer[uSegs][j], outer[uSegs][j + 1], inner[uSegs][j])
    tri(inner[uSegs][j], outer[uSegs][j + 1], inner[uSegs][j + 1])
  }
  for (let i = 0; i < uSegs; i++) {
    tri(outer[i][0], outer[i + 1][0], inner[i][0])
    tri(outer[i + 1][0], inner[i + 1][0], inner[i][0])
    tri(outer[i][vSegs], inner[i][vSegs], outer[i + 1][vSegs])
    tri(outer[i + 1][vSegs], inner[i][vSegs], inner[i + 1][vSegs])
  }

  return finishGeo(positions, indices)
}

function same(positions: number[], a: number, b: number): boolean {
  return Math.hypot(
    positions[a * 3] - positions[b * 3],
    positions[a * 3 + 1] - positions[b * 3 + 1],
    positions[a * 3 + 2] - positions[b * 3 + 2],
  ) < 1e-9
}

/** How far a ring at `v` spreads: zero means the whole ring is one point. */
function span(patch: Patch, v: number): number {
  const a = patch(0, v)
  let worst = 0
  for (const u of [0.25, 0.5, 0.75, 1]) {
    const b = patch(u, v)
    worst = Math.max(worst, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))
  }
  return worst
}
