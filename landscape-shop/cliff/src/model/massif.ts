// landscape-shop/cliff/src/model/massif.ts
// The primary rock: one merged mesh read straight from massifBake.json.
//
// That file is a RESHAPED DERIVATIVE of licensed feedstock, produced offline
// by tools/bakeMassif.mjs — ten instances of two artist-authored rock forms,
// non-uniformly scaled, rotated, mirrored, sheared, cap-tapered, noise-
// displaced and welded into one formation. The raw feedstock is gitignored
// and is never committed (docs/gauntlet-loop.md, "Sourced assets"); this
// derivative is. Nothing here loads a GLB at runtime.
//
// R4: split three ways and quantized (tools/bake/pack.mjs's header has the
// byte-budget arithmetic) — massifBake.json (this file's METADATA: hierarchy,
// strata, footprint, bounds, outline, gateField), massifBakeGeo.json
// (positionsQ, Int16 decimetres) and massifBakeIndex.json (indexQ, Uint16).
// bakeCodec.ts decodes the last two back into the plain arrays below.
//
// toNonIndexed() is deliberate. The feedstock's own shape language is
// stacked strata and hard facets, and that only reads with FLAT normals —
// smoothing the welded shell turns a scarp back into a dune.

import { BackSide, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshStandardMaterial } from 'three'
import { PALETTE } from '../spec'
import bakeMeta from './massifBake.json'
import bakeGeo from './massifBakeGeo.json'
import bakeIndex from './massifBakeIndex.json'
import { decodeQuantizedPositions, decodeIndex } from './bakeCodec'

/** One instance's contribution to the formation, as the bake measured it:
 *  solid volume (signed-tetrahedron, so rotation cannot inflate it) and
 *  world bounds. Sorted biggest first — index 0 is the hero mass. */
export interface BakedMass {
  name: string
  volumeM3: number
  min: number[]
  max: number[]
}

/** One mass's slice of the finished triangle list, and the bedding plane its
 *  strata run along — s(x,y,z) = plane[0]x + plane[1]y + plane[2]z + plane[3],
 *  a stratigraphic height in meters. Derived and self-checked offline by
 *  tools/bake/bedding.mjs; model/strata.ts is what reads it. */
export interface BakedStrata {
  name: string
  from: number
  to: number
  plane: number[]
}

export interface MassifBakeMeta {
  triangles: number
  vertices: number
  masses: number
  hierarchy: BakedMass[]
  strata: BakedStrata[]
  footprint: { widthM: number; heightM: number; frontZ: number; backZ: number }
  bounds: { min: number[]; max: number[] }
  outline: { xs: number[]; zs: number[] }
  gateField: {
    minX: number; maxX: number; minY: number; maxY: number
    nx: number; ny: number; noRock: number; z: number[]
  }
}

/** The metadata plus the two quantized fields, RAW — bakeSeam.test.ts
 *  decodes `positionsQ`/`indexQ` itself (via the same bakeCodec.ts this
 *  file uses) so the guard exercises the real codec, not a pre-decoded
 *  convenience field only this module trusts. */
export interface MassifBake extends MassifBakeMeta {
  scale: number
  positionsQ: string
  indexQ: string
}

export const MASSIF_BAKE: MassifBake = {
  ...(bakeMeta as MassifBakeMeta),
  scale: (bakeGeo as { scale: number }).scale,
  positionsQ: (bakeGeo as { positionsQ: string }).positionsQ,
  indexQ: (bakeIndex as { indexQ: string }).indexQ,
}

export function buildMassif(): Mesh {
  const positions = decodeQuantizedPositions(MASSIF_BAKE.positionsQ, MASSIF_BAKE.scale)
  const index = decodeIndex(MASSIF_BAKE.indexQ)
  const indexed = new BufferGeometry()
  indexed.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  indexed.setIndex(index)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()

  // shadowSide: BackSide — the massif is a closed shell (DoubleSide for
  // rendering, since a few welded facets face inward at mass-to-mass
  // joins). Left at its default (mirrors `side`), a DoubleSide material
  // casts shadow from BOTH faces, so every front-facing facet writes its
  // own depth into the shadow map and then samples that same depth back —
  // classic self-shadowing "acne" at grazing incidence, which is what the
  // R1.5 critic read as a regular vertical-line tiling artifact on the
  // hero's shoulder (confirmed with a shadows-off diagnostic render, which
  // erased it). Casting from the BACK face instead stores the far side of
  // the solid in the shadow map, so a front fragment always compares
  // against a depth safely behind it — the standard fix for a closed mesh,
  // and it costs the model nothing (rendering itself stays DoubleSide).
  const material = new MeshStandardMaterial({ color: PALETTE.rock, side: DoubleSide })
  material.shadowSide = BackSide

  const mesh = new Mesh(geometry, material)
  mesh.name = 'massif'
  return mesh
}

/** Frontmost rock at (x, y), or null where the formation has no rock at all.
 *  model/gateWall.ts uses it to keep its own outer skirt buried. */
export function rockFrontAt(x: number, y: number): number | null {
  const field = MASSIF_BAKE.gateField
  const stepX = (field.maxX - field.minX) / (field.nx - 1)
  const stepY = (field.maxY - field.minY) / (field.ny - 1)
  const col = Math.round((x - field.minX) / stepX)
  const row = Math.round((y - field.minY) / stepY)
  if (col < 0 || col >= field.nx || row < 0 || row >= field.ny) return null
  const value = field.z[row * field.nx + col]
  return value >= field.noRock ? null : value
}
