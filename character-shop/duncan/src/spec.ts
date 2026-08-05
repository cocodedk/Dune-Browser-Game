// character-shop/duncan/src/spec.ts
// The single source of truth for Duncan Idaho's proportions. Every builder
// reads this; nobody edits it without a measured or authored reason — see
// provenance.ts for where each number comes from. PROPORTIONS is the shape
// authority character-shop/docs/gauntlet-loop.md requires; seam.test.ts
// guards the figure against it on every run.

export { PROVENANCE } from './provenance'

export const PROPORTIONS = {
  // True meters, one meter per three.js unit, standing height.
  heightM: 1.93,
  headHeightFraction: { min: 0.125, max: 0.135 },
  eyeLineFraction: 0.937,
  // The biggest frame in wave 1 — a swordmaster built like a wall.
  shoulderHalfWidth: 0.26,
  hipHalfWidth: 0.19,
} as const

// Ibad — no. Duncan never lives with the Fremen long enough; natural eyes.
export const IBAD = false

export const PALETTE = {
  // Warm tan skin.
  skin: 0x9a7457,
  // Atreides duty fatigues: near-black with a green-grey cast.
  fabric: 0x2e332e,
  // Leather chest rig, straps and boots: dark oiled brown.
  accent: 0x3a2f26,
  // Long dark hair and full beard.
  hair: 0x201812,
} as const

// Costume destination — Atreides duty fatigues with a leather chest rig
// (NOT a stillsuit): wave 1's costume-range coverage. Long hair, topknot
// half-tie, full beard — the silhouette is unmistakably Momoa's Duncan.
export const COSTUME = {
  base: 'atreides duty fatigues, near-black, fitted military cut',
  head: 'long dark hair with a half-tie topknot, full beard',
  extras: 'leather chest rig with straps; heavy boots',
} as const
