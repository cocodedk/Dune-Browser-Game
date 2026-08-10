// landscape-shop/sietch/tools/bake/tones.mjs
// THE RE-TINT. The licence lets the set use reshaped feedstock; the art
// direction does not let the feedstock's own colours survive. Desert
// Kingdom is a sunlit ochre-and-turquoise kit — bright green fronds,
// #2ea1be water, red-and-yellow spice. Dropped into a firelit Fremen hall
// unchanged it would read as a market stall someone left in a cave.
//
// So no baked colour is ever a source colour. Every tone below is a
// documented function of spec.ts's PALETTE and DRESSING.hearthColor —
// scaled (hue-preserving), mixed, or warmed — and nothing else. The five
// palette hexes are duplicated here because a .mjs bake cannot import a
// .ts module; src/dressing.test.ts asserts the bake's recorded copy still
// equals spec.ts, so the duplicate cannot drift silently.
//
// What the vendor colours ARE used for is telling parts apart: a source
// vertex's hue says whether it is foliage, water or fired clay, and its
// luminance says whether it is the lit side or the shadow side of that
// part. That structure is kept; the colours are replaced.

// MUST equal spec.ts PALETTE / DRESSING.hearthColor — guarded, not trusted.
export const PALETTE = {
  rock: 0x6b5138,
  rockShadow: 0x3a2a1a,
  rockGlowlit: 0x8a6a48,
  water: 0x1e3a38,
  palmFrond: 0x5a6b3a,
}
export const HEARTH_COLOR = 0xffb05c

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const hex = ([r, g, b]) => (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b)
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)))

/** Hue-preserving lighten/darken: every channel by the same factor. */
const scale = (h, k) => hex(rgb(h).map((v) => v * k))
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t))
/** Pulls a warm tone further toward red by holding R and pulling G and B
 *  down — the only hue move in this file, and it never leaves the ochre
 *  band PALETTE.rock already sits in (~29 deg). */
const redden = (h, k) => { const [r, g, b] = rgb(h); return hex([r, g * (0.5 + k / 2), b * k]) }

const { rock, rockShadow, rockGlowlit, water, palmFrond } = PALETTE

// Each ramp is dark -> mid -> light. A source colour's luminance, ranked
// against the rest of its own piece, picks the position; so a piece keeps
// its internal light-to-dark structure and loses its hue.
export const RAMPS = {
  // Cut rock: exactly the hall's own three stone tones.
  stone: [scale(rock, 0.55), rock, rockGlowlit],
  // Soot, iron, charred wood — the darkest thing in the room.
  char: [scale(rockShadow, 0.32), scale(rockShadow, 0.55), rockShadow],
  // Basketry, rope, matting: dry plant fibre, lighter and yellower than
  // the rock it sits on so stacked goods read as goods.
  fibre: [scale(rock, 0.72), mix(rock, rockGlowlit, 0.6), scale(rockGlowlit, 1.18)],
  // Woven cloth and sacking, the warm end — bleached by the hearth.
  cloth: [redden(scale(rock, 0.75), 0.6), mix(rock, HEARTH_COLOR, 0.14), mix(rockGlowlit, HEARTH_COLOR, 0.42)],
  // Palm trunks and carpet poles: wood reads darker than stone, or the
  // palmary disappears into the wall behind it.
  wood: [scale(rockShadow, 0.85), mix(rockShadow, rock, 0.55), mix(rock, rockGlowlit, 0.45)],
  // Fronds and scrub. Hue-preserving scaling only: PALETTE.palmFrond's own
  // dusty olive at three values, never a fresh green.
  frond: [scale(palmFrond, 0.5), palmFrond, mix(scale(palmFrond, 1.12), rockGlowlit, 0.16)],
  // Standing water, in shadow and catching the hearth.
  water: [scale(water, 0.6), water, scale(water, 1.55)],
  // The fire itself — DRESSING.hearthColor, the light's own colour, given
  // a body to come from.
  ember: [mix(HEARTH_COLOR, rockShadow, 0.55), mix(HEARTH_COLOR, rock, 0.22), HEARTH_COLOR],
  // R4 figures — worn robes: dusty dark umber/charcoal, rockShadow's own
  // family (never cloth's reddened warmth, which is bleached-by-the-hearth
  // sacking, not what a body wears). Lighter than char (soot has no hue
  // left at all) but the darkest CLOTHED tone in the set on purpose — three
  // quiet, unlit-looking presences, not three more lit objects competing
  // with the hearth's own glow.
  robe: [scale(rockShadow, 0.7), mix(rockShadow, rock, 0.35), mix(rockShadow, rock, 0.55)],
  // R4 figures — muted skin: warmed rockGlowlit, the same hue rock already
  // sits in, pulled toward HEARTH_COLOR only enough to read as flesh lit by
  // firelight rather than as more cut stone. Never fibre or cloth's
  // yellow — skin is redder than either.
  skin: [mix(rock, rockGlowlit, 0.3), mix(rock, rockGlowlit, 0.55), mix(rockGlowlit, HEARTH_COLOR, 0.12)],
}

/** Relative luminance of an sRGB-encoded hex, 0..1 — the ranking key. */
export function luminanceOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function linearToSrgb(v) {
  const c = Math.max(0, Math.min(1, v))
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

export function srgbToLinear(v) {
  const c = Math.max(0, Math.min(1, v))
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Hue in degrees and HSL-style saturation of an sRGB 0..1 triple. */
export function hueSat(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const span = max - min
  if (span < 1e-6) return { hue: 0, sat: 0 }
  let hue
  if (max === r) hue = 60 * (((g - b) / span) % 6)
  else if (max === g) hue = 60 * ((b - r) / span + 2)
  else hue = 60 * ((r - g) / span + 4)
  return { hue: (hue + 360) % 360, sat: span / (max + min) }
}

/** Which ramp a SOURCE colour belongs to, given the piece's own main and
 *  foliage ramps. Hue windows, not guesses: the feedstock's foliage sits
 *  at 90-100 deg, its water and glaze at 180-200, its clay and cloth
 *  below 60. Anything with almost no chroma is iron, char or bone. */
export function familyOf(srgb, mainRamp, foliageRamp) {
  const [r, g, b] = srgb
  const { hue, sat } = hueSat(r, g, b)
  if (sat < 0.10) return luminanceOf(r, g, b) < 0.22 ? 'char' : mainRamp
  if (hue >= 150 && hue < 265) return 'water'
  if (hue >= 55 && hue < 150) return foliageRamp
  return mainRamp
}

/** Position `t` (0..1) along a three-stop ramp. */
export function rampAt(ramp, t) {
  const stops = RAMPS[ramp]
  if (!stops) throw new Error(`unknown ramp: ${ramp}`)
  const k = Math.max(0, Math.min(1, t)) * 2
  const i = Math.min(1, Math.floor(k))
  return mix(stops[i], stops[i + 1], k - i)
}
