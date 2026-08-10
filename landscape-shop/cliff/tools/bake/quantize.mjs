// landscape-shop/cliff/tools/bake/quantize.mjs
// R4: CHUNK BUDGET. massifBake.json's plain-JSON positions+index alone ran
// 386 KB — no single landscape-*.js chunk (150,000-byte budget,
// landscape-shop/docs/gauntlet-loop.md) could hold it. Two things fix that:
// binary-as-base64 instead of a JSON number array (a Float64 JSON literal
// like "12.34" already costs 5+ bytes; the same value as 2 packed bytes
// costs under 3 once base64'd), and INTEGER quantization, so those 2 bytes
// are Int16/Uint16 instead of Float32/Float64. pack.mjs's `weld()` already
// snaps every position onto a 1/`round` metre grid, so quantizing at that
// SAME `round` (the caller's own weld quantum -- decimetre for the massif
// and rock/sand dressing, centimetre for the smaller dressing goods) adds
// no precision loss beyond what the commit already carries: this is a
// re-encoding of the welded grid, not a second rounding pass. Split from
// pack.mjs once that file crossed the 200-line rule. Model code decodes
// this back via src/model/bakeCodec.ts.

/** Int16 fixed-point: `scale` units per metre (matches a weld() call's own
 *  `round`). Throws on overflow rather than silently wrapping, the same
 *  contract pack.mjs's packPiece holds itself to. */
export function quantizePositions(positions, scale) {
  const out = new Int16Array(positions.length)
  for (let i = 0; i < positions.length; i++) {
    const q = Math.round(positions[i] * scale)
    if (q < -32768 || q > 32767) {
      throw new Error(`quantizePositions: ${positions[i]}m overflows Int16 at scale ${scale}`)
    }
    out[i] = q
  }
  return out
}

/** Uint16: safe as long as the piece's own vertex count stays under 65,536
 *  -- true of every family and of the massif itself (asserted here, not
 *  assumed, since a future round could grow either past it). */
export function quantizeIndex(index, vertexCount) {
  const out = new Uint16Array(index.length)
  for (let i = 0; i < index.length; i++) {
    if (index[i] >= vertexCount || index[i] > 65535) {
      throw new Error(`quantizeIndex: vertex index ${index[i]} overflows Uint16 (${vertexCount} vertices)`)
    }
    out[i] = index[i]
  }
  return out
}

export function base64Of(typedArray) {
  return Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength).toString('base64')
}
