// landscape-shop/cliff/tools/probeMass.mjs
// Where each baked mass lands ON SCREEN, so a band reading is taken off the
// pixels a critic actually sees rather than off the vertex colours the guards
// already cover.
//
// The massif is rasterized here with its own depth buffer rather than sampled
// at facet centroids: a facet covers tens of pixels at the approach rig, and
// one sample a facet both under-counts the big faces and lets a facet hidden
// behind its own mass into the average.
//
// The camera maths is three's own lookAt, re-derived from the rig numbers
// tools/shoot.mjs wrote into .shots/manifest.json — the shot's own record of
// what it framed, not a second hand-kept copy of spec.ts.

import { luminanceAt } from './png.mjs'

// model/strata.ts's member mapping. Duplicated rather than imported: tools/
// is plain node and cannot read the TypeScript source, the same rule
// bakeSeam.test.ts documents for the bake's own copy of the footprint.
const MEMBER_M = 28.5
const WARP = 0.18

export function memberAt(s) {
  const t = s / MEMBER_M
  return Math.floor(t + WARP * Math.sin(t * 1.15 + 0.7))
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/** Screen-space projector for one rig, in the shot's own pixel dimensions. */
export function projector(rig, width, height) {
  const eye = rig.positionM
  const zAxis = normalize(sub(eye, rig.lookAtM))
  const xAxis = normalize(cross([0, 1, 0], zAxis))
  const yAxis = cross(zAxis, xAxis)
  const half = Math.tan((rig.fovDeg * Math.PI) / 360)
  const aspect = width / height
  return (point) => {
    const rel = sub(point, eye)
    const depth = -dot(rel, zAxis)
    if (depth <= 1) return null
    return {
      x: (((dot(rel, xAxis) / (half * aspect * depth)) + 1) / 2) * width,
      y: ((1 - dot(rel, yAxis) / (half * depth)) / 2) * height,
      depth,
    }
  }
}

function massOfTriangle(bake) {
  const out = new Int16Array(bake.triangles)
  bake.strata.forEach((mass, at) => {
    for (let t = mass.from; t < mass.to; t++) out[t] = at
  })
  return out
}

/** Depth-buffered rasterization of the whole baked massif. Returns, per
 *  triangle actually visible, the mass it belongs to, its stratigraphic
 *  height, and the rendered pixels it covers. */
export function rasterize(bake, image, project) {
  const { width, height } = image
  const depth = new Float32Array(width * height).fill(Infinity)
  const face = new Int32Array(width * height).fill(-1)
  const positions = bake.positions
  const index = bake.index
  for (let t = 0; t < bake.triangles; t++) {
    const screen = []
    let ok = true
    for (let k = 0; k < 3; k++) {
      const v = index[t * 3 + k] * 3
      const at = project([positions[v], positions[v + 1], positions[v + 2]])
      if (!at) { ok = false; break }
      screen.push(at)
    }
    if (!ok) continue
    fill(screen, t, depth, face, width, height)
  }
  return { depth, face, massOf: massOfTriangle(bake) }
}

function fill(screen, triangle, depth, face, width, height) {
  const [a, b, c] = screen
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)))
  const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)))
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)))
  const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)))
  const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
  if (!area) return
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const w0 = ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y)) / area
      const w1 = ((px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y)) / area
      if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue
      const z = a.depth + w1 * (b.depth - a.depth) + w0 * (c.depth - a.depth)
      const at = y * width + x
      if (z >= depth[at]) continue
      depth[at] = z
      face[at] = triangle
    }
  }
}

export function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Mean RENDERED luminance of one mass, per stratigraphic MEMBER — the
 *  number item 1 of the round is measured on. Members with too few pixels
 *  behind them are dropped, not guessed. */
export function memberProfile(bake, image, raster, name, least = 60) {
  const at = bake.strata.findIndex((entry) => entry.name === name)
  const plane = bake.strata[at].plane
  const centres = new Map()
  const bins = new Map()
  let pixels = 0
  for (let p = 0; p < raster.face.length; p++) {
    const triangle = raster.face[p]
    if (triangle < 0 || raster.massOf[triangle] !== at) continue
    let member = centres.get(triangle)
    if (member === undefined) {
      member = memberAt(centroidHeight(bake, plane, triangle))
      centres.set(triangle, member)
    }
    if (!bins.has(member)) bins.set(member, [])
    bins.get(member).push(luminanceAt(image, p % image.width, Math.floor(p / image.width)))
    pixels++
  }
  const members = Array.from(bins.entries())
    .filter(([, values]) => values.length >= least)
    .sort((a, b) => a[0] - b[0])
    .map(([member, values]) => ({ member, count: values.length, mean: mean(values) }))
  const deltas = []
  for (let i = 1; i < members.length; i++) {
    if (members[i].member !== members[i - 1].member + 1) continue
    deltas.push(Math.abs(members[i].mean - members[i - 1].mean))
  }
  return { pixels, members, deltas }
}

function centroidHeight(bake, plane, triangle) {
  let s = plane[3]
  for (let k = 0; k < 3; k++) {
    const v = bake.index[triangle * 3 + k] * 3
    s += (plane[0] * bake.positions[v] + plane[1] * bake.positions[v + 1] + plane[2] * bake.positions[v + 2]) / 3
  }
  return s
}
