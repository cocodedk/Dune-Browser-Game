// character-shop/stilgar/src/spec.ts
// The single source of truth for Stilgar's proportions. Every builder reads
// this; nobody edits it without a measured or authored reason — see
// provenance.ts for where each number comes from. PROPORTIONS is the shape
// authority character-shop/docs/gauntlet-loop.md requires; seam.test.ts
// guards the figure against it on every run.

export { PROVENANCE } from './provenance'

export const PROPORTIONS = {
  // True meters, one meter per three.js unit, standing height.
  heightM: 1.81,
  // Broad, heavy-boned head with a full beard — band sits high.
  headHeightFraction: { min: 0.13, max: 0.14 },
  eyeLineFraction: 0.936,
  // Solid, weathered sietch leader — heavier than Chani, not a giant.
  shoulderHalfWidth: 0.225,
  hipHalfWidth: 0.175,
} as const

// Ibad — full blue-within-blue; Stilgar has lived on spice his whole life.
export const IBAD = true

export const PALETTE = {
  // Olive-tan skin, sun-weathered and lined.
  skin: 0x8f6e50,
  // Stillsuit: darker charcoal-brown than Chani's, heavily worn.
  fabric: 0x3c3833,
  // Hood and shoulder wrap: drab desert cloth.
  accent: 0x5a5044,
  // Dark beard and brows, flecked grey at the jaw.
  hair: 0x241c14,
} as const

// Costume destination — P1/P2 Fremen stillsuit under a shoulder wrap,
// hood UP framing the face; the beard is a primary recognition feature.
export const COSTUME = {
  base: 'fremen stillsuit, ribbed panels, heavier wear than a young fighter',
  head: 'hood up, framing a full dark beard and strong brow',
  extras: 'shoulder wrap over the suit; tube to catchpocket at the chest',
} as const
