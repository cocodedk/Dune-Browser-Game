// src/game-render/modes/conversation/figureValueTargets.ts
// Pure arithmetic model of the compositing math CharacterCard.ts,
// figureHead.ts and figureFaceShade.ts actually run, so the value-hierarchy
// fix (critic's Critical 3 — Stilgar's backdrop measured brighter than his
// own lit cheek) can be asserted without a canvas, which Vitest doesn't have.
//
// This is a model, not a captured frame: standard alpha-over and multiply
// compositing formulas applied to the exact constants the drawing code
// exports (BACKDROP_LIFT_ALPHA, FACE_SKIN_MIX, and so on), sampled at the
// two points the critic named — the backdrop immediately beside the head,
// and the face's own lit cheek. It cannot replace looking at a rendered
// card, only guard the specific regression the critic found. It
// deliberately omits the diagonal key shaft's contribution at the backdrop
// sample point: the shaft is anchored off the head axis by design (see
// cardBackdrop.ts's paintKeyShaft) and is negligible there, so treating it
// as zero is the honest simplification rather than a hidden one.

import type { PortraitDef } from '../../../data/portraits'
import { SKIN_TONES } from '../../../data/portraits'
import { BACKDROP_LIFT_ALPHA, EDGE_DARKEN_ALPHA } from './cardBackdrop'
import { FACE_SKIN_MIX } from './figureHead'
import { KEY_SHADE_HILITE_BASE_ALPHA, KEY_SHADE_HILITE_HARDNESS, CHEEK_HILITE_ALPHA, CHEEK_SPECULAR_ALPHA } from './figureFaceShade'

type RGB = [number, number, number]

function parseHex(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Standard "source-over" alpha compositing, per channel. */
function over(base: RGB, src: RGB, alpha: number): RGB {
  return [0, 1, 2].map((i) => base[i] * (1 - alpha) + src[i] * alpha) as RGB
}

/** Canvas 'multiply' blend, composited over the base at the given alpha —
 * matches paintEdgeDarken's globalCompositeOperation = 'multiply' pass. */
function multiplyOver(base: RGB, src: RGB, alpha: number): RGB {
  const blended = [0, 1, 2].map((i) => (base[i] * src[i]) / 255) as RGB
  return over(base, blended, alpha)
}

/** Relative luminance rescaled to 0-100, matching how the critic reported
 * values ("L83-85", "L90"). */
export function lightness(rgb: RGB): number {
  const [r, g, b] = rgb
  return ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * 100
}

/**
 * The backdrop's value immediately beside the head: base colour, the flat
 * lift, then the edge-darken multiply at its strongest (innermost) stop.
 */
export function backdropEdgeLightness(def: PortraitDef): number {
  const base = parseHex(def.backTop)
  const lifted = over(base, parseHex('#e8a86a'), BACKDROP_LIFT_ALPHA)
  const darkened = multiplyOver(lifted, [40, 32, 24], EDGE_DARKEN_ALPHA)
  return lightness(darkened)
}

/**
 * The face's own lit value: base skin fill, the key-shade highlight's
 * brightest stop, the cheekbone wash, and the specular this task adds —
 * composited in the order figureHead.ts/figureFaceShade.ts actually paint
 * them, each at its own brightest stop.
 */
export function faceLitLightness(def: PortraitDef): number {
  const base = over(parseHex(def.figure), parseHex(SKIN_TONES[def.skinTone]), FACE_SKIN_MIX)
  const keyAlpha = KEY_SHADE_HILITE_BASE_ALPHA + def.keyHardness * KEY_SHADE_HILITE_HARDNESS
  const keyLit = over(base, [255, 224, 180], keyAlpha)
  const cheekLit = over(keyLit, [255, 220, 180], CHEEK_HILITE_ALPHA)
  const specular = over(cheekLit, [255, 248, 235], CHEEK_SPECULAR_ALPHA)
  return lightness(specular)
}
