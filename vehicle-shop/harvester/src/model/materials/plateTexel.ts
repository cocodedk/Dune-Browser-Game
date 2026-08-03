// vehicle-shop/harvester/src/model/materials/plateTexel.ts
// WHAT ONE TEXEL OF A PLATED SURFACE LOOKS LIKE. maps.ts owns the buffers;
// this file owns the picture. Pure functions of (u, v) — the ornithopter's
// hullTexel.ts / hullWeathering.ts split, copied rather than imported because
// the vehicle shop does not depend on the game tree or on the other shop.
//
// ======================= WHY THE LINES LAND WHERE THEY DO =================
// This machine is built from boxes: five deck plates, two nose tiers, a tail
// housing, flank panels, track housings, hoppers. Every one of those meshes
// IS a plate of the real machine, and three.js gives a Box/RoundedBox
// geometry per-FACE UVs that run 0..1 across that plate's own face. So the
// face border in UV is not an arbitrary place to draw — it is exactly where
// that plate ENDS and the next one begins. A dirt-filled joint at the border
// and a scribed panel line a fixed inset inside it therefore fall on the
// machine's real construction seams, in world space, with no UV authoring and
// no geometry change. deckSeams.ts turns that claim into arithmetic against
// hullDetail's own plate stations, and deckSeams.test.ts checks it.
//
// The one term that is NOT direction-agnostic is the downward grime, because
// three.js's box UVs put v = 1 at the top of the four SIDE faces but run v
// along Z on the top and bottom faces. A v-gradient therefore means "lower"
// only on vertical surfaces, so it is a per-style weight (`downward`): the
// deck plates get none, the flanks, tiers and underframe get all of it. That
// is why there are two body styles rather than one.
//
// ======================= THE BAND WIDTHS ARE MEASURED =====================
// RoundedBoxGeometry does NOT map its faces linearly, and the numbers below
// were set against what it actually does, probed on the real deck-plate
// dimensions (19 x 2.5 x 9.6, corner radius 1.0) rather than assumed:
//
//   top face, z -> v :  +4.8 -> 0.000   +3.8 -> 0.086
//                       -3.8 -> 0.914   -4.8 -> 1.000
//
// So each 1 m rounded shoulder swallows 8.6% of the v axis and the 7.6 m flat
// middle shares the remaining 83% linearly. A band at d < 0.075 — which would
// be a fifth of a plain BoxGeometry face — would land ENTIRELY inside that
// shoulder and never reach the flat top at all. edgeBand 0.10 reaches about
// 1.1 m in across the plate's ends and 2.1 m in along its sides; the scribed
// line at inset 0.17 sits about 1.8 m and 3.4 m in. Both are drawn on flat
// deck, which is the only place they can be seen.

import { clamp01, dustField, ridge, smoothstep } from './field'
import { ACCENT_COLOR, BODY_COLOR, DARK_COLOR, DUST_COLOR, mixRgb, rgbOf, scaleRgb, type Rgb } from './palette'

export interface Texel {
  rgb: Rgb
  /** 0..1, written into the roughness map. */
  rough: number
}

export interface PlateStyle {
  /** Albedo of a clean texel — the tone the unmapped material used to be. */
  base: Rgb
  /** What the dirt-filled joint at the plate's border tends toward. On the
   *  near-black dark style this is LIGHTER than the base: a rubbed metal edge,
   *  because nothing can read as darker than 0x2e2d29 at render scale. */
  edge: Rgb
  /** What settled dust tends toward on the lower part of a vertical face. */
  grime: Rgb
  /** The scribed panel line. */
  line: Rgb
  /** The weld bead beside it — proud metal, so it catches light. */
  weld: Rgb
  /** Inset of the scribed line from the plate's border, as a face fraction. */
  inset: number
  /** Half-width of a drawn line, as a face fraction. */
  lineHalf: number
  /** Width of the dirty joint band hugging the border. */
  edgeBand: number
  edgeStrength: number
  /** Longitudinal centre join: a 19 m deck is not one plate across. 0 to omit. */
  centreJoin: number
  /** Weight of the "grime settles low" term; see the header. */
  downward: number
  dust: number
  roughClean: number
  roughDirty: number
}

