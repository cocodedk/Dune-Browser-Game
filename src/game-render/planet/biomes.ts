// src/game-render/planet/biomes.ts
// What kind of ground is at a point on Arrakis.
//
// PURE. Takes a latitude and a large-scale "continental" noise sample and
// returns how much relief the terrain should have there and how to tint it.
// No three.js, so the whole scheme is unit-testable without a GL context.
//
// The point is that spinning the globe should show you somewhere you have not
// been. One noise field applied uniformly gives a planet that looks identical
// from every angle, which reads as unfinished however good the dunes are.
//
// The biomes are the ones Arrakis actually has in the books: polar caps, the
// great ergs, the rock of the shield wall and the northern massif, and the
// salt pans left by vanished seas.

export type BiomeId = 'polar' | 'erg' | 'rock' | 'pan'

export interface BiomeSample {
  /** Dominant biome, for labelling and tests. */
  id: BiomeId
  /** Multiplier on the planet's base relief. */
  relief: number
  /**
   * Per-vertex tint, multiplied into the sand palette by the shader.
   *
   * Channels above 1 brighten. That is safe here: the multiply lands before
   * tone mapping, so ACES rolls off anything that would otherwise clip.
   */
  tint: readonly [number, number, number]
}

interface BiomeDef {
  relief: number
  tint: readonly [number, number, number]
}

const DEFS: Record<BiomeId, BiomeDef> = {
  // Ice and rime over rock. Barely any dune relief — wind cannot pile what it
  // cannot lift.
  // [0.88, 1.18, 2.60] read as open water or a shader error, not ice: blue is
  // the one hue this palette reserves for spice, and 2.60 spent that accent on
  // a polar ribbon. Retinted as pale frost — floor raised (0.88 -> 1.30) so the
  // cap is bright rather than merely blue, ceiling pulled down (2.60 -> 1.72)
  // so no channel runs far enough ahead to read as a colour. By arithmetic
  // against that ratio, not from a render.
  polar: { relief: 0.20, tint: [1.30, 1.42, 1.72] },
  // The great sand seas. This is the baseline the dune tuning was done against.
  erg: { relief: 1.00, tint: [1.00, 1.00, 1.00] },
  // Shield wall and massif: bare rock, sharply higher and much darker than
  // sand, which is what makes it read as a different material from orbit.
  // Sun-baked stone. Tints MULTIPLY the sand palette per vertex, and at
  // 0.60/0.48/0.40 rock gave up half the light falling on it — wrong for
  // ground in direct sun. Tried as a cause of the globe's "chocolate mud" and
  // it is NOT one: over a captured noon disc it moved mean luma 37.1 -> 38.5.
  // Kept on merit; inspectLights.ts's header lists what that has ruled out.
  rock: { relief: 2.05, tint: [0.88, 0.76, 0.62] },
  // Salt pans left by seas that dried before the Fremen arrived. Flat, pale,
  // and slightly cool against all that orange.
  pan: { relief: 0.16, tint: [1.16, 1.09, 0.88] },
}

/**
 * What a fully greened region looks like from orbit.
 *
 * Not a lawn. Arrakis greened is scrub, palmary and grass holding sand down —
 * grey-green and dusty, and the tint has to stay dark enough that the terrain
 * relief still reads through it.
 */
// Red has to be pushed down hard, not just green pushed up: this multiplies a
// strongly orange sand palette, and a merely green-biased tint comes out olive.
// Measured, [0.42, 0.72, 0.34] moved green/red from 0.45 to only 0.55.
const VEGETATION_TINT: readonly [number, number, number] = [0.20, 0.86, 0.30]

/**
 * Blend a biome tint toward vegetation.
 *
 * @param vegetation 0..100, as the ecology system tracks it.
 *
 * Deliberately not linear. Below the settled threshold the planting is a few
 * bulbs in the sand and should be almost invisible from orbit; past it, the
 * region turns visibly. The player should be able to see which regions they
 * have committed to without opening a panel.
 */
