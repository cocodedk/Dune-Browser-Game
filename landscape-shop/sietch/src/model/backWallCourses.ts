// landscape-shop/sietch/src/model/backWallCourses.ts
// THE BACK WALL IS BEDDED TOO. R2.2's slab-per-course fixed R2.1's
// "poured concrete beam" read, but its step was a zero-height crease, and
// a course under the old MIN_PROUD_M gate got no slab AT ALL — the
// crease's far side was bare cap: live, "TALL DARK RECESS GAPS...
// isolated slabs," a beam floating over voids.
//
// R2.3: every course gets a slab (backWallBands.ts's MIN_COURSE_PROUD_M
// floor), and a boundary between two is a real GROOVE (emitGroove) — a
// carved-in notch with true height (GROOVE_HEIGHT_M) the prouder side's
// face tapers into, resuming on the shallower side's own front plane, so
// no two faces are ever separated by bare cap. The notch floor stays a
// hair proud of the cap plane (GROOVE_FLOOR_PROUD_M), never flush, or it
// z-fights the cap mesh (TUBE_INSET_M's lesson, again). grooveTaperFor
// fades a notch to nothing at a run's ends and beside a gallery-clipped
// post, so it never crosses a jamb or socket reveal (item 4).
//
// TWO GEOMETRY SETS: faces (creasedGrid, smooth normals) and steps/end-
// reveals/grooves (flat quads) — backWall.ts turns both into meshes.
// Every post clips to the carved ring at BOTH its own front plane AND the
// cap plane (postsFor), the tighter of the two, so an edge can never
// cross the arch by construction. Slabs stop dead at cutBounds() —
// seam.test.ts's socket ray stays unobstructed. UNWRAPPED uv (v encodes
// depth, not y): the wall map is world-planar, and a near-flat face would
// otherwise triangulate to a degenerate uv.

import { BufferGeometry } from 'three'
import { CAP_Z } from './galleryLayout'
import { carvedRingAt } from './surface/carvedProfile'
import { buildCreasedGeometry } from './creasedGrid'
import {
  bands, postsFor, reliefWaveAt, sampleXs, hasTopGroove, hasBottomGroove,
  GROOVE_HEIGHT_M, GROOVE_FLOOR_PROUD_M, NOTCH_ZONE_M, NOTCH_NEAR_FACTOR, NOTCH_FAR_FACTOR,
  type Band, type Post,
} from './backWallBands'

const FACE_CREASE_DEG = 30 // same language as envelope.ts's SHELL_CREASE_DEG
type Vertex = [number, number, number, number, number]
export interface Buffers { position: number[]; uv: number[] }
interface Run { start: number; end: number }

function quad(out: Buffers, p: Vertex[]): void {
  for (const i of [0, 1, 2, 0, 2, 3]) {
    out.position.push(p[i][0], p[i][1], p[i][2])
    out.uv.push(p[i][3], p[i][4])
  }
}
function zAt(proud: number, p: Post): number { return CAP_Z - proud * (1 - reliefWaveAt(p.x, p.lift)) }
function frontZAt(band: Band, p: Post, factor: number): number { return zAt(band.proudM * factor, p) }
function grooveVertex(x: number, y: number, z: number): Vertex { return [x, y, z, x, y + CAP_Z - z] } // v carries depth

/** Maximal runs of consecutive solid posts, long enough to carry a quad. */
function solidRuns(posts: Post[]): Run[] {
  const runs: Run[] = []
  let start = -1
  posts.forEach((p, i) => {
    if (p.solid) { if (start < 0) start = i; return }
    if (start >= 0 && i - start > 1) runs.push({ start, end: i - 1 })
    start = -1
  })
  if (start >= 0 && posts.length - start > 1) runs.push({ start, end: posts.length - 1 })
  return runs
}
/** 1 away from every run edge, stepped down within NOTCH_ZONE_M of either end. */
function edgeFactorsFor(posts: Post[]): number[] {
  const factors = posts.map(() => 1)
  for (const { start, end } of solidRuns(posts)) {
    const x0 = posts[start].x
    const x1 = posts[end].x
    for (let i = start; i <= end; i++) {
      const dist = Math.min(posts[i].x - x0, x1 - posts[i].x)
      factors[i] = dist > NOTCH_ZONE_M ? 1 : dist > NOTCH_ZONE_M * 0.5 ? NOTCH_FAR_FACTOR : NOTCH_NEAR_FACTOR
    }
  }
  return factors
}
/** 0 at a run's ends and beside a clipped post (a jamb/socket reveal owns that corner), else 1. */
function grooveTaperFor(posts: Post[]): number[] {
  const taper = posts.map((p) => (p.clipped ? 0 : 1))
  for (const { start, end } of solidRuns(posts)) { taper[start] = 0; taper[end] = 0 }
  posts.forEach((p, i) => {
    if (p.clipped && i > 0) taper[i - 1] = 0
    if (p.clipped && i < posts.length - 1) taper[i + 1] = 0
  })
  return taper
}
/** One creased grid per run: lo/hi rows, inset by the groove wherever this band owns a boundary. */
function buildFrontGrids(band: Band, posts: Post[], factors: number[], taper: number[]): BufferGeometry[] {
  const topOn = hasTopGroove(band)
  const botOn = hasBottomGroove(band)
  return solidRuns(posts).map(({ start, end }) => {
    const cols = end - start + 1
    const position = new Float32Array(cols * 2 * 3)
    const uv = new Float32Array(cols * 2 * 2)
    for (let s = 0; s < cols; s++) {
      const idx = start + s
      const p = posts[idx]
      const z = frontZAt(band, p, factors[idx])
      const lo = p.lo + (botOn ? taper[idx] * GROOVE_HEIGHT_M : 0)
      const hi = p.hi - (topOn ? taper[idx] * GROOVE_HEIGHT_M : 0)
      position.set([p.x, lo, z], s * 3)
      uv.set([p.x, lo], s * 2)
      position.set([p.x, hi, z], (cols + s) * 3)
      uv.set([p.x, hi], (cols + s) * 2)
    }
    return buildCreasedGeometry({ rows: 2, cols, position, uv }, FACE_CREASE_DEG)
  })
}

