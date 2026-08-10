// landscape-shop/cliff/src/model/dressing.ts
// R3's entrance-zone dressing: three meshes read straight from
// dressingBake.json — one per material family, never one mesh per prop.
//
// That file is a RESHAPED DERIVATIVE of licensed feedstock, produced offline by
// tools/bakeDressing.mjs: sixteen pieces out of seven sources, vertex-cluster
// decimated, non-uniformly scaled, rotated, mirrored, tapered, noise-displaced,
// merged and welded. The raw feedstock is gitignored and is never
// committed (docs/gauntlet-loop.md, "Sourced assets"); this derivative is.
// Only POSITIONS are read out of the sources, so no feedstock colour, material
// or UV exists anywhere in the set — model/dressTone.ts paints every one of
// these faces from spec.ts's PALETTE.
//
// WHY THREE MESHES AND NOT FIFTEEN. Draw calls. The set already costs ten, and
// the release round measures them; sixteen props at the foot of a hero asset
// would more than double that for geometry worth 1.5k triangles. Grouping by
// family is also what the shading wants:
//
//   dressRock   flat-shaded, per-face paint, like the massif it fell off.
//   dressSand   smooth-shaded, per-vertex paint. Sand has no facets
//               (model/surface.ts's own rule for the skirt bands).
//   dressGoods  UNLIT, like every other surface inside the mouth
//               (model/socketTone.ts). It sits on the shaft floor, where a lit
//               material would be the one bright thing in the void.

import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import { PALETTE } from '../spec'
import { flatShade, meshFrom } from './grid'
import { interiorMaterial } from './socketTone'
import { decodeQuantizedPositions, decodeIndex } from './bakeCodec'
import bake from './dressingBake.json'

/** One prop's slice of its family's merged triangle list, and where it ended
 *  up. The guards read this rather than re-deriving a placement the bake
 *  already measured. */
export interface DressPiece {
  name: string
  family: string
  source: string
  /** The bake mass this piece belongs to — a scar's debris block, or the talus
   *  a drift banked behind. Null for the pieces that answer to nothing. */
  anchor: string | null
  from: number
  to: number
  triangles: number
  min: number[]
  max: number[]
  centroid: number[]
}

/** R4: positions/index are quantized (Int16/Uint16, base64 — tools/bake/
 *  pack.mjs's header has the byte-budget arithmetic) at `scale` units per
 *  metre, the SAME quantum tools/bakeDressing.mjs's own weld() call used
 *  for this family (rock/sand: decimetre; goods: centimetre, a tenth of a
 *  sack), so decoding adds no precision loss beyond what the weld already
 *  committed to. bakeCodec.ts is the decode side; `triangles` is stored
 *  plain so pieceIndexFor below never has to decode just to measure a
 *  length. */
export interface DressFamily {
  scale: number
  triangles: number
  positionsQ: string
  indexQ: string
}

export interface DressingBake {
  triangles: number
  pieces: DressPiece[]
  families: { rock: DressFamily; sand: DressFamily; goods: DressFamily }
}

export const DRESSING_BAKE = bake as DressingBake

export const DRESS_MESHES = ['dressRock', 'dressSand', 'dressGoods'] as const

function geometryOf(family: DressFamily): BufferGeometry {
  const positions = decodeQuantizedPositions(family.positionsQ, family.scale)
  const index = decodeIndex(family.indexQ)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

export function buildDressing(): Mesh[] {
  const rock = meshFrom(flatShade(geometryOf(DRESSING_BAKE.families.rock)), PALETTE.rock)
  rock.name = 'dressRock'

  // Indexed and smooth on purpose: sand has no facets, which is model/
  // surface.ts's own rule for the skirt bands.
  const sand = meshFrom(geometryOf(DRESSING_BAKE.families.sand), PALETTE.sandApron)
  sand.name = 'dressSand'

  const goods = new Mesh(flatShade(geometryOf(DRESSING_BAKE.families.goods)), interiorMaterial())
  goods.name = 'dressGoods'

  return [rock, sand, goods]
}

/** The piece a triangle of `family` belongs to, by name. Built once. */
export function pieceIndexFor(family: string): string[] {
  const total = DRESSING_BAKE.families[family as 'rock'].triangles
  const out = new Array<string>(total).fill('')
  for (const piece of DRESSING_BAKE.pieces) {
    if (piece.family !== family) continue
    for (let t = piece.from; t < piece.to; t++) out[t] = piece.name
  }
  return out
}
