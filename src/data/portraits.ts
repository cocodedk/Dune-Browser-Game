// src/data/portraits.ts
// Per-character portrait direction.
//
// Style follows docs/PRD/dune92/02-architecture-3d.md: apricot and amber,
// deep blue-violet shadows, spice-blue as the single accent. Portraits are
// composed procedurally rather than generated, so the whole cast is guaranteed
// to look like one hand — the failure mode with twenty separately generated
// images is that they do not.
//
// Colour alone was not enough: every character wore the same hood, so the
// cast read as one silhouette in fourteen tints. `headgear` fixes that — a
// Duke in his own hall is not hooded, a Fremen in the deep desert is — and
// `beard`/`hair`/`age`/`jaw`/`eyeTilt`/`mark` layer identity onto the face
// itself. Entries live in portraits.cast.ts (nobles, Imperials, antagonists,
// outsiders) and portraits.fremen.ts (the sietch cast) so this file stays a
// contract, not a 500-line table.

import { CAST_PORTRAITS } from './portraits.cast'
import { FREMEN_PORTRAITS } from './portraits.fremen'

/** What covers the head — the single biggest silhouette differentiator. */
export type Headgear = 'hood' | 'scarf' | 'bare' | 'cap' | 'helm'
export type BeardStyle = 'none' | 'stubble' | 'full'
/** Only rendered when headgear leaves the scalp visible. */
export type HairStyle = 'none' | 'short' | 'long' | 'bald'
/** Drives brow, jaw and cheek line weight. */
export type AgeBand = 'young' | 'middle' | 'old'
/** An optional distinguishing feature. */
export type Mark = 'none' | 'scar' | 'tattoo' | 'insignia'

// Small named palettes so skin and hair stay in the game's colour world
// instead of drifting to an arbitrary hex per character.
export const SKIN_TONES = {
  fair: '#d8b48c',
  olive: '#c99a6a',
  bronzed: '#b0824c',
  weathered: '#9a6f42',
  deepBronze: '#8a5c34',
  ashen: '#b8ab98',
} as const
export type SkinTone = keyof typeof SKIN_TONES

export const HAIR_TONES = {
  black: '#1a1109',
  darkBrown: '#3a2313',
  brown: '#5c3d20',
  sandy: '#8a6a42',
  grey: '#8f8a7c',
  white: '#d6d0bf',
} as const
export type HairTone = keyof typeof HAIR_TONES

export interface PortraitDef {
  /** Backdrop gradient, top to bottom. */
  backTop: string
  backBottom: string
  /** Rim light colour — the character's single identifying accent. */
  rim: string
  /** Silhouette fill. */
  figure: string
  /** 0 distant and formal, 1 close and intimate. */
  framing: number
  /** 0 soft and diffuse, 1 hard and directional. */
  keyHardness: number
  /** Head width relative to height; wider reads heavier, narrower ascetic. */
  build: number
  /**
   * What the figure is wearing, which is most of what identifies them at a
   * glance. Fremen get a stillsuit and the blue-in-blue eyes of Ibad; nobles
   * get a high formal collar; the Baron gets neither.
   */
  dress?: 'fremen' | 'noble' | 'plain'
  headgear: Headgear
  beard: BeardStyle
  hairStyle: HairStyle
  skinTone: SkinTone
  hairTone: HairTone
  age: AgeBand
  /** Face width multiplier. Cheap to vary, effective at breaking sameness. */
  jaw: number
  /** Outer-corner slant, radians. Negative droops, positive lifts. */
  eyeTilt: number
  mark: Mark
}

export const DEFAULT: PortraitDef = {
  backTop: '#a8763f', backBottom: '#3d2a15',
  rim: '#d4a017', figure: '#2a180b',
  framing: 0.5, keyHardness: 0.5, build: 1, dress: 'plain',
  headgear: 'hood', beard: 'none', hairStyle: 'none',
  skinTone: 'olive', hairTone: 'black', age: 'middle',
  jaw: 1, eyeTilt: 0, mark: 'none',
}

const PORTRAITS: Record<string, PortraitDef> = {
  ...CAST_PORTRAITS,
  ...FREMEN_PORTRAITS,
}

export function portraitFor(characterId: string): PortraitDef {
  return PORTRAITS[characterId] ?? DEFAULT
}

export function portraitCount(): number {
  return Object.keys(PORTRAITS).length
}
