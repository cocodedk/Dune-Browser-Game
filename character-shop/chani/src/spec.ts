// character-shop/chani/src/spec.ts
// The single source of truth for Chani's proportions. Every builder reads
// this; nobody edits it without a measured or authored reason — see
// provenance.ts for where each number comes from. PROPORTIONS is the shape
// authority character-shop/docs/gauntlet-loop.md requires; seam.test.ts
// guards the figure against it on every run.

export { PROVENANCE } from './provenance'

export const PROPORTIONS = {
  // True meters, one meter per three.js unit, standing height.
  heightM: 1.78,
  // Slender young face; band kept tight so the head never balloons.
  headHeightFraction: { min: 0.125, max: 0.135 },
  // Eye line from the ground: (heightM - ~0.115m crown-to-eyes) / heightM.
  eyeLineFraction: 0.935,
  // Slight, wiry build — a desert runner, not a soldier.
  shoulderHalfWidth: 0.195,
  hipHalfWidth: 0.165,
} as const

// Ibad — blue-within-blue Fremen eyes. Chani: full ibad, no visible white.
export const IBAD = true

export const PALETTE = {
  skin: 0x8a6248,
  // Stillsuit body: desaturated grey-taupe rubberized ribbing, sand-dusted.
  fabric: 0x4a453d,
  // Cowl/wrap accents and dust: pale desert sand.
  accent: 0x9b8a70,
  // Dark curly hair, worn loose past the shoulders.
  hair: 0x1d1712,
  // R2 delta — full-ibad eye: one flat spice-blue for the whole visible
  // eye, no white. Material nuance and glow are R3 scope.
  eyes: 0x33689e,
} as const

// Costume destination for builders and critics — P1/P2 Fremen stillsuit,
// hood DOWN so the hair and face read; face cowl unclipped, hanging.
export const COSTUME = {
  base: 'fremen stillsuit, ribbed segmented panels, form-following',
  head: 'hood down, dark curly hair loose, cowl hanging at the neck',
  extras: 'chest tube routing to a catchpocket at the collarbone',
} as const
