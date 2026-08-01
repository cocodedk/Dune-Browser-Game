// src/game-render/modes/flight/wingConfig.ts
// Per-wing constants: beat frequency, geometry envelopes, and the cycle
// options for each of the four wings. Values from
// docs/PRD/dune92/stages/22-ornithopter.md section 2.3's validated model.
// Kept separate from wingCycle.ts (the generic maths) and Ornithopter.ts
// (the three.js assembly) so both stay focused and this stays data-only.

import type { WingCycleOptions } from './wingCycle'
import { hullRadiusAt, FUSELAGE_LENGTH_SCALE } from './geometry/fuselageGeometry'

export type WingSide = 'left' | 'right'

export interface WingGeometrySpec {
  span: number
  rootRadius: number
  tipRadius: number
  thinness: number
  /** Leading-edge spar radius at the root — see geometry/wingGeometry.ts. */
  sparRootRadius: number
  /** Leading-edge spar radius at the tip. */
  sparTipRadius: number
}

export interface WingAttachment {
  x: number
  y: number
  z: number
}

function deg(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Beat frequency in Hz. Spec range is 1-3 (Greenewalt scaling for a 4-8m
 * craft), trending 1-2 — but that is a scaling argument, not a rule, and
 * this is a game: at 1.5Hz (this constant's previous value) the beat read
 * as sluggish in motion. Raised toward the top of the researched band,
 * where it reads as a deliberate, brisk wingbeat rather than a slow drift.
 */
export const BEAT_HZ = 2.8

export function phaseAtElapsedMs(elapsedMs: number): number {
  return (elapsedMs * (BEAT_HZ * 2 * Math.PI)) / 1000
}

// PAIR span — wingtip to wingtip, aircraft-style. Each wing's own geometry
// runs from the fuselage centreline to ONE tip (wingGeometry.ts builds
// root-to-tip per side; the two sides mount at the same centreline
// attachment), so a per-wing field is always HALF the pair figure below.
//
// Round 4 restored span "by eye... not derived from a formula" (see git
// history), landing at a measured span:length of 1.57.
//
// Round 5 correction: the manufacturer's own spec for the screen-accurate
// replica this project measures against (.shots/reference/thopter-mr.jpg)
// gives wingspan just under 24in, length 10.5in nose-to-stern —
// span:length ~2.19, treated as authority over either round's eyeballed
// figure. Fuselage length (FUSELAGE_LENGTH_SCALE, in fuselageGeometry.ts) is
// untouched: round 4's "reads stubby" finding was about a SHORTER hull and
// does not apply here, so closing the gap means growing span alone. Chord
// (rootRadius/tipRadius below) is also untouched — a longer wing at the same
// chord is a HIGHER aspect ratio, exactly section 2.2's "very high aspect
// ratio... narrow chord, extending far past the body". Triangle-neutral:
// wingGeometry.ts's membrane grid resolution depends on which size TIER the
// span falls into, not the span value itself, and both wings stay well
// above that tier's threshold before and after.
const FOREWING_PAIR_SPAN = 89 // 89 / 40.65-unit fuselage length = 2.19, matching the measured reference
const HINDWING_PAIR_SPAN = 68 // same ~0.76 ratio to the forewing as before (was 49/64)
// Uniform scale, applied to span AND chord alike, so the hindwing is a
// smaller copy of the forewing's shape (same aspect ratio) rather than a
// differently-proportioned wing — "subordinate" by size, not by silhouette.
const HINDWING_SCALE = HINDWING_PAIR_SPAN / FOREWING_PAIR_SPAN

// thinness 0.17 (was 0.12): a blind critic pass on the first cut of the
// pleated membrane could see the leading-edge spar but not the corrugation
// itself — the facets were too shallow to catch a distinct highlight/shadow
// per facet against near-backlit lighting. Deeper pleats, not more of them.
export const FOREWING_SPEC: WingGeometrySpec = {
  span: FOREWING_PAIR_SPAN / 2, rootRadius: 5.5, tipRadius: 0.6, thinness: 0.17,
  sparRootRadius: 0.42, sparTipRadius: 0.09,
}
export const HINDWING_SPEC: WingGeometrySpec = {
  span: FOREWING_SPEC.span * HINDWING_SCALE,
  rootRadius: FOREWING_SPEC.rootRadius * HINDWING_SCALE,
  tipRadius: FOREWING_SPEC.tipRadius * HINDWING_SCALE,
  thinness: 0.17,
  sparRootRadius: FOREWING_SPEC.sparRootRadius * HINDWING_SCALE,
  sparTipRadius: FOREWING_SPEC.sparTipRadius * HINDWING_SCALE,
}

// Mounted just inside the hull's own local radius at that station (not a
// fixed constant) so the shoulder fairing in geometry/wingRootFairing.ts sits
// flush with the actual skin instead of floating above or sinking into it —
// see stage 22 section 1.3's nose-flare lesson about two parts disagreeing
// on radius at the plane where they meet. The z anchors themselves (-3, 5)
// are pre-stretch hull coordinates, scaled by FUSELAGE_LENGTH_SCALE like
// every other part that mounts to the hull, so the wings stay at the same
// relative station (just ahead of / behind the widest point) on the longer
// hull rather than drifting toward the nose or tail.
export const FOREWING_ATTACHMENT: WingAttachment = {
  x: 0, y: hullRadiusAt(-3 * FUSELAGE_LENGTH_SCALE) * 0.93, z: -3 * FUSELAGE_LENGTH_SCALE,
}
export const HINDWING_ATTACHMENT: WingAttachment = {
  x: 0, y: hullRadiusAt(5 * FUSELAGE_LENGTH_SCALE) * 0.88, z: 5 * FUSELAGE_LENGTH_SCALE,
}

const FOREWING_BASE: WingCycleOptions = {
  flapAmplitude: deg(32), // +-32deg = 64deg peak-to-peak (spec: 60-70)
  aoaDownstroke: deg(50),
  aoaUpstroke: deg(20),
  flipWindow: 0.66, // ~79% of the cycle held flat, see wingCycle.test.ts
  flipAdvance: deg(15), // positive: the flip completes BEFORE reversal
  deviationAmplitude: deg(15),
  pairPhase: 0,
}

const HINDWING_BASE: WingCycleOptions = {
  ...FOREWING_BASE,
  flapAmplitude: deg(25), // spec: hindwing +-18 to 33, modulated
  pairPhase: deg(90), // spec: fore/hind phase, ~90deg at cruise
}

// Small, deterministic, distinct per wing — stage 22 section 2.3, "break
// the symmetry": `rightWing.rotation.z = -beat * 0.34` was an exact mirror
// of the left. None of these four is an exact negation of another.
export const FORE_LEFT_OPTIONS: WingCycleOptions = {
  ...FOREWING_BASE,
  asymmetry: { phase: deg(3), amplitudeScale: 1.04 },
}
export const FORE_RIGHT_OPTIONS: WingCycleOptions = {
  ...FOREWING_BASE,
  asymmetry: { phase: deg(-5.5), amplitudeScale: 0.95 },
}
export const REAR_LEFT_OPTIONS: WingCycleOptions = {
  ...HINDWING_BASE,
  asymmetry: { phase: deg(-4), amplitudeScale: 1.06 },
}
export const REAR_RIGHT_OPTIONS: WingCycleOptions = {
  ...HINDWING_BASE,
  asymmetry: { phase: deg(6.5), amplitudeScale: 0.93 },
}
