// landscape-shop/cliff/src/model/rockRamp.ts
// The formation's COLOUR TABLE: which shade a stratigraphic member is, and
// the bed rhythm inside it. Split out of model/strata.ts, which now owns only
// the geometry of the bedding (where a member starts and how it tilts).
//
// EVERYTHING HERE IS SIZED FROM THE RENDERED FRAME, not from the palette.
// R2's first pass authored a wide ramp and measured it wide in the vertex
// colours — and the approach rig still came back "one near-uniform warm-brown
// value, no distinct colour bands". tools/probe.mjs says why, in numbers
// taken off the PNG itself:
//
//   rendered_linear  ~=  0.10 * albedo_linear  +  0.071
//
// The slope is the harness's own light (ambient 0.45 plus a grazing key that
// most of the front wall is turned away from, all divided by Lambert's PI);
// the offset is FogExp2 at 900 m. A whole albedo doubling therefore moves the
// rendered pixel by a handful of levels, and the first pass's adjacent
// members measured 5.6 of 255 apart on the massif — under the roughly 12
// levels a person can pick out at that size. So this table is authored
// BACKWARD from the pixel: the numbers below predict 18-25 levels.

export type Rgb = [number, number, number]

export function hexRgb(hex: number): Rgb {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255]
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

// The ramp, iron-rust bed to chalk bed. Both ends are real desert rock and
// both stay in the warm PALETTE family — but they are now genuine EXTREMES
// rather than two shades of the same brown: 46/255 of authored luminance
// against 208, where the first pass ran 57 against 172 and spent most of its
// members in the flat middle. The middle two stops sit where the member tones
// below actually land, so the ramp is steep exactly across the gap the eye
// has to see and never wastes its range on shades nothing is painted with.
const RAMP: Array<{ at: number; rgb: Rgb }> = [
  { at: 0, rgb: hexRgb(0x46260f) },
  { at: 0.3, rgb: hexRgb(0x6d3a1a) },
  { at: 0.62, rgb: hexRgb(0xb6a485) },
  { at: 1, rgb: hexRgb(0xe2dac2) },
]

// The thin, hard, iron-rich bed at a member's base. Dark against a chalk
// member, which is what draws the LINE a person reads as bedding.
const PARTING = hexRgb(0x2b1d12)

// The two halves the members alternate between. The gap between them is what
// guarantees a step: the closest a pale and a dark member can come is 0.30
// against 0.62 on the ramp, which is 0.39 of linear albedo — about 18
// rendered levels through the fog.
const PALE_FLOOR = 0.62
const DARK_CEILING = 0.3

/** Where in the ramp a member sits.
 *
 *  ALTERNATING, which is both what the pixel needs and what the rock does. A
 *  first pass drifted the tone with two slow sines; measured, three of its
 *  seven members came out within 2 levels of each other, so the sequence had
 *  long stretches with no step in it at all and the "bands" the guards saw
 *  averaged into one wash on screen. Real bedded stratigraphy alternates
 *  resistant with recessive, pale with iron-stained, member after member —
 *  so the parity carries the STEP, and the same two sines as before survive
 *  to choose HOW pale or HOW dark this particular member is. No two members
 *  land on the same shade, and model/strata.ts's WARP keeps their thicknesses
 *  uneven, so it reads as stratigraphy and not as a paint scheme. */
export function memberTone(member: number): number {
  const drift = 0.5 + 0.5 * (0.62 * Math.sin(member * 1.35 + 0.9) + 0.38 * Math.sin(member * 0.57 - 2.1))
  const pale = (((member % 2) + 2) % 2) === 0
  return pale ? PALE_FLOOR + (1 - PALE_FLOOR) * drift : DARK_CEILING * drift
}

/** Individual beds inside a member, as a step in LIGHTNESS — one step per
 *  course. It is what gives the LANDING rig something to read: at 80 m the
 *  frame holds barely one member, so without a bed rhythm the near wall is
 *  one flat colour. Lightness, not a step along the ramp, because the ramp's
 *  own middle is largely a hue move and hue survives the fog badly.
 *
 *  0.18 -> 0.26 with the rest of R2.1: the same fog transfer that flattens
 *  the members flattens the beds. */
const BED_STEP = 0.26

export function bedLift(course: number): number {
  return BED_STEP * Math.sin(course * 2.3 + 1.1)
}

/** Ramped over the bottom fifth of a member, so the parting is about one bed
 *  thick — the scale a real sequence puts between its members. */
export function partingAt(coord: number): number {
  const up = coord - Math.floor(coord)
  const t = Math.min(1, Math.max(0, (0.2 - up) / 0.14))
  return t * t * (3 - 2 * t)
}

/** The member's own shade, parting included. */
export function memberColorAt(coord: number): Rgb {
  return mix(rampAt(memberTone(Math.floor(coord))), PARTING, 0.72 * partingAt(coord))
}

function rampAt(tone: number): Rgb {
  for (let i = 1; i < RAMP.length; i++) {
    if (tone > RAMP[i].at && i < RAMP.length - 1) continue
    const low = RAMP[i - 1]
    return mix(low.rgb, RAMP[i].rgb, (tone - low.at) / (RAMP[i].at - low.at))
  }
  return RAMP[RAMP.length - 1].rgb
}
