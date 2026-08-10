#!/usr/bin/env node
// landscape-shop/cliff/tools/bakeDressing.mjs
// Derives src/model/dressingBake.json — R3's entrance-zone dressing — from
// licensed feedstock. Run from the repository root:
//
//   node landscape-shop/cliff/tools/bakeDressing.mjs
//
// PREREQUISITE, once: three of the eight sources are Draco-compressed, and
// tools/bake/glb.mjs refuses Draco on purpose (it would pull a WASM decoder
// into the bake). Decompress them into the gitignored feedstock directory
// first:
//
//   cd landscape-shop/cliff/feedstock && mkdir -p plain
//   for f in *.glb; do npx @gltf-transform/cli cp "$f" "plain/$f"; done
//
// LICENCE, non-negotiable (docs/gauntlet-loop.md, "Sourced assets"): every
// feedstock file, raw or decompressed, is gitignored and must never be
// committed or staged. What this script emits is the reshaped DERIVATIVE —
// sixteen pieces decimated by vertex clustering, non-uniformly scaled,
// rotated, mirrored, tapered, noise-displaced, height-profiled and merged
// into three per-family geometries that exist in no asset pack. Positions
// only: no source colour, no source material and no source UV survives, and
// model/dressTone.ts paints the result from spec.ts's PALETTE.

import { writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sourceLoader, shapePiece, mergeFamily, boundsOf } from './bake/dressKit.mjs'
import {
  FEEDSTOCK, ROCK_PIECES, GOODS_PIECES,
  DRESS_FRONT_Z, DRESS_HALF_WIDTH_M, DRESS_TRIANGLE_BUDGET,
} from './bake/dressPlan.mjs'
import { SAND_PIECES } from './bake/dressSand.mjs'
import { weld } from './bake/pack.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..', '..')
const OUT = join(HERE, '..', 'src', 'model', 'dressingBake.json')

// Goods are 2-3 m props; the massif bake's 10 cm weld quantum is a tenth of a
// sack. Rock and sand are 20-120 m and keep it.
const WELD_CM = { rock: 10, sand: 10, goods: 100 }

const load = sourceLoader((relative) => {
  const path = join(REPO, relative)
  if (!existsSync(path)) {
    console.error(`missing feedstock: ${relative}\nIt is gitignored by design — see this file's header.`)
    process.exit(1)
  }
  return path
})

const plan = [...SAND_PIECES, ...ROCK_PIECES, ...GOODS_PIECES]
const pieces = plan.map((spec) => shapePiece(load(FEEDSTOCK[spec.src], spec.cell), spec))

const families = {}
const slices = new Map()
for (const family of ['rock', 'sand', 'goods']) {
  const merged = mergeFamily(pieces.filter((piece) => piece.family === family))
  const packed = weld(merged.positions, merged.index, merged.ranges, WELD_CM[family])
  for (const range of packed.ranges) slices.set(range.name, range)
  families[family] = { positions: packed.positions, index: packed.index }
}

const triangles = Object.values(families).reduce((sum, f) => sum + f.index.length / 3, 0)
const bake = {
  generatedBy: 'landscape-shop/cliff/tools/bakeDressing.mjs',
  derivation: 'Reshaped derivative of licensed feedstock (see tools/bake/dressPlan.mjs and ' +
    'tools/bake/dressSand.mjs). Sixteen pieces from seven sources, vertex-cluster decimated, ' +
    'non-uniformly scaled, rotated, mirrored, tapered, noise-displaced, height-profiled, merged ' +
    'and welded into three family geometries. Not a conversion of any single asset; the raw ' +
    'feedstock is gitignored and never committed.',
  triangles,
  pieces: pieces.map((piece) => ({
    name: piece.name, family: piece.family, source: piece.source, anchor: piece.anchor,
    // Triangle slice of its own family's merged geometry, re-measured after
    // welding — model/dressTone.ts paints a piece by looking it up here.
    from: slices.get(piece.name).from, to: slices.get(piece.name).to,
    triangles: slices.get(piece.name).to - slices.get(piece.name).from,
    min: piece.min, max: piece.max, centroid: piece.centroid,
  })),
  families,
}

report(bake)
assertDressing(pieces)
writeFileSync(OUT, JSON.stringify(bake))
console.log(`wrote ${OUT} (${(JSON.stringify(bake).length / 1024).toFixed(1)} KB)`)

/** Thrown, not logged. A dressing piece that reached past the gate lip, or
 *  widened the formation, or floated, is a silent failure the shot would not
 *  necessarily show and the seam guard would only report as a mystery. */
function assertDressing(built) {
  const problems = []
  for (const piece of built) {
    if (piece.min[2] < DRESS_FRONT_Z) {
      problems.push(`${piece.name} reaches z=${piece.min[2]}, past the front limit ${DRESS_FRONT_Z}`)
    }
    if (Math.max(Math.abs(piece.min[0]), Math.abs(piece.max[0])) > DRESS_HALF_WIDTH_M) {
      problems.push(`${piece.name} spans x ${piece.min[0]}..${piece.max[0]}, outside +-${DRESS_HALF_WIDTH_M}`)
    }
    if (piece.min[1] > 0.05 || piece.min[1] < -1.5) {
      problems.push(`${piece.name} sits at min-y ${piece.min[1]}: it floats or is buried`)
    }
  }
  const total = built.reduce((sum, piece) => sum + piece.triangles, 0)
  if (total > DRESS_TRIANGLE_BUDGET) {
    problems.push(`dressing is ${total} triangles, over the ${DRESS_TRIANGLE_BUDGET} budget`)
  }
  if (problems.length) throw new Error(`dressing bake rejected:\n  ${problems.join('\n  ')}`)
}

function report(baked) {
  for (const piece of baked.pieces) {
    console.log(`  ${piece.name.padEnd(15)} ${piece.family.padEnd(6)} ${piece.source.padEnd(8)} ` +
      `${String(piece.triangles).padStart(5)} tris  ` +
      `x ${piece.min[0].toFixed(0).padStart(5)}..${piece.max[0].toFixed(0).padEnd(5)} ` +
      `y ${piece.min[1].toFixed(2).padStart(6)}..${piece.max[1].toFixed(1).padEnd(5)} ` +
      `z ${piece.min[2].toFixed(1).padStart(7)}..${piece.max[2].toFixed(1)}`)
  }
  for (const [family, data] of Object.entries(baked.families)) {
    const { min, max } = boundsOf(data.positions)
    console.log(`${family.padEnd(6)} ${String(data.index.length / 3).padStart(5)} tris  ` +
      `${String(data.positions.length / 3).padStart(5)} verts  ` +
      `bounds ${min.map((v) => v.toFixed(1)).join(',')} .. ${max.map((v) => v.toFixed(1)).join(',')}`)
  }
  console.log(`dressing total ${baked.triangles} triangles of ${DRESS_TRIANGLE_BUDGET}`)
}
