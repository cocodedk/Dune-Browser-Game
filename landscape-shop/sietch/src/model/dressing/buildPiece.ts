// landscape-shop/sietch/src/model/dressing/buildPiece.ts
// One baked piece -> one named Mesh. The bake stores geometry INDEXED and
// in centimetre integers (tools/bake/pack.mjs); this expands it back into
// a flat-shaded triangle soup in world metres.
//
// Expanded, not indexed, on purpose: the dressing is flat-shaded low-poly
// and a facet's colour belongs to the FACET. An indexed mesh has to share
// a colour wherever it shares a vertex, which would blur every edge
// between a jar's lit side and its shadow side — the only shading these
// objects have at 30-55 pixels per metre.
//
// Normals are computed here rather than stored: on a non-indexed geometry
// three's computeVertexNormals() produces exact face normals, so storing
// them would be a third of the file for a number the model can derive.

import { BufferGeometry, Color, Float32BufferAttribute, Mesh, SRGBColorSpace } from 'three'
import type { Material } from 'three'
import { decodeInt16, decodeUint16, decodeUint8 } from './bakeCodec'

export interface BakedPiece {
  name: string
  zone: string
  source: string
  material: string
  supportY: number
  insideOf: string | null
  // Per-piece provenance for the three R4 CC0 figures; null for every
  // Desert Kingdom piece (covered by the bake's top-level sourceLicence).
  sourceUrl: string | null
  licence: string | null
  transforms: string
  originM: number[]
  boundsMin: number[]
  boundsMax: number[]
  triangles: number
  vertices: number
  posQ: string
  indexQ: string
  toneQ: string
}

const CM = 100

export function buildPiece(piece: BakedPiece, tones: number[], material: Material): Mesh {
  const { originM } = piece
  const posCm = decodeInt16(piece.posQ)
  const index = decodeUint16(piece.indexQ)
  const tone = decodeUint8(piece.toneQ)
  const count = index.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const colour = new Color()

  for (let t = 0; t < count; t += 3) {
    // The tone table holds sRGB hexes; setHex converts to three's linear
    // working space, which is the space a `color` attribute is read in.
    colour.setHex(tones[tone[t / 3]], SRGBColorSpace)
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index[t + corner]
      const at = (t + corner) * 3
      for (let axis = 0; axis < 3; axis++) {
        positions[at + axis] = originM[axis] + posCm[vertex * 3 + axis] / CM
      }
      colors[at] = colour.r
      colors[at + 1] = colour.g
      colors[at + 2] = colour.b
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const mesh = new Mesh(geometry, material)
  mesh.name = piece.name
  // The surface this piece stands on, carried into the scene so the
  // no-floaters guard can check it without re-reading the bake.
  mesh.userData.supportY = piece.supportY
  mesh.userData.insideOf = piece.insideOf
  return mesh
}