export function plateTexel(u: number, v: number, s: PlateStyle): Texel {
  // Distance to the nearest face border: 0 at the plate's edge, 0.5 dead
  // centre. Every authored feature below is a function of it.
  const d = Math.min(u, 1 - u, v, 1 - v)

  const border = 1 - smoothstep(0, s.edgeBand, d)
  const low = s.downward * smoothstep(0.55, 0.02, v)

  let rgb = mixRgb(s.base, s.edge, border * s.edgeStrength)
  rgb = mixRgb(rgb, s.grime, low)

  // Dust film. Small on purpose — see field.ts.
  rgb = scaleRgb(rgb, 1 - s.dust * dustField(u, v))

  const scribe = Math.max(
    ridge(Math.abs(d - s.inset), s.lineHalf),
    s.centreJoin * ridge(Math.abs(u - 0.5), s.lineHalf),
  )
  rgb = mixRgb(rgb, s.line, clamp01(scribe))

  const bead = ridge(Math.abs(d - (s.inset + s.lineHalf * 2.6)), s.lineHalf * 0.8)
  rgb = mixRgb(rgb, s.weld, bead * 0.5)

  const dirt = clamp01(Math.max(border * s.edgeStrength, low))
  const rough = s.roughClean + (s.roughDirty - s.roughClean) * dirt - 0.14 * Math.max(scribe, bead)
  return { rgb, rough: clamp01(rough) }
}

const BODY_BASE = rgbOf(BODY_COLOR)
const DARK_BASE = rgbOf(DARK_COLOR)
const ACCENT_BASE = rgbOf(ACCENT_COLOR)

/** Deck plates, cab body, tail tower — surfaces whose big visible face points
 *  UP, so no downward gradient (it would run fore-aft, which means nothing). */
export const BODY_PLATE: PlateStyle = {
  base: BODY_BASE,
  edge: mixRgb(BODY_BASE, [58, 52, 42], 0.62),
  grime: mixRgb(BODY_BASE, DUST_COLOR, 0.7),
  line: [46, 43, 37],
  weld: mixRgb(BODY_BASE, [255, 246, 224], 0.42),
  inset: 0.17,
  lineHalf: 0.014,
  edgeBand: 0.1,
  edgeStrength: 0.6,
  centreJoin: 0.6,
  downward: 0,
  dust: 0.07,
  roughClean: 0.76,
  roughDirty: 1,
}

/** The same body tone where the visible face is VERTICAL: nose tiers, tail
 *  housing flanks, underframe. Dust runs down these. */
export const BODY_LOW_PLATE: PlateStyle = {
  ...BODY_PLATE,
  centreJoin: 0.3,
  downward: 1,
  dust: 0.09,
}

/** Housings, seam insets, louvres, flank cladding, ram anchors. Near-black
 *  already, so the joint reads by LIGHTENING and the grime by darkening. */
export const DARK_PLATE: PlateStyle = {
  base: DARK_BASE,
  edge: [84, 81, 72],
  grime: [24, 23, 21],
  line: [14, 14, 12],
  weld: [104, 100, 90],
  inset: 0.15,
  lineHalf: 0.014,
  edgeBand: 0.09,
  edgeStrength: 0.55,
  centreJoin: 0,
  downward: 0.85,
  dust: 0.05,
  roughClean: 0.7,
  roughDirty: 0.95,
}

/** Rust: boom, hoppers, cutter trim, conveyors. Blotchier than the body and
 *  darker in its joints, the way oxide collects. */
export const ACCENT_PLATE: PlateStyle = {
  base: ACCENT_BASE,
  edge: mixRgb(ACCENT_BASE, [38, 26, 18], 0.6),
  grime: mixRgb(ACCENT_BASE, DUST_COLOR, 0.45),
  line: [34, 25, 18],
  weld: mixRgb(ACCENT_BASE, [232, 190, 150], 0.4),
  inset: 0.16,
  lineHalf: 0.015,
  edgeBand: 0.1,
  edgeStrength: 0.55,
  centreJoin: 0,
  downward: 0.55,
  dust: 0.1,
  roughClean: 0.66,
  roughDirty: 0.95,
}
