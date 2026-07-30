// src/game-render/modes/conversation/figureFaceLayout.ts
// Pure geometry: where the head sits on the card, and where its features sit
// on the head. No canvas calls here on purpose — every offset is a plain
// number so the layout itself is testable without a WebGL/canvas context,
// and drawFigure.ts / figureHead.ts stay drawing code, not geometry code.

import type { PortraitDef } from '../../../data/portraits'

export interface HeadPlacement {
  headX: number
  headY: number
  headR: number
  shoulderY: number
  shoulderHalf: number
}

/**
 * Where the head, and by extension the shoulders, land on a W x H card. A
 * closer subject (`framing`) sits lower and larger; `build` scales the whole
 * head, which is why jaw and cheek fullness (below) carry the rest of what
 * "build" means for the face specifically.
 */
export function computeHeadPlacement(def: PortraitDef, width: number, height: number): HeadPlacement {
  const scale = 0.86 + def.framing * 0.34
  const headR = 46 * scale * def.build
  const headX = width / 2
  const headY = height * 0.42 - def.framing * 22
  return {
    headX, headY, headR,
    shoulderY: headY + headR * 2.25,
    shoulderHalf: headR * 2.5 * def.build,
  }
}

/**
 * Face width relative to the old fixed 0.74 * headR. jaw runs roughly 0.75
 * (ascetic) to 1.3 (heavy); dampened so the ellipse warps rather than
 * grotesques — a Baron and a Chani should still both read as heads.
 */
export function jawWidth(headR: number, jaw: number): number {
  return headR * 0.74 * (0.7 + 0.3 * jaw)
}

/** Offsets and half-widths for every drawn feature, all already in card px. */
export interface FaceLayout {
  jawHalfW: number
  browY: number
  browHalfW: number
  /** Radians, mirrors eyeTilt so brow and eyes read as one decision. */
  browTilt: number
  noseTopY: number
  noseTipY: number
  noseHalfW: number
  cheekY: number
  cheekHalfW: number
  mouthY: number
  mouthHalfW: number
  chinY: number
  chinHalfW: number
  /** 0..1ish: how much jaw-line weight to paint for a heavy or older build. */
  jowlStrength: number
  /** 0..1: cheek/socket hollowing — a gaunt Reverend Mother, not a girl. */
  ageHollow: number
}

/**
 * Feature positions for one PortraitDef. `age` droops and hollows the lower
 * face, `jaw` widens brow/nose/mouth/chin together (not just the silhouette),
 * and `build` (already baked into headR) also fills out the cheeks and adds
 * jowl weight — the three axes the brief called out as needing to visibly
 * change the face, not just nudge a number.
 */
export function computeFaceLayout(def: PortraitDef, headR: number): FaceLayout {
  const jaw = def.jaw
  const ageDroop = def.age === 'old' ? 0.05 : def.age === 'young' ? -0.03 : 0
  const ageHollow = def.age === 'old' ? 1 : def.age === 'young' ? 0 : 0.4
  const fullness = 0.6 + 0.4 * def.build

  const jawHalfW = jawWidth(headR, jaw)

  return {
    jawHalfW,
    browY: headR * (-0.32 + ageDroop),
    browHalfW: headR * 0.62 * (0.85 + 0.15 * jaw),
    browTilt: def.eyeTilt * 0.6,
    noseTopY: headR * (-0.12 + ageDroop * 0.5),
    noseTipY: headR * (0.24 + ageDroop),
    noseHalfW: headR * 0.09 * (0.9 + 0.2 * jaw),
    cheekY: headR * (0.02 + ageDroop * 0.6),
    cheekHalfW: jawHalfW * (0.7 + 0.12 * (fullness - 1)) * (1 - ageHollow * 0.12),
    mouthY: headR * (0.48 + ageDroop * 1.2),
    mouthHalfW: headR * 0.24 * (0.82 + 0.18 * jaw),
    chinY: headR * (0.76 + ageDroop * 1.4),
    chinHalfW: headR * 0.2 * (0.8 + 0.2 * jaw),
    jowlStrength: Math.max(0, (def.build - 1) * 0.8 + (def.age === 'old' ? 0.35 : 0)),
    ageHollow,
  }
}
