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
import { weld, frontOutline, frontField, quantizePositions, quantizeIndex, base64Of } from './bake/pack.mjs'
import { collapseNeedles } from './bake/needles.mjs'
import { refineFacets } from './bake/refine.mjs'

// Matches weld()'s own default ROUND (decimetre) -- see pack.mjs's header:
// quantizing at the weld's own quantum adds no precision loss.
const SCALE = 10

// R3.2, the two mesh-quality passes. Both run on the WELDED formation, where
// a shared edge is a shared pair of vertex indices, and both are followed by
// a second weld that re-quantizes what they added and drops anything they
// left degenerate. See the headers of bake/needles.mjs and bake/refine.mjs
// for why each exists and what it was measured against.
// colBlock is in scope with westBastion because it is a mass THIS round added
// and it arrived with the same defect: the cap shave left it two 0.4 m-edged
// slivers of its own. Nothing else in the formation is touched.
const NEEDLES = { masses: ['westBastion', 'colBlock'], aspect: 6, maxShort: 8.5, maxTurnDeg: 60 }
const FACETS = { frontZ: -150, frontEdge: 30, backEdge: 45 }

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..', '..')
const OUT_META = join(HERE, '..', 'src', 'model', 'massifBake.json')
const OUT_GEO = join(HERE, '..', 'src', 'model', 'massifBakeGeo.json')
const OUT_INDEX = join(HERE, '..', 'src', 'model', 'massifBakeIndex.json')

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

const first = weld(composed.positions, composed.index, composed.ranges)
const cleaned = collapseNeedles(first.positions, first.index, first.ranges, NEEDLES)
const refined = refineFacets(cleaned.positions, cleaned.index, cleaned.ranges, FACETS)
const packed = weld(refined.positions, refined.index, byElement(refined.ranges))
console.log(`quality: ${first.index.length / 3} tris -> collapsed ${cleaned.collapsed} needles`
  + ` -> split ${refined.split} edges -> ${packed.index.length / 3} tris`)
// R2: which finished triangles belong to which mass, and the bedding plane
// that mass's strata run along (tools/bake/bedding.mjs). This is the whole
// of what the surface round needs from the bake — no per-vertex colour data
// is stored, so the committed derivative stays a geometry file.
const strata = packed.ranges.map((range, i) => ({
  name: range.name,
  from: range.from,
  to: range.to,
  plane: composed.planes[i].map(round6),
}))
const triangles = packed.index.length / 3
const vertices = packed.positions.length / 3

// R4 CHUNK BUDGET (pack.mjs's own header has the arithmetic): plain-JSON
// positions+index alone ran 386 KB, over any single 150,000-byte
// landscape-*.js chunk. Quantized+base64'd they are still ~192 KB together
// — smaller, but still too big for ONE chunk alongside this shop's model
// code and the dressing bake. Split into three files instead: META (this
// object, everything BUT the two big arrays) lands in the shop's default
// chunk with the code and dressingBake.json; GEO and INDEX get their own
// filename-keyed chunks (vite.config.ts's manualChunks). model/massif.ts
// reads all three and merges them back into one MASSIF_BAKE object.
const meta = {
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
  strata,
  triangles,
  vertices,
  bounds: { min: bounds.min.map(round2), max: bounds.max.map(round2) },
  outline,
  gateField,
}
const geo = { scale: SCALE, positionsQ: base64Of(quantizePositions(packed.positions, SCALE)) }
const index = { indexQ: base64Of(quantizeIndex(packed.index, vertices)) }

writeFileSync(OUT_META, JSON.stringify(meta))
writeFileSync(OUT_GEO, JSON.stringify(geo))
writeFileSync(OUT_INDEX, JSON.stringify(index))
const metaBytes = JSON.stringify(meta).length
const geoBytes = JSON.stringify(geo).length
const indexBytes = JSON.stringify(index).length
console.log(`baked ${meta.masses} masses -> ${triangles} tris, ${vertices} verts`)
console.log(`bounds min ${meta.bounds.min.join(', ')}  max ${meta.bounds.max.join(', ')}`)
for (const mass of meta.hierarchy.slice(0, 9)) {
  const height = (mass.max[1] - mass.min[1]).toFixed(1)
  console.log(`  ${mass.name.padEnd(14)} ${String(mass.volumeM3).padStart(9)} m3  h ${height.padStart(6)}  ` +
    `x ${mass.min[0].toFixed(0)}..${mass.max[0].toFixed(0)}`)
}
console.log(`hero/next volume ratio ${(meta.hierarchy[0].volumeM3 / meta.hierarchy[1].volumeM3).toFixed(2)}`)
console.log(`wrote ${OUT_META} (${(metaBytes / 1024).toFixed(1)} KB)`)
console.log(`wrote ${OUT_GEO} (${(geoBytes / 1024).toFixed(1)} KB)`)
console.log(`wrote ${OUT_INDEX} (${(indexBytes / 1024).toFixed(1)} KB)`)

function round2(value) {
  return Math.round(value * 100) / 100
}

/** pack.mjs's weld() reads its slices in ELEMENT offsets and returns them in
 *  TRIANGLE offsets; the two quality passes both speak triangles. */
function byElement(ranges) {
  return ranges.map((range) => ({ name: range.name, from: range.from * 3, to: range.to * 3 }))
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6
}
