// landscape-shop/cliff/src/model/bakeCodec.ts
// Decoder for tools/bake/pack.mjs's quantized binary fields (its own header
// has the byte-budget arithmetic). massif.ts and dressing.ts are the read
// sites; bakeSeam.test.ts decodes independently too, so the guard exercises
// this same codec rather than trusting whatever massif.ts already did with
// it. Deliberately a standalone copy, not a shared import: landscape shops
// may not import each other (docs/PRD/dune92/04-asset-pipeline.md), and
// landscape-shop/sietch/src/model/dressing/bakeCodec.ts carries the same
// two functions for that reason.
//
// `atob` is a DOM global (tsconfig's `lib` includes it) and is also a Node
// 18+ global, so this file needs no bundler polyfill and runs unchanged in
// both the browser build and the node-environment vitest suite
// (vite.config.ts: `test.environment: 'node'`).

function decodeBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Int16 fixed-point positions, `scale` units per metre — the same `round`
 * the piece's own tools/bake/pack.mjs `weld()` call used, so this expansion
 * adds no rounding beyond what the commit already carries (pack.mjs's own
 * header). 10 = decimetre (the massif, and the dressing rock/sand
 * families); 100 = centimetre (the smaller dressing goods).
 */
export function decodeQuantizedPositions(base64: string, scale: number): number[] {
  const bytes = decodeBytes(base64)
  const raw = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
  const out = new Array<number>(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] / scale
  return out
}

/** Uint16 triangle index — exact integers, no scale. */
export function decodeIndex(base64: string): number[] {
  const bytes = decodeBytes(base64)
  const raw = new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
  return Array.from(raw)
}