/** One parting groove between posts a,b: this (prouder) band's face
 *  tapers into a carved notch, then back up to land EXACTLY on the
 *  neighbour's own front plane — no matching inset needed, no crack opens. */
function emitGroove(
  out: Buffers, band: Band, atTop: boolean,
  a: Post, b: Post, fa: number, fb: number, aTaper: number, bTaper: number,
): void {
  const sign = atTop ? -1 : 1
  const neighbor = atTop ? band.proudAboveM : band.proudBelowM
  const level = (p: Post, f: number, taper: number) => {
    const bound = atTop ? p.hi : p.lo
    const h = sign * taper * GROOVE_HEIGHT_M
    return {
      face: grooveVertex(p.x, bound + h, frontZAt(band, p, f)),
      pit: grooveVertex(p.x, bound + h / 2, zAt(GROOVE_FLOOR_PROUD_M, p)),
      next: grooveVertex(p.x, bound, zAt(neighbor, p)),
    }
  }
  const A = level(a, fa, aTaper)
  const B = level(b, fb, bTaper)
  if (atTop) {
    quad(out, [A.pit, B.pit, B.face, A.face])
    quad(out, [A.pit, B.pit, B.next, A.next])
  } else {
    quad(out, [A.face, B.face, B.pit, A.pit])
    quad(out, [A.next, B.next, B.pit, A.pit])
  }
}

/** Grooves between one course and the next, plus end reveals where a run stops. */
function emitSteps(out: Buffers, band: Band, posts: Post[], factors: number[], taper: number[]): void {
  const topOn = hasTopGroove(band)
  const botOn = hasBottomGroove(band)
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i]
    const b = posts[i + 1]
    if (!a.solid || !b.solid) continue
    const fa = factors[i]
    const fb = factors[i + 1]
    if (topOn) emitGroove(out, band, true, a, b, fa, fb, taper[i], taper[i + 1])
    if (a.clipped || b.clipped) {
      const aZ = frontZAt(band, a, fa)
      const bZ = frontZAt(band, b, fb)
      quad(out, [
        [a.x, a.lo, aZ, a.x, a.lo - CAP_Z + aZ], [b.x, b.lo, bZ, b.x, b.lo - CAP_Z + bZ],
        [b.x, b.lo, CAP_Z, b.x, b.lo], [a.x, a.lo, CAP_Z, a.x, a.lo],
      ])
    } else if (botOn) {
      emitGroove(out, band, false, a, b, fa, fb, taper[i], taper[i + 1])
    }
  }
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i]
    if (!p.solid) continue
    const z = frontZAt(band, p, factors[i])
    const uF = p.x + CAP_Z - z
    if (i === 0 || !posts[i - 1].solid) {
      quad(out, [
        [p.x, p.lo, z, uF, p.lo], [p.x, p.lo, CAP_Z, p.x, p.lo],
        [p.x, p.hi, CAP_Z, p.x, p.hi], [p.x, p.hi, z, uF, p.hi],
      ])
    }
    if (i === posts.length - 1 || !posts[i + 1].solid) {
      quad(out, [
        [p.x, p.lo, CAP_Z, p.x, p.lo], [p.x, p.lo, z, uF, p.lo],
        [p.x, p.hi, z, uF, p.hi], [p.x, p.hi, CAP_Z, p.x, p.hi],
      ])
    }
  }
}

export interface CourseGeometry { stepOut: Buffers; frontGeoms: BufferGeometry[] }

/** Every course slab's raw geometry — backWall.ts assembles the meshes. */
export function buildBackWallCourseGeometry(): CourseGeometry {
  const xs = sampleXs()
  const capOutline = carvedRingAt(CAP_Z).points
  const stepOut: Buffers = { position: [], uv: [] }
  const frontGeoms: BufferGeometry[] = []

  for (const band of bands()) {
    const outline = carvedRingAt(CAP_Z - band.proudM).points
    const posts = postsFor(band, xs, outline, capOutline)
    const factors = edgeFactorsFor(posts)
    const taper = grooveTaperFor(posts)
    emitSteps(stepOut, band, posts, factors, taper)
    frontGeoms.push(...buildFrontGrids(band, posts, factors, taper))
  }

  return { stepOut, frontGeoms }
}
