// vehicle-shop/harvester/src/model/materials/palette.ts
// The machine's colours, in ONE place, plus the small RGB arithmetic the
// weathering texel functions need. Moved out of Harvester.ts (round I6): that
// file owned five bare hex constants, and the weathering maps have to mix
// toward and away from those same tones, so a copy in a second file would be
// a palette that drifts.
//
// The maps BAKE albedo (the ornithopter's hullWeathering.ts house pattern):
// a mapped material carries `color: 0xffffff` and the texture holds the tone,
// so a clean texel renders EXACTLY the colour the unmapped material used to.
// Only `trim` and `wheel` stay unmapped and keep their hex on the material.

export { TRIM_COLOR } from '../../spec'

/** Sand body — the film's desert-industrial platform tone. */
export const BODY_COLOR = 0xb8a87f
/** Near-black pods, housings and machinery. */
export const DARK_COLOR = 0x2e2d29
/** Steel: wheel tires, housing caps, sprocket drums, ram barrels. */
export const WHEEL_COLOR = 0x6f6757
/** Rusted-metal accents — boom, hoppers, cutter. */
export const ACCENT_COLOR = 0x6b4f35
/** The belt's own red — user direction, muted industrial. */
export const BELT_COLOR = 0x8f2f2a

export type Rgb = readonly [number, number, number]

export function rgbOf(hex: number): Rgb {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function scaleRgb(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k]
}

/** Rec.709 relative luminance of an 0-255 triple. The tests compare texels
 *  with this rather than a single channel, so a mix that darkens one channel
 *  and lifts another cannot pass as "grimier". */
export function luminance(c: Rgb): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Airborne dust: what every grimed surface on this machine tends toward.
 *  Warm and pale, because the grime out here is SAND, not soot. */
export const DUST_COLOR: Rgb = [122, 108, 82]

/** THE BELT'S PER-LINK WEAR, and why it is a tint list rather than a
 *  position rule. The links physically CYCLE — belt.ts drives one closed
 *  chain, so a given link is on the sand this second and over the top run
 *  the next — which makes "darker on the ground run" impossible to express
 *  as a static assignment: it would have to repaint links every frame, and
 *  a link would visibly change colour as it rounded a sprocket. Wear that
 *  belongs to the LINK travels with the link, which is what these do: one
 *  shared wear map, four neutral tints, links dealt round-robin. The chain
 *  reads used and unevenly worn from any angle, at any phase. */
export const BELT_LINK_TINTS: readonly number[] = [1.0, 0.9, 0.8, 0.94]

/** Which wear tint link `index` gets. Deterministic — the same chain every
 *  run — but irregular: a strict `index % count` would lay a repeating
 *  four-plate rhythm down all 29 plates of a straight run, and a rhythm reads
 *  as a pattern, not as wear. WHICH of 74 identical plates happens to be the
 *  worn one is genuinely arbitrary on a real track; the surface detail on
 *  them is not, and that is authored (maps.ts). */
export function beltTintIndex(index: number, count: number): number {
  const h = Math.sin(index * 12.9898) * 43758.5453
  return Math.floor((h - Math.floor(h)) * count) % count
}