export function greened(
  tint: readonly [number, number, number],
  vegetation: number,
): [number, number, number] {
  const t = smoothstep(12, 72, Math.max(0, Math.min(100, vegetation)))
  return [
    tint[0] + (VEGETATION_TINT[0] - tint[0]) * t,
    tint[1] + (VEGETATION_TINT[1] - tint[1]) * t,
    tint[2] + (VEGETATION_TINT[2] - tint[2]) * t,
  ]
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * What the deep-night side of Arrakis reads as, before any lit rock or
 * settlement lights are drawn over it.
 *
 * The night hemisphere was reading as the daytime sand palette simply dimmed
 * by ambient light, which comes out as a muddy dark brown — an unlit render,
 * not a night one. A real night sky biases blue (the residual light left
 * after direct sun is gone scatters more at the blue end, and moonlight is
 * already cool), so this pushes blue up and pulls red down rather than
 * darkening every channel by the same amount.
 */
// Dark, not merely blue. At [0.16, 0.20, 0.62] this was a mid-value colour, and
// mid-value is the problem: sRGB-encoded it lands near rgb(112, 124, 207), so
// the night hemisphere rendered as a bright flat periwinkle disc with no relief
// visible anywhere on it — measured off a captured midnight frame, which showed
// exactly that value across the whole dark side. Night has to be dark enough
// that terrain shading, settlement lights and the starfield all read against
// it; the hue still says night, the value now says night too.
const NIGHT_TINT: readonly [number, number, number] = [0.05, 0.07, 0.20]

/**
 * Blend a tint toward the night colour above.
 *
 * @param amount 0 (full day, tint unchanged) .. 1 (full night).
 *
 * Same shape as {@link greened}: a straight lerp per channel, because the
 * caller already owns the falloff curve (the night wash's own terminator
 * band) and a second easing here would just fight it.
 */
export function nightTint(
  tint: readonly [number, number, number],
  amount: number,
): [number, number, number] {
  const t = Math.max(0, Math.min(1, amount))
  return [
    tint[0] + (NIGHT_TINT[0] - tint[0]) * t,
    tint[1] + (NIGHT_TINT[1] - tint[1]) * t,
    tint[2] + (NIGHT_TINT[2] - tint[2]) * t,
  ]
}

/**
 * Blend the biomes at a point.
 *
 * @param latitudeDeg  -90 at the south pole, +90 at the north.
 * @param continental  Large-scale noise in [0, 1]. High is upland rock, low is
 *   basin and pan; the middle is sand, which is most of the planet.
 *
 * Blended rather than switched. A hard boundary between biomes draws a ring
 * around the globe that no amount of good terrain can hide.
 */
export function biomeAt(latitudeDeg: number, continental: number): BiomeSample {
  const lat = Math.abs(latitudeDeg)
  const c = Math.min(1, Math.max(0, continental))

  // 57..73 gave a cap too small to clear the limb; 48..66 gave one that ate
  // a third of the planet. This is the band that reads as a polar region.
  const polar = smoothstep(55, 70, lat)
  const rest = 1 - polar

  // Rock and pan compete for the extremes of the continental field; sand takes
  // whatever is left, which keeps the erg dominant as it should be.
  // Thresholds sit close to the middle of the range on purpose. fBm output
  // clusters hard around its mean, so edges out at 0.62/0.80 fired almost
  // nowhere and the whole planet came out as one uniform erg.
  const rock = rest * smoothstep(0.56, 0.72, c)
  const pan = rest * smoothstep(0.56, 0.72, 1 - c)
  const erg = Math.max(0, rest - rock - pan)

  const weights: [BiomeId, number][] = [
    ['polar', polar], ['rock', rock], ['pan', pan], ['erg', erg],
  ]

  let relief = 0
  const tint: [number, number, number] = [0, 0, 0]
  let total = 0
  for (const [id, w] of weights) {
    if (w <= 0) continue
    const def = DEFS[id]
    relief += def.relief * w
    tint[0] += def.tint[0] * w
    tint[1] += def.tint[1] * w
    tint[2] += def.tint[2] * w
    total += w
  }

  // Weights are constructed to sum to 1, but normalising costs nothing and
  // means a future edge case cannot silently produce a black planet.
  if (total > 0) {
    relief /= total
    tint[0] /= total
    tint[1] /= total
    tint[2] /= total
  }

  const dominant = weights.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  return { id: dominant, relief, tint }
}
