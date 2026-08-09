#!/usr/bin/env node
// landscape-shop/cliff/tools/bakeMassif.mjs
// Derives src/model/massifBake.json from licensed feedstock. Run from the
// repository root:
//
//   node landscape-shop/cliff/tools/bakeMassif.mjs
//
// LICENCE, non-negotiable (docs/gauntlet-loop.md, "Sourced assets"): the
// feedstock GLBs are gitignored and must never be committed or staged. What
// this script emits is the reshaped DERIVATIVE — one massif-specific merged
// geometry, scaled, sheared, mirrored, tapered, noised and welded into a
// single formation that exists in no asset pack. The script is committed so
// anyone who owns the same feedstock can reproduce the bake; the feedstock
// itself is not redistributable and is not in the repository.

import { writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readGlbPrimitive, normalizeSource } from './bake/glb.mjs'
import { INSTANCES, FEEDSTOCK } from './bake/instances.mjs'
import { compose, assertComposition, TARGET } from './bake/compose.mjs'
import { weld, frontOutline, frontField } from './bake/pack.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..', '..')
const OUT = join(HERE, '..', 'src', 'model', 'massifBake.json')

// Mirrors model/socket.ts: the deepest surface of the carved entrance that is
// meant to be SEEN. Rock in front of it would swallow the gate, so
// compose.mjs throws if the formation creeps that far forward.
const SOCKET_DEEPEST_VISIBLE_Z = -216.8

const soups = {}
for (const [key, relative] of Object.entries(FEEDSTOCK)) {
  const path = join(REPO, relative)
  if (!existsSync(path)) {
    console.error(`missing feedstock: ${relative}\nIt is gitignored by design — see the header of this file.`)
    process.exit(1)
  }
  soups[key] = normalizeSource(readGlbPrimitive(path))
  const [w, h, d] = soups[key].size
  console.log(`feedstock ${key}: ${soups[key].index.length / 3} tris, ` +
    `${w.toFixed(2)} x ${h.toFixed(2)} x ${d.toFixed(2)} units`)
}

const composed = compose(INSTANCES.map((spec) => ({ soup: soups[spec.src], spec })))
const bounds = assertComposition(composed.positions, SOCKET_DEEPEST_VISIBLE_Z)

const gateField = frontField(composed.positions, composed.index, {
  minX: -170, maxX: 170, minY: -8, maxY: 160, nx: 35, ny: 22,
})

const outline = frontOutline(composed.positions, {
  minX: -TARGET.widthM / 2,
  maxX: TARGET.widthM / 2,
  samples: 61,
  bandLow: -10,
  bandHigh: 18,
  frontZ: TARGET.frontZ,
})

const packed = weld(composed.positions, composed.index)
const bake = {
  generatedBy: 'landscape-shop/cliff/tools/bakeMassif.mjs',
  derivation: 'Reshaped derivative of licensed feedstock (see tools/bake/instances.mjs). ' +
    `${composed.masses} instances, non-uniformly scaled, rotated, mirrored, sheared, ` +
    'cap-tapered, noise-displaced, merged and welded into one formation. Not a conversion ' +
    'of any single asset; the raw feedstock is gitignored and never committed.',
  footprint: TARGET,
  masses: composed.masses,
  // Every mass ranked by solid volume — what makes the formation's
  // hierarchy a measurable fact instead of a claim (bakeSeam.test.ts).
  hierarchy: composed.hierarchy,
  triangles: packed.index.length / 3,
  vertices: packed.positions.length / 3,
  bounds: { min: bounds.min.map(round2), max: bounds.max.map(round2) },
  outline,
  gateField,
  positions: packed.positions,
  index: packed.index,
}

writeFileSync(OUT, JSON.stringify(bake))
const bytes = JSON.stringify(bake).length
console.log(`baked ${bake.masses} masses -> ${bake.triangles} tris, ${bake.vertices} verts`)
console.log(`bounds min ${bake.bounds.min.join(', ')}  max ${bake.bounds.max.join(', ')}`)
for (const mass of bake.hierarchy.slice(0, 9)) {
  const height = (mass.max[1] - mass.min[1]).toFixed(1)
  console.log(`  ${mass.name.padEnd(14)} ${String(mass.volumeM3).padStart(9)} m3  h ${height.padStart(6)}  ` +
    `x ${mass.min[0].toFixed(0)}..${mass.max[0].toFixed(0)}`)
}
console.log(`hero/next volume ratio ${(bake.hierarchy[0].volumeM3 / bake.hierarchy[1].volumeM3).toFixed(2)}`)
console.log(`wrote ${OUT} (${(bytes / 1024).toFixed(1)} KB)`)

function round2(value) {
  return Math.round(value * 100) / 100
}
