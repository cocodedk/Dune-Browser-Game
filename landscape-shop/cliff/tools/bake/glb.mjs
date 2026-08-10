// landscape-shop/cliff/tools/bake/glb.mjs
// Minimal reader for PLAIN (uncompressed) binary glTF — 12-byte header,
// JSON chunk, BIN chunk, accessors read straight into typed arrays. No
// loader dependency, no WASM, so the bake stays reproducible offline for
// anyone who owns the feedstock.
//
// Draco-compressed feedstock is deliberately NOT supported here: it would
// pull a WASM decoder into the bake. Decompress first if you need one:
//   npx @gltf-transform/cli cp in.glb out.glb
// (see landscape-shop/docs/gauntlet-loop.md, "Sourced assets").

import { readFileSync } from 'node:fs'

const GLB_MAGIC = 0x46546c67 // 'glTF'

/** Reads the first primitive of the first mesh. Returns a triangle soup:
 *  positions as a flat Float32Array and a Uint32Array of indices. */
export function readGlbPrimitive(path) {
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

  return {
    name: json.meshes[0].name ?? 'mesh',
    positions: readVec3(json, bin, primitive.attributes.POSITION),
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
  if (accessor.componentType !== 5126) throw new Error('POSITION must be float32')
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

function readScalar(json, bin, accessorIndex) {
  const { accessor, base } = viewOf(json, accessorIndex)
  const width = accessor.componentType === 5125 ? 4 : 2
  const out = new Uint32Array(accessor.count)
  for (let i = 0; i < accessor.count; i++) {
    out[i] = width === 4 ? bin.readUInt32LE(base + i * 4) : bin.readUInt16LE(base + i * 2)
  }
  return out
}

/** Re-origins a source soup: horizontally centred on its own bounding box,
 *  vertically sitting on y = 0, so instance transforms in the composition
 *  table read as plain "this tall, this wide, standing here". */
export function normalizeSource(soup) {
  const p = soup.positions
  let minX = Infinity, maxX = -Infinity, minY = Infinity
  let minZ = Infinity, maxZ = -Infinity, maxY = -Infinity
  for (let i = 0; i < p.length; i += 3) {
    minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i])
    minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1])
    minZ = Math.min(minZ, p[i + 2]); maxZ = Math.max(maxZ, p[i + 2])
  }
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const out = new Float32Array(p.length)
  for (let i = 0; i < p.length; i += 3) {
    out[i] = p[i] - cx
    out[i + 1] = p[i + 1] - minY
    out[i + 2] = p[i + 2] - cz
  }
  let maxRadius = 0
  for (let i = 0; i < out.length; i += 3) maxRadius = Math.max(maxRadius, Math.hypot(out[i], out[i + 2]))

  return {
    ...soup,
    positions: out,
    size: [maxX - minX, maxY - minY, maxZ - minZ],
    height: maxY - minY,
    maxRadius,
  }
}
