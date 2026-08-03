// vehicle-shop/ornihopter/src/model/geometry/wing/section.ts
// One cross-section of a wing, at one span station: eight points in a fixed
// cycle, morphing from a round ROD near the ball into the blade's aerofoil.
//
// Two shapes, one topology. The same eight cycle positions describe both a
// circle (the rod and its ridged sleeve) and the blade section, so the loft
// between them needs no special case and no transition fan — the flare is a
// straight interpolation between two eight-point rings in the same order.
//
// The blade section is measured off docs/dune_ornihopter_kit-2.png, which
// shows what the flat plate cannot: the blade is not a slab. It carries a
// raised rail along its leading edge, a long RECESSED centre channel behind
// that rail, and a knife trailing edge. Under one sun that gives three
// distinct tones across the chord — which is the answer to "the blades are
// flat black slabs with zero internal shading". A single flat top face has
// exactly one normal and therefore exactly one tone, however it is coloured.
//
// CYCLE_TO_SLOT is load-bearing and is explained where it is defined.

import { WING } from '../../../spec'

/** Points per station. Eight is the fewest that carries a bevel AND a channel. */
export const SECTION_POINTS = 8

/** Chordwise position of each cycle point, 0 at the leading edge, 1 trailing. */
const BLADE_U = [0, 0.09, 0.18, 0.8, 1, 0.8, 0.18, 0.09] as const

/** Rod angle of each cycle point, radians, measured from +Z (trailing) toward
 *  +Y. Cycle 1/3/5/7 sit at 135/45/-45/-135 exactly, which makes them the
 *  corners of a rectangle centred on the section — see CYCLE_TO_SLOT. */
const ROD_ANGLE = [180, 135, 113.6, 45, 0, -45, -113.6, -135].map((d) => (d * Math.PI) / 180)

/**
 * Which vertex slot each cycle point is written to.
 *
 * wingRootAttachment.test.ts pins the LOCAL centroid of the blade's first four
 * vertices to (0,0,0) — the mechanical hinge point — to 1e-6 across every beat
 * phase. Four consecutive points of a closed section are always a contiguous
 * arc and can never average to its centre, so the emission order is permuted:
 * slots 0..3 take cycle points 1, 3, 5, and 7, which at the root (a pure rod)
 * sit at 135/45/-45/-135 degrees on a circle — a rectangle, whose four corners
 * sum to its centre exactly. The index list walks CYCLE_TO_SLOT rather than
 * raw slot order, so the surface is unaffected.
 */
export const CYCLE_TO_SLOT = [4, 0, 5, 1, 6, 2, 7, 3] as const

const HALF_THICKNESS = WING.thickness / 2
/** Spar half-thickness at the leading rail — the blade's structural depth. */
const RAIL_RISE = 1.75 * HALF_THICKNESS
/** Half-thickness at the trailing knife. */
const KNIFE = 0.15 * HALF_THICKNESS
/** How far the centre channel is sunk below the rail-to-knife surface line. */
const CHANNEL_DEPTH = 0.45 * HALF_THICKNESS
/** Leading-edge lift, blended in from the hinge — the blade's camber. */
const CAMBER_LIFT = 0.28

/** Span over which the section morphs from rod to blade. The dossier's flare
 *  runs x = 28-41mm of 197.62mm; spec.ts's WING.rootArmFraction (0.17) is the
 *  midpoint of exactly that run, which is where the arm stops being an arm. */
const FLARE_START = 0.1357
const FLARE_END = 0.2059

export interface SectionPoint {
  y: number
  z: number
}

function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/** 0 = pure rod, 1 = pure blade. */
export function bladeEaseAt(spanFraction: number): number {
  return smoothstep((spanFraction - FLARE_START) / (FLARE_END - FLARE_START))
}

/** Straight line between two chordwise points, evaluated at u. */
function lineAt(u: number, u0: number, y0: number, u1: number, y1: number): number {
  return y0 + ((y1 - y0) * (u - u0)) / (u1 - u0)
}

/**
 * The blade's eight points, in cycle order, for a section of this chord.
 *
 * z follows BLADE_U's own labelling directly — 0 (leading) at -z (toward
 * the nose), 1 (trailing) at +z (aft) — so the rail sits forward and the
 * knife sits aft, matching ROD_ANGLE's own "+Z (trailing)" convention and
 * rodPoints' identical, un-negated mapping below.
 *
 * Round 6e (commit ea4d2b5) negated this z chasing the user's dogleg
 * finding and fixed the wrong feature: it put the rail aft and the knife
 * forward — backwards per the user's own knife rule (dull spine forward,
 * sharp curved edge aft). The finding actually lives in the PLANFORM bow,
 * not this per-station cross-section: wing/sweepProfile.ts's sweepOffsetAt
 * was applying the measured centreline offset with the sign that put the
 * plate's straight (spine) edge aft and its curved (knife) edge toward the
 * nose. That single sign lives in sweepOffsetAt now (negated once); this
 * section's original mapping was correct all along and is reverted here.
 * See wingChordHandedness.test.ts for the proof both halves now carry.
 */
function bladePoints(chord: number, camber: number): SectionPoint[] {
  const crest = camber + RAIL_RISE
  const keel = camber - RAIL_RISE
  const railU = BLADE_U[1]
  const topAt = (u: number) => lineAt(u, railU, crest, 1, KNIFE)
  const bottomAt = (u: number) => lineAt(u, railU, keel, 1, KNIFE)
  const ys = [
    camber, // leading knife, on the camber line: a bevel, not a blunt face
    crest, // rail crest
    topAt(BLADE_U[2]) - CHANNEL_DEPTH, // channel, fore lip
    topAt(BLADE_U[3]) - CHANNEL_DEPTH, // channel, aft lip
    KNIFE, // trailing knife
    bottomAt(BLADE_U[5]),
    bottomAt(BLADE_U[6]),
    keel,
  ]
  return ys.map((y, i) => ({ y, z: (BLADE_U[i] - 0.5) * chord }))
}

/** The rod's eight points, in cycle order, for a section of this diameter.
 *  z un-negated, matching ROD_ANGLE's own "+Z (trailing)" convention and
 *  bladePoints' mapping above — same master, same handedness, so the flare
 *  from rod to blade stays one continuous surface. */
function rodPoints(width: number): SectionPoint[] {
  const r = width / 2
  return ROD_ANGLE.map((angle) => ({ y: r * Math.sin(angle), z: r * Math.cos(angle) }))
}

/**
 * The section at one station: `width` is the measured planform width there
 * (rootArm.ts), `centreline` the measured chordwise bow (sweepProfile.ts), and
 * `camberBlend` the same root blend sweepProfile.ts uses, so camber and bow
 * both vanish at the hinge ring together.
 */
export function sectionAt(
  spanFraction: number,
  width: number,
  centreline: number,
  camberBlend: number,
): SectionPoint[] {
  const ease = bladeEaseAt(spanFraction)
  const rod = rodPoints(width)
  if (ease <= 0) return rod.map((p) => ({ y: p.y, z: p.z + centreline }))
  const blade = bladePoints(width, camberBlend * CAMBER_LIFT * HALF_THICKNESS)
  return rod.map((p, i) => ({
    y: p.y + (blade[i].y - p.y) * ease,
    z: p.z + (blade[i].z - p.z) * ease + centreline,
  }))
}
