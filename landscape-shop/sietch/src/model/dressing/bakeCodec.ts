// landscape-shop/sietch/src/model/dressing/bakeCodec.ts
// Decoder for tools/bake/pack.mjs's binary fields. The bake stores
// positions/index/tone as base64 (Int16 centimetres, Uint16, Uint8
// respectively — pack.mjs's own header has the byte-budget arithmetic);
// this is the one place that reverses it, so buildPiece.ts and the
// bake-drift guards (src/dressingBake.test.ts) read the same decode.
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

export function decodeInt16(base64: string): Int16Array {
  const bytes = decodeBytes(base64)
  return new Int16Array(bytes.buffer, 0, bytes.byteLength / 2)
}

export function decodeUint16(base64: string): Uint16Array {
  const bytes = decodeBytes(base64)
  return new Uint16Array(bytes.buffer, 0, bytes.byteLength / 2)
}

export function decodeUint8(base64: string): Uint8Array {
  return decodeBytes(base64)
}
