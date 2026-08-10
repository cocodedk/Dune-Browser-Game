#!/usr/bin/env node
// landscape-shop/sietch/tools/bakeDressing.mjs
// Derives src/model/dressingBake.json from licensed feedstock. Run from
// the repository root:
//
//   node landscape-shop/sietch/tools/bakeDressing.mjs
//
// LICENCE, non-negotiable (landscape-shop/docs/gauntlet-loop.md, "Sourced
// assets"): the feedstock GLBs are gitignored and must never be committed
// or staged. What this script emits is the reshaped DERIVATIVE — a set of
// sietch-specific meshes that exist in no asset pack: the vendor ground
// plate cut off every one of them, parts cropped away, proportions
// stretched to this hall's true metres, density collapsed to what the
// spec's camera rig can resolve, and every colour replaced by one derived
// from spec.ts's PALETTE (tools/bake/tones.mjs). The script is committed
// so anyone who owns the same feedstock can reproduce the bake byte for
// byte; the feedstock itself is not redistributable and is not in the
// repository.
//
// Deterministic by construction: no Date.now, no randomness, no seeds —
// every number below is a function of the feedstock and of the tables in
// tools/bake/.

import { writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readGlbSoup, boundsOf } from './bake/glb.mjs'
import { cropSource, dropVendorPlate, placePiece, selectEmissive } from './bake/reshape.mjs'
import { stripWide } from './bake/figureLimbs.mjs'
import { decimate } from './bake/decimate.mjs'
import { paintTriangles } from './bake/paint.mjs'
import { paintFigureTriangles } from './bake/figurePaint.mjs'
import { packPiece } from './bake/pack.mjs'
import { PIECES } from './bake/pieces.mjs'
import { FIGURE_PIECES } from './bake/figurePieces.mjs'
import { FEEDSTOCK, FIGURE_SOURCES, SOURCE_LICENCE, SPEC_ANCHORS, ZONES } from './bake/zones.mjs'
import { HEARTH_COLOR, PALETTE } from './bake/tones.mjs'

const ALL_PIECES = [...PIECES, ...FIGURE_PIECES]

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..', '..')
const OUT = join(HERE, '..', 'src', 'model', 'dressingBake.json')

const soups = {}
for (const [key, relative] of Object.entries(FEEDSTOCK)) {
  const path = join(REPO, relative)
  if (!existsSync(path)) {
    console.error(`missing feedstock: ${relative}\nIt is gitignored by design — see the header of this file.`)
    process.exit(1)
  }
  soups[key] = readGlbSoup(path)
}

const tones = []
const baked = []

for (const piece of ALL_PIECES) {
  const soup = soups[piece.src]
  if (!soup) throw new Error(`${piece.name}: unknown feedstock key ${piece.src}`)

  let index = dropVendorPlate(soup)
  const stripped = index.length / 3
  for (const box of [].concat(piece.crop ?? [])) index = cropSource(soup, index, box)
  if (!index.length) throw new Error(`${piece.name}: crop removed every triangle`)
  const world = placePiece(soup, index, piece)

  // Decimation moves every vertex to its cell's MEAN, which lifts a
  // piece's lowest ring by up to half a cell — measured, palmForked came
  // out standing 7 cm off the floor. Re-seating afterwards is the fix,
  // and the shift is taken from the FIRST subset (the body) so an
  // emissive sub-piece moves with the bowl it sits in instead of
  // grounding itself.
  let groundShift = null
  for (const cut of piece.split ? [false, true] : [null]) {
    const subset = cut === null ? index : selectEmissive(soup, index, cut)
    if (!subset.length) throw new Error(`${piece.name}: emissive split left nothing (${cut})`)
    let { vertices, triangles } = decimate(world, subset, piece.cellM)
    // Reference-pose limb removal — POST-decimate, in built world metres,
    // never pre-decimate source-space (figureLimbs.mjs's header has the
    // measured reason: a source-space crop leaves spike triangles).
    if (piece.stripAxis) {
      const axisIndex = piece.stripAxis === 'x' ? 0 : 2
      const before = triangles.length
      triangles = stripWide(vertices, triangles, axisIndex, piece.stripThresholdM, piece.atM[axisIndex])
      if (!triangles.length) throw new Error(`${piece.name}: limb strip removed every triangle`)
      if (triangles.length === before) throw new Error(`${piece.name}: limb strip removed nothing — check the axis/threshold`)
    }
    if (groundShift === null) {
      groundShift = piece.atM[1] - Math.min(...vertices.map((v) => v[1]))
    }
    for (const vertex of vertices) vertex[1] += groundShift
    const ramp = cut === true ? 'ember' : piece.ramp
    // Figures have no source vertex colour worth reading (glb.mjs fills a
    // neutral placeholder) — figurePaint.mjs reads the source HEIGHT
    // instead, over the bounds of exactly the vertices this piece kept.
    const tone = piece.figure
      ? paintFigureTriangles(soup, triangles, ...figureYBounds(soup, subset), tones, piece.skinBandMin)
      : paintTriangles(soup, triangles, ramp, piece.foliage, tones, piece.toneRange)
    const packed = packPiece(vertices, triangles, tone)
    const attribution = FIGURE_SOURCES[piece.src]
    baked.push({
      name: cut === true ? `${piece.name}Embers` : piece.name,
      zone: piece.zone,
      source: piece.src,
      material: cut === true ? 'ember' : 'dressing',
      // An emissive sub-piece rests INSIDE the body it was split from —
      // coals lie in a bowl, not on the hearth lip the bowl stands on —
      // so it names its parent instead of a floor height, and
      // src/dressing.test.ts checks containment rather than contact.
      supportY: cut === true ? packed.boundsMin[1] : piece.atM[1],
      insideOf: cut === true ? piece.name : null,
      // Per-piece provenance, alongside the top-level sourceLicence: null
      // for the Desert Kingdom 23 (covered by sourceLicence already), the
      // Poly Pizza CC0 evidence for the three figures — the bake carries
      // its own record the same way sourceLicence always has.
      sourceUrl: attribution?.url ?? null,
      licence: attribution?.licence ?? null,
      transforms: describe(piece, stripped, subset.length / 3),
      ...packed,
    })
  }
}

