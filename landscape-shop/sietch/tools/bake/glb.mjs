// landscape-shop/sietch/tools/bake/glb.mjs
// Minimal reader for PLAIN (uncompressed) binary glTF — 12-byte header,
// JSON chunk, BIN chunk, accessors read straight into typed arrays. No
// loader dependency, no WASM, so the dressing bake stays reproducible
// offline for anyone who owns the feedstock. Mirrors the cliff shop's
// reader (landscape-shop/cliff/tools/bake/glb.mjs) — each shop keeps its
// own copy; shops never import across the fence.
//
// This one also reads COLOR_0, because the Desert Kingdom feedstock is
// vertex-coloured with no textures: the vendor colours are what tell one
// PART of a piece from another (trunk vs frond, iron vs clay, flame vs
// bowl), and telling them apart is what makes a principled RE-TINT
// possible instead of a flat repaint. The colours themselves never ship —
// see tools/bake/tones.mjs.
//
// Draco-compressed feedstock is deliberately NOT supported: it would pull
// a WASM decoder into the bake. Decompress first, outside the repo:
//   npx @gltf-transform/cli dedraco in.glb /tmp/out.glb
// (landscape-shop/docs/gauntlet-loop.md, "Sourced assets"). Every asset
// this set uses is already plain, so the bake never needs that step.

import { readFileSync } from 'node:fs'

const GLB_MAGIC = 0x46546c67 // 'glTF'
const FLOAT32 = 5126
const UINT32 = 5125
const UINT16 = 5123

/** Reads the first primitive of the first mesh as a triangle soup:
 *  positions (Float32Array, xyz), index (Uint32Array) and per-vertex
 *  colours (Float32Array, rgb in LINEAR space — glTF's COLOR_0 is linear
 *  by specification, which is also three.js's working space). */
export function readGlbSoup(path) {
  const bytes = readFileSync(path)
  if (bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${path}: not a GLB`)

  const jsonLength = bytes.readUInt32LE(12)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
  if (json.extensionsUsed?.includes('KHR_draco_mesh_compression')) {
    throw new Error(`${path}: Draco-compressed — decompress it first (see this file's header)`)
  }
  const bin = bytes.subarray(20 + jsonLength + 8)

  const primitive = json.meshes?.[0]?.primitives?.[0]
  if (!primitive) throw new Error(`${path}: no mesh primitive`)
  if (primitive.attributes.COLOR_0 == null) throw new Error(`${path}: no COLOR_0 attribute`)

  return {
    name: json.meshes[0].name ?? 'mesh',
    positions: readVec3(json, bin, primitive.attributes.POSITION),
    colors: readColor(json, bin, primitive.attributes.COLOR_0),
    index: readScalar(json, bin, primitive.indices),
  }
}

function viewOf(json, accessorIndex) {
  const accessor = json.accessors[accessorIndex]
  const view = json.bufferViews[accessor.bufferView]
  return { accessor, view, base: (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) }
}

function readVec3(json, bin, accessorIndex) {
  const { accessor, view, base } = viewOf(json, accessorIndex)
  if (accessor.componentType !== FLOAT32) throw new Error('POSITION must be float32')
  const stride = view.byteStride ?? 12
  const out = new Float32Array(accessor.count * 3)
  for (let i = 0; i < accessor.count; i++) {
    const at = base + i * stride
    out[i * 3] = bin.readFloatLE(at)
    out[i * 3 + 1] = bin.readFloatLE(at + 4)
    out[i * 3 + 2] = bin.readFloatLE(at + 8)
  }
  return out
}

/** COLOR_0 may be VEC3 or VEC4 and float, ushort or ubyte. Only rgb is
 *  kept: nothing in this feedstock uses per-vertex alpha, and the retint
 *  discards the values anyway — it reads them only to tell parts apart. */
function readColor(json, bin, accessorIndex) {
  const { accessor, view, base } = viewOf(json, accessorIndex)
  const components = accessor.type === 'VEC4' ? 4 : 3
  const type = accessor.componentType
  const width = type === FLOAT32 ? 4 : type === UINT16 ? 2 : 1
  const stride = view.byteStride ?? width * components
  const out = new Float32Array(accessor.count * 3)
  for (let i = 0; i < accessor.count; i++) {
    const at = base + i * stride
    for (let c = 0; c < 3; c++) {
      const o = at + c * width
      out[i * 3 + c] = type === FLOAT32
        ? bin.readFloatLE(o)
        : type === UINT16 ? bin.readUInt16LE(o) / 65535 : bin.readUInt8(o) / 255
    }
  }
  return out
}

function readScalar(json, bin, accessorIndex) {
  const { accessor, base } = viewOf(json, accessorIndex)
  const width = accessor.componentType === UINT32 ? 4 : 2
  const out = new Uint32Array(accessor.count)
  for (let i = 0; i < accessor.count; i++) {
    out[i] = width === 4 ? bin.readUInt32LE(base + i * 4) : bin.readUInt16LE(base + i * 2)
  }
  return out
}

/** Axis-aligned bounds of the vertices an index array actually reaches. */
export function boundsOf(positions, index) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const vi of index) {
    for (let c = 0; c < 3; c++) {
      const v = positions[vi * 3 + c]
      if (v < min[c]) min[c] = v
      if (v > max[c]) max[c] = v
    }
  }
  return { min, max }
}