/** [minY, maxY] of a figure's own kept source vertices — the span
 *  figurePaint.mjs's height-fraction rule reads against. */
function figureYBounds(soup, index) {
  const { min, max } = boundsOf(soup.positions, index)
  return [min[1], max[1]]
}

const bake = {
  generatedBy: 'landscape-shop/sietch/tools/bakeDressing.mjs',
  derivation: 'Reshaped derivative of licensed feedstock (see tools/bake/pieces.mjs). ' +
    `${baked.length} sietch-specific meshes: vendor ground plate removed, parts cropped ` +
    'away, re-proportioned to true metres against a 22 m vault, grid-collapse decimated ' +
    'to the camera rig\'s resolving power, and re-tinted so that every colour is a ' +
    'function of spec.ts PALETTE. Not a conversion of any single asset; the raw feedstock ' +
    'is gitignored and never committed.',
  sourceLicence: SOURCE_LICENCE,
  feedstock: Object.keys(FEEDSTOCK).map((key) => FEEDSTOCK[key].split('/').pop()),
  // Copies of the spec numbers the bake was computed from. src/dressing.
  // test.ts fails if spec.ts moves and the bake is not re-run.
  paletteUsed: { ...PALETTE, hearthColor: HEARTH_COLOR },
  specAnchors: SPEC_ANCHORS,
  zones: ZONES,
  tones,
  triangles: baked.reduce((n, p) => n + p.triangles, 0),
  vertices: baked.reduce((n, p) => n + p.vertices, 0),
  pieces: baked,
}

const json = JSON.stringify(bake)
writeFileSync(OUT, json)

for (const piece of baked) {
  const size = piece.boundsMax.map((v, i) => (v - piece.boundsMin[i]).toFixed(2))
  console.log(`  ${piece.name.padEnd(18)} ${String(piece.triangles).padStart(4)} tris  ` +
    `${size.join(' x ').padEnd(20)} on y=${piece.supportY}  [${piece.zone}]`)
}
console.log(`\n${bake.pieces.length} pieces, ${bake.triangles} triangles, ` +
  `${bake.vertices} vertices, ${tones.length} tones`)
console.log(`wrote ${OUT} (${(json.length / 1024).toFixed(1)} KB)`)

function describe(piece, strippedTris, croppedTris) {
  const parts = [`vendor plate off (${strippedTris} tris)`]
  if (piece.crop) parts.push(`cropped to ${croppedTris} tris`)
  parts.push(`scaled to ${piece.heightM} m high`)
  if (piece.spreadXZ) parts.push(`footprint x${piece.spreadXZ}`)
  if (piece.squashZ) parts.push(`depth x${piece.squashZ}`)
  if (piece.rotYDeg) parts.push(`turned ${piece.rotYDeg} deg`)
  if (piece.stripAxis) parts.push(`reference-pose limbs stripped past ${piece.stripThresholdM} m on ${piece.stripAxis}`)
  parts.push(`decimated at ${piece.cellM} m`, `re-tinted on the ${piece.ramp}/${piece.foliage} ramps`)
  return parts.join(', ')
}
